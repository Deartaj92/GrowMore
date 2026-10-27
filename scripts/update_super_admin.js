const fs = require("fs");
const path = require("path");

const filePath = "d:/newGrowMore/src/app/super-admin/page.tsx";

const content = `"use client";

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
`;

fs.writeFileSync(filePath, content, "utf8");
console.log("Successfully updated src/app/super-admin/page.tsx with 100% live Supabase data!");
