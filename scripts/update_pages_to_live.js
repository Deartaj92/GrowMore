const fs = require("fs");
const path = require("path");

const basePath = "d:/newGrowMore/src";

// 1. Rewrite src/app/page.tsx
const pageContent = `"use client";

import React, { useState, useEffect } from "react";
import { 
  fetchSchoolsFromSupabase, 
  fetchCampusesFromSupabase, 
  fetchSessionsFromSupabase, 
  fetchClassesFromSupabase,
  fetchStudentsFromSupabase,
  fetchTransactionsFromSupabase,
  createSchoolInSupabase,
  createCampusInSupabase,
  createStudentInSupabase,
  recordFeePaymentInSupabase,
  promoteStudentInSupabase
} from "@/services/schoolService";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar, NavTab } from "@/components/layout/Sidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { CampusMetrics } from "@/components/dashboard/CampusMetrics";
import { StudentQuickDirectory } from "@/components/dashboard/StudentQuickDirectory";
import { FeeCollectionWidget } from "@/components/dashboard/FeeCollectionWidget";
import { CommandPalette } from "@/components/common/CommandPalette";
import { FeePaymentModal } from "@/components/modals/FeePaymentModal";
import { ReportCardModal } from "@/components/modals/ReportCardModal";
import { StudentAdmissionModal } from "@/components/modals/StudentAdmissionModal";
import { StudentHistoryModal } from "@/components/modals/StudentHistoryModal";
import { SessionPromotionModal } from "@/components/modals/SessionPromotionModal";
import { CreateSchoolModal } from "@/components/modals/CreateSchoolModal";
import { CreateCampusModal } from "@/components/modals/CreateCampusModal";
import { AcademicsModule } from "@/components/modules/AcademicsModule";
import { AcademicSetupModule } from "@/components/modules/AcademicSetupModule";
import { SuperAdminSchoolsModule } from "@/components/modules/SuperAdminSchoolsModule";
import { FeesModule } from "@/components/modules/FeesModule";
import { ExamsModule } from "@/components/modules/ExamsModule";
import { PayrollModule } from "@/components/modules/PayrollModule";
import { TenancySettingsModule } from "@/components/modules/TenancySettingsModule";
import { Student, Campus, FeeTransaction, School, AcademicSession, AcademicClass } from "@/types";
import { Sparkles, Database } from "lucide-react";

export default function Home() {
  // Live Multi-School & Multi-Campus State
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selectedCampus, setSelectedCampus] = useState<Campus | null>(null);

  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);

  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isCreateSchoolOpen, setIsCreateSchoolOpen] = useState(false);
  const [isCreateCampusOpen, setIsCreateCampusOpen] = useState(false);
  const [feeModalStudent, setFeeModalStudent] = useState<Student | null>(null);
  const [reportCardStudent, setReportCardStudent] = useState<Student | null>(null);
  const [isAdmissionModalOpen, setIsAdmissionModalOpen] = useState(false);
  const [historyModalStudent, setHistoryModalStudent] = useState<Student | null>(null);
  const [promotionModalStudent, setPromotionModalStudent] = useState<Student | null>(null);

  // Load 100% live data from Supabase
  const loadLiveData = async () => {
    try {
      const [
        realSchools, 
        realCampuses, 
        realSessions, 
        realClasses, 
        realStudents, 
        realTransactions
      ] = await Promise.all([
        fetchSchoolsFromSupabase(),
        fetchCampusesFromSupabase(),
        fetchSessionsFromSupabase(),
        fetchClassesFromSupabase(),
        fetchStudentsFromSupabase(),
        fetchTransactionsFromSupabase(),
      ]);

      if (realSchools && realSchools.length > 0) {
        setSchools(realSchools);
        setSelectedSchool((prev) => prev ? (realSchools.find(s => s.id === prev.id) || realSchools[0]) : realSchools[0]);
      }
      if (realCampuses && realCampuses.length > 0) {
        setCampuses(realCampuses);
        const schoolId = selectedSchool?.id || realSchools[0]?.id;
        const matchingCampuses = realCampuses.filter((c) => c.schoolId === schoolId);
        setSelectedCampus((prev) => prev ? (realCampuses.find(c => c.id === prev.id) || matchingCampuses[0] || realCampuses[0]) : (matchingCampuses[0] || realCampuses[0]));
      }
      if (realSessions && realSessions.length > 0) {
        setSessions(realSessions);
      }
      if (realClasses && realClasses.length > 0) {
        setClasses(realClasses);
      }
      if (realStudents) {
        setStudents(realStudents);
      }
      if (realTransactions) {
        setTransactions(realTransactions);
      }
    } catch (err) {
      console.error("Failed to load live Supabase data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLiveData();
  }, []);

  // Switch active School organization
  const handleSelectSchool = (school: School) => {
    setSelectedSchool(school);
    const schoolCampuses = campuses.filter((c) => c.schoolId === school.id);
    if (schoolCampuses.length > 0) {
      const consolidated = schoolCampuses.find((c) => c.id.endsWith("-all") || c.id === "campus-all");
      setSelectedCampus(consolidated || schoolCampuses[0]);
    }
  };

  // Register new School organization into GrowMore
  const handleCreateSchool = async (
    newSchool: School, 
    initialCampuses: Campus[], 
    initialSession: AcademicSession
  ) => {
    setSchools((prev) => [...prev, newSchool]);
    setCampuses((prev) => [...prev, ...initialCampuses]);
    setSessions((prev) => [...prev, initialSession]);

    setSelectedSchool(newSchool);
    setSelectedCampus(initialCampuses[1] || initialCampuses[0]);

    // Persist to Supabase
    await createSchoolInSupabase(newSchool, initialCampuses, initialSession);
    await loadLiveData();
  };

  // Add new Campus branch to a School
  const handleCreateCampus = async (newCampus: Campus) => {
    setCampuses((prev) => [...prev, newCampus]);
    setSelectedCampus(newCampus);
    await createCampusInSupabase(newCampus);
    await loadLiveData();
  };

  // Filter campuses to currently active school
  const currentSchoolCampuses = selectedSchool ? campuses.filter((c) => c.schoolId === selectedSchool.id) : campuses;

  // Handle successful fee payment from POS
  const handleFeePaymentSuccess = async (receipt: any) => {
    const newTx: FeeTransaction = {
      id: \`tx-\${Date.now()}\`,
      receiptNo: receipt.receiptNo,
      studentName: receipt.studentName,
      enrollmentNo: receipt.enrollmentNo,
      campusName: selectedCampus?.name || "Main Campus",
      amount: receipt.amount,
      paymentMethod: receipt.paymentMethod,
      timestamp: "Just now",
      status: "SUCCESS",
      feeHead: "Tuition & Lab Dues",
    };
    setTransactions([newTx, ...transactions]);

    setStudents((prev) =>
      prev.map((s) =>
        s.enrollmentNo === receipt.enrollmentNo
          ? { ...s, feeStatus: "PAID", dueAmount: 0 }
          : s
      )
    );

    // Persist payment to Supabase
    await recordFeePaymentInSupabase({
      ...receipt,
      schoolId: selectedSchool?.id,
      campusId: selectedCampus?.id,
    });
  };

  // Handle new student admission
  const handleStudentAdmitted = async (newStudent: Student) => {
    setStudents((prev) => [newStudent, ...prev]);
    // Persist to Supabase
    await createStudentInSupabase(newStudent);
    await loadLiveData();
  };

  // Handle student annual session promotion
  const handleStudentPromoted = async (updatedStudent: Student) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
    );
    // Persist promotion to Supabase
    await promoteStudentInSupabase(updatedStudent);
    await loadLiveData();
  };

  // Academic Setup handlers
  const handleAddSession = (newSession: AcademicSession) => {
    setSessions((prev) => [newSession, ...prev]);
  };

  const handleUpdateSession = (updatedSession: AcademicSession) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
    );
  };

  const handleAddClass = (newClass: AcademicClass) => {
    setClasses((prev) => [newClass, ...prev]);
  };

  const handleUpdateClass = (updatedClass: AcademicClass) => {
    setClasses((prev) =>
      prev.map((c) => (c.id === updatedClass.id ? updatedClass : c))
    );
  };

  const handleDeleteClass = (classId: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== classId));
  };

  if (isLoading || !selectedSchool || !selectedCampus) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-3xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 animate-pulse mb-4 shadow-xl shadow-brand-500/10">
          <Database className="w-7 h-7 text-brand-400" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Connecting to Live Supabase Database</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Loading actual tenant partitions, campus nodes, academic allocations, and student ledgers...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500/30 selection:text-brand-200">
      {/* Top Universal Navbar with Multi-School & Campus Switchers */}
      <Navbar
        schools={schools}
        selectedSchool={selectedSchool}
        onSelectSchool={handleSelectSchool}
        campuses={currentSchoolCampuses}
        selectedCampus={selectedCampus}
        onSelectCampus={setSelectedCampus}
        onOpenSearch={() => setIsSearchOpen(true)}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onOpenCreateSchool={() => setIsCreateSchoolOpen(true)}
        onOpenCreateCampus={() => setIsCreateCampusOpen(true)}
      />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8 gap-6">
        {/* Desktop Sidebar Navigation */}
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          currentSchoolCode={selectedSchool.code}
          onOpenAdmissionModal={() => setIsAdmissionModalOpen(true)}
        />

        {/* Main Operational View */}
        <main className="flex-1 min-w-0 space-y-6 pb-20 sm:pb-6">
          {activeTab === "dashboard" && (
            <>
              {/* Primary KPIs & Real-time Branch Metrics */}
              <CampusMetrics campus={selectedCampus} />

              {/* Responsive 2-Column Split: Student Roster vs Fiscal Collection POS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8">
                  <StudentQuickDirectory
                    students={students}
                    currentCampusId={selectedCampus.id}
                    currentSchoolId={selectedSchool.id}
                    onOpenFeePayment={(student) => setFeeModalStudent(student)}
                    onOpenReportCard={(student) => setReportCardStudent(student)}
                    onOpenAdmissionModal={() => setIsAdmissionModalOpen(true)}
                    onOpenHistoryModal={(student) => setHistoryModalStudent(student)}
                    onOpenPromotionModal={(student) => setPromotionModalStudent(student)}
                  />
                </div>

                <div className="lg:col-span-4">
                  <FeeCollectionWidget
                    transactions={transactions}
                    onOpenCashierPOS={() => {
                      if (students.length > 0) {
                        setFeeModalStudent(students[0]);
                      }
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === "super-admin" && (
            <SuperAdminSchoolsModule
              schools={schools}
              campuses={campuses}
              sessions={sessions}
              students={students}
              onSelectSchool={handleSelectSchool}
              onOpenCreateSchool={() => setIsCreateSchoolOpen(true)}
              onOpenCreateCampus={() => setIsCreateCampusOpen(true)}
            />
          )}

          {activeTab === "academics" && (
            <AcademicsModule 
              selectedCampus={selectedCampus} 
              sessions={sessions}
              classes={classes}
              students={students}
              onOpenReportCard={(st) => setReportCardStudent(st)}
              onOpenPromotionModal={(st) => setPromotionModalStudent(st)}
            />
          )}

          {activeTab === "academic-setup" && (
            <AcademicSetupModule
              selectedSchool={selectedSchool}
              selectedCampus={selectedCampus}
              campuses={campuses}
              sessions={sessions}
              classes={classes}
              onAddSession={handleAddSession}
              onUpdateSession={handleUpdateSession}
              onAddClass={handleAddClass}
              onUpdateClass={handleUpdateClass}
              onDeleteClass={handleDeleteClass}
            />
          )}

          {activeTab === "fees" && (
            <FeesModule
              students={students}
              transactions={transactions}
              selectedCampus={selectedCampus}
              onOpenFeePayment={(student) => setFeeModalStudent(student)}
            />
          )}

          {activeTab === "exams" && (
            <ExamsModule
              students={students}
              classes={classes}
              selectedCampus={selectedCampus}
              onOpenReportCard={(student) => setReportCardStudent(student)}
            />
          )}

          {activeTab === "payroll" && (
            <PayrollModule selectedCampus={selectedCampus} />
          )}

          {activeTab === "tenancy" && (
            <TenancySettingsModule selectedCampus={selectedCampus} />
          )}
        </main>
      </div>

      {/* Global Interactive Modals */}
      <CreateSchoolModal
        isOpen={isCreateSchoolOpen}
        onClose={() => setIsCreateSchoolOpen(false)}
        onCreateSchool={handleCreateSchool}
      />

      <CreateCampusModal
        isOpen={isCreateCampusOpen}
        onClose={() => setIsCreateCampusOpen(false)}
        schools={schools}
        selectedSchool={selectedSchool}
        onCreateCampus={handleCreateCampus}
      />

      <FeePaymentModal
        student={feeModalStudent}
        onClose={() => setFeeModalStudent(null)}
        onSuccess={handleFeePaymentSuccess}
      />

      <ReportCardModal
        student={reportCardStudent}
        onClose={() => setReportCardStudent(null)}
      />

      <StudentAdmissionModal
        isOpen={isAdmissionModalOpen}
        onClose={() => setIsAdmissionModalOpen(false)}
        schools={schools}
        campuses={campuses}
        sessions={sessions}
        classes={classes}
        selectedCampusId={selectedCampus.id}
        onStudentAdmitted={handleStudentAdmitted}
      />

      <StudentHistoryModal
        student={historyModalStudent}
        onClose={() => setHistoryModalStudent(null)}
        onOpenPromotionModal={(student) => {
          setHistoryModalStudent(null);
          setPromotionModalStudent(student);
        }}
      />

      <SessionPromotionModal
        student={promotionModalStudent}
        sessions={sessions}
        classes={classes}
        onClose={() => setPromotionModalStudent(null)}
        onPromoteSuccess={handleStudentPromoted}
      />

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        students={students}
        onSelectStudent={(student) => setHistoryModalStudent(student)}
      />

      {/* Mobile Bottom Bar Navigation */}
      <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
`;

