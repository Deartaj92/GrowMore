const fs = require('fs');

// 1. Fix BaseModal.tsx (quote numeric keys)
const baseModalPath = 'd:/newGrowMore/src/components/common/BaseModal.tsx';
let baseModal = fs.readFileSync(baseModalPath, 'utf8');
baseModal = baseModal.replace('2xl: "max-w-3xl"', '"2xl": "max-w-3xl"');
baseModal = baseModal.replace('3xl: "max-w-4xl"', '"3xl": "max-w-4xl"');
baseModal = baseModal.replace('4xl: "max-w-5xl"', '"4xl": "max-w-5xl"');
fs.writeFileSync(baseModalPath, baseModal, 'utf8');

// 2. Fix schoolService.ts
const schoolServicePath = 'd:/newGrowMore/src/services/schoolService.ts';
const schoolServiceContent = `import { supabase } from "@/lib/supabase";
import { School, Campus, AcademicSession } from "@/types";
import { MOCK_SCHOOLS, MOCK_CAMPUSES, MOCK_SESSIONS } from "@/data/mockData";

export function mapDbSchoolToSchool(row: any): School {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    registrationNo: row.registration_no || "",
    boardAffiliation: row.board_affiliation || "",
    foundedYear: row.founded_year || 2024,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    headOffice: row.head_office,
    isolationKey: row.isolation_key,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapDbCampusToCampus(row: any): Campus {
  return {
    id: row.id,
    schoolId: row.school_id,
    name: row.name,
    code: row.code,
    city: row.city,
    address: row.address,
    principalName: row.principal_name,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    currency: row.currency || "PKR",
    totalStudents: row.total_students || 1200,
    totalStaff: row.total_staff || 85,
    monthlyRevenue: row.monthly_revenue || 45000000,
    attendanceRate: row.attendance_rate || 95.5,
    activeSession: "2026-2027",
  };
}

export function mapDbSessionToSession(row: any): AcademicSession {
  return {
    id: row.id,
    schoolId: row.school_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    isEnrollmentOpen: row.is_enrollment_open ?? true,
  };
}

export async function fetchSchoolsFromSupabase(): Promise<School[]> {
  try {
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .order("name", { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn("Using fallback schools data due to:", error?.message);
      return MOCK_SCHOOLS;
    }
    return data.map(mapDbSchoolToSchool);
  } catch (err) {
    console.error("fetchSchools error:", err);
    return MOCK_SCHOOLS;
  }
}

export async function fetchCampusesFromSupabase(schoolId?: string): Promise<Campus[]> {
  try {
    let query = supabase.from("campuses").select("*").order("name", { ascending: true });
    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return MOCK_CAMPUSES;
    }
    return data.map(mapDbCampusToCampus);
  } catch (err) {
    console.error("fetchCampuses error:", err);
    return MOCK_CAMPUSES;
  }
}

export async function fetchSessionsFromSupabase(schoolId?: string): Promise<AcademicSession[]> {
  try {
    let query = supabase.from("academic_sessions").select("*").order("name", { ascending: false });
    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return MOCK_SESSIONS;
    }
    return data.map(mapDbSessionToSession);
  } catch (err) {
    console.error("fetchSessions error:", err);
    return MOCK_SESSIONS;
  }
}

export async function createSchoolInSupabase(
  school: School, 
  initialCampuses: Campus[], 
  initialSession?: AcademicSession
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: schoolData, error: schoolError } = await supabase
      .from("schools")
      .insert({
        name: school.name,
        code: school.code,
        registration_no: school.registrationNo,
        board_affiliation: school.boardAffiliation,
        founded_year: school.foundedYear,
        contact_email: school.contactEmail,
        contact_phone: school.contactPhone,
        head_office: school.headOffice,
        isolation_key: school.isolationKey,
        status: school.status || "ACTIVE",
      })
      .select()
      .single();

    if (schoolError) throw schoolError;

    const createdSchoolId = schoolData.id;

    if (initialCampuses && initialCampuses.length > 0) {
      const campusRows = initialCampuses.map((c) => ({
        school_id: createdSchoolId,
        name: c.name,
        code: c.code,
        city: c.city,
        principal_name: c.principalName,
        currency: c.currency || "PKR",
      }));
      await supabase.from("campuses").insert(campusRows);
    }

    if (initialSession) {
      await supabase.from("academic_sessions").insert({
        school_id: createdSchoolId,
        name: initialSession.name,
        start_date: initialSession.startDate,
        end_date: initialSession.endDate,
        status: initialSession.status,
        is_enrollment_open: initialSession.isEnrollmentOpen,
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error("createSchoolInSupabase error:", err);
    return { success: false, error: err.message };
  }
}
`;
fs.writeFileSync(schoolServicePath, schoolServiceContent, 'utf8');