fs.writeFileSync(path.join(basePath, "app/page.tsx"), pageContent, "utf8");
console.log("Updated src/app/page.tsx to use 100% live Supabase data!");

// 2. Rewrite src/app/super-admin/page.tsx
const superAdminContent = \`"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SuperAdminSchoolsModule } from "@/components/modules/SuperAdminSchoolsModule";
import { CreateCampusModal } from "@/components/modals/CreateCampusModal";
import { CreateSchoolModal } from "@/components/modals/CreateSchoolModal";
import { School, Campus, AcademicSession, Student } from "@/types";
import { ArrowLeft, Sparkles, Building, ShieldCheck, Database } from "lucide-react";
import { 
  fetchSchoolsFromSupabase, 
  fetchCampusesFromSupabase, 
  fetchSessionsFromSupabase, 
  fetchStudentsFromSupabase,
  createSchoolInSupabase,
  createCampusInSupabase 
} from "@/services/schoolService";

export default function SuperAdminPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isCreateCampusOpen, setIsCreateCampusOpen] = useState(false);
  const [isCreateSchoolOpen, setIsCreateSchoolOpen] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadLiveData = async () => {
    try {
      const [realSchools, realCampuses, realSessions, realStudents] = await Promise.all([
        fetchSchoolsFromSupabase(),
        fetchCampusesFromSupabase(),
        fetchSessionsFromSupabase(),
        fetchStudentsFromSupabase(),
      ]);

      if (realSchools && realSchools.length > 0) {
        setSchools(realSchools);
        setSelectedSchool((prev) => prev || realSchools[0]);
        setIsLiveConnected(true);
      }
      if (realCampuses && realCampuses.length > 0) {
        setCampuses(realCampuses);
      }
      if (realSessions && realSessions.length > 0) {
        setSessions(realSessions);
      }
      if (realStudents) {
        setStudents(realStudents);
      }
    } catch (err) {
      console.error("Failed to load SuperAdmin live data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLiveData();
  }, []);

  const handleCreateCampus = async (newCampus: Campus) => {
    setCampuses((prev) => [...prev, newCampus]);
    await createCampusInSupabase(newCampus);
    await loadLiveData();
  };

  const handleCreateSchool = async (newSchool: School, initialCampuses: Campus[], initialSession: AcademicSession) => {
    setSchools((prev) => [...prev, newSchool]);
    setCampuses((prev) => [...prev, ...initialCampuses]);
    setSessions((prev) => [...prev, initialSession]);
    setSelectedSchool(newSchool);
    await createSchoolInSupabase(newSchool, initialCampuses, initialSession);
    await loadLiveData();
  };

  if (isLoading || !selectedSchool) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-3xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 animate-pulse mb-4 shadow-xl shadow-brand-500/10">
          <Database className="w-7 h-7 text-brand-400" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Accessing Super Admin Master Console</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Fetching live tenant organizations and infrastructure nodes from Supabase cluster...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500/30 selection:text-brand-200">
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to School Dashboard</span>
          </Link>

          <div className="h-5 w-[1px] bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Super Admin Organization Manager</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-400 px-2 py-0.5 rounded-full bg-brand-950 border border-brand-800">
                  Global Fleet
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Multi-Tenant Sharding & System-wide Academic Supervision
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 font-medium">Cluster Partitioning:</span>
            <span className="text-emerald-400 font-mono font-bold">
              {isLiveConnected ? "LIVE SUPABASE CONNECTED" : "SYNCHRONIZING..."}
            </span>
          </div>

          <button
            onClick={() => setIsCreateSchoolOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Provision New School</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <SuperAdminSchoolsModule
          schools={schools}
          campuses={campuses}
          sessions={sessions}
          students={students}
          onSelectSchool={setSelectedSchool}
          onOpenCreateSchool={() => setIsCreateSchoolOpen(true)}
          onOpenCreateCampus={() => setIsCreateCampusOpen(true)}
        />
      </main>

      <CreateCampusModal
        isOpen={isCreateCampusOpen}
        onClose={() => setIsCreateCampusOpen(false)}
        schools={schools}
        selectedSchool={selectedSchool}
        onCreateCampus={handleCreateCampus}
      />

      <CreateSchoolModal
        isOpen={isCreateSchoolOpen}
        onClose={() => setIsCreateSchoolOpen(false)}
        onCreateSchool={handleCreateSchool}
      />
    </div>
  );
}
\`;

fs.writeFileSync(path.join(basePath, "app/super-admin/page.tsx"), superAdminContent, "utf8");
console.log("Updated src/app/super-admin/page.tsx to use 100% live Supabase data!");

// 3. Clean up src/data/mockData.ts
const mockDataContent = \`/**
 * GrowMore Educational Multi-Tenant SMS
 * Notice: Mock data has been completely superseded by live Supabase database tables.
 * This file exports empty arrays to maintain backward-compatibility for any external test references.
 */

import { School, AcademicSession, Campus, AcademicClass, Student, FeeTransaction } from "@/types";

export const MOCK_SCHOOLS: School[] = [];
export const MOCK_SESSIONS: AcademicSession[] = [];
export const MOCK_CAMPUSES: Campus[] = [];
export const MOCK_CLASSES: AcademicClass[] = [];
export const MOCK_STUDENTS: Student[] = [];
export const MOCK_TRANSACTIONS: FeeTransaction[] = [];
\`;

fs.writeFileSync(path.join(basePath, "data/mockData.ts"), mockDataContent, "utf8");
console.log("Updated src/data/mockData.ts - mock data eliminated!");