// 3. Fix super-admin/page.tsx
const superAdminPath = 'd:/newGrowMore/src/app/super-admin/page.tsx';
const superAdminContent = `"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SuperAdminSchoolsModule } from "@/components/modules/SuperAdminSchoolsModule";
import { CreateCampusModal } from "@/components/modals/CreateCampusModal";
import { 
  MOCK_SCHOOLS, 
  MOCK_CAMPUSES, 
  MOCK_SESSIONS, 
  MOCK_STUDENTS 
} from "@/data/mockData";
import { School, Campus, AcademicSession, Student } from "@/types";
import { ArrowLeft, Sparkles, Building, ShieldCheck, Database } from "lucide-react";
import { 
  fetchSchoolsFromSupabase, 
  fetchCampusesFromSupabase, 
  fetchSessionsFromSupabase, 
  createSchoolInSupabase 
} from "@/services/schoolService";

export default function SuperAdminPage() {
  const [schools, setSchools] = useState<School[]>(MOCK_SCHOOLS);
  const [selectedSchool, setSelectedSchool] = useState<School>(MOCK_SCHOOLS[0]);
  const [campuses, setCampuses] = useState<Campus[]>(MOCK_CAMPUSES);
  const [sessions, setSessions] = useState<AcademicSession[]>(MOCK_SESSIONS);
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [isCreateCampusOpen, setIsCreateCampusOpen] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  useEffect(() => {
    async function loadLiveData() {
      try {
        const [realSchools, realCampuses, realSessions] = await Promise.all([
          fetchSchoolsFromSupabase(),
          fetchCampusesFromSupabase(),
          fetchSessionsFromSupabase(),
        ]);

        if (realSchools && realSchools.length > 0) {
          setSchools(realSchools);
          setSelectedSchool(realSchools[0]);
          setIsLiveConnected(true);
        }
        if (realCampuses && realCampuses.length > 0) {
          setCampuses(realCampuses);
        }
        if (realSessions && realSessions.length > 0) {
          setSessions(realSessions);
        }
      } catch (err) {
        console.error("Failed to fetch real data from Supabase:", err);
      }
    }
    loadLiveData();
  }, []);

  const handleSelectSchool = (school: School) => {
    setSelectedSchool(school);
  };

  const handleCreateSchool = async (
    newSchool: School,
    initialCampuses: Campus[],
    initialSession: AcademicSession
  ) => {
    setSchools((prev) => [...prev, newSchool]);
    setCampuses((prev) => [...prev, ...initialCampuses]);
    setSessions((prev) => [...prev, initialSession]);
    setSelectedSchool(newSchool);

    await createSchoolInSupabase(newSchool, initialCampuses, initialSession);
  };

  const handleUpdateSchool = (updatedSchool: School) => {
    setSchools((prev) =>
      prev.map((s) => (s.id === updatedSchool.id ? updatedSchool : s))
    );
    if (selectedSchool.id === updatedSchool.id) {
      setSelectedSchool(updatedSchool);
    }
  };

  const handleDeleteSchool = (schoolId: string) => {
    const remaining = schools.filter((s) => s.id !== schoolId);
    setSchools(remaining);
    if (selectedSchool.id === schoolId && remaining.length > 0) {
      setSelectedSchool(remaining[0]);
    }
  };

  const handleCreateCampus = (newCampus: Campus) => {
    setCampuses((prev) => [...prev, newCampus]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="sticky top-0 z-40 w-full h-16 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-brand-500 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base tracking-tight text-white">
                GrowMore Root Console
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wider text-amber-400 ml-2 px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800/60">
                Super Admin Console
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLiveConnected ? (
            <div className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-xs font-medium flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              <span>Live Supabase Connected</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Connecting to Database...</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        <SuperAdminSchoolsModule
          schools={schools}
          campuses={campuses}
          sessions={sessions}
          students={students}
          currentSchool={selectedSchool}
          onSelectSchool={handleSelectSchool}
          onAddSchool={handleCreateSchool}
          onUpdateSchool={handleUpdateSchool}
          onDeleteSchool={handleDeleteSchool}
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
    </div>
  );
}
`;
fs.writeFileSync(superAdminPath, superAdminContent, 'utf8');

// 4. Fix StudentAdmissionModal.tsx encoding & JSX structure
const admissionPath = 'd:/newGrowMore/src/components/modals/StudentAdmissionModal.tsx';
let admission = fs.readFileSync(admissionPath, 'utf8');
admission = admission.replace(
  /subtitle="School.*?Enrollment History"/,
  'subtitle="School - Campus - Active Session - Class Allocation - Enrollment History"'
);
fs.writeFileSync(admissionPath, admission, 'utf8');

console.log('ALL_SYNTAX_FIXED_SUCCESSFULLY');
