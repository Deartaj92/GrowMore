const fs = require("fs");
const path = require("path");

const filePath = "d:/newGrowMore/src/app/page.tsx";
let code = fs.readFileSync(filePath, "utf8");

// 1. Add CreateSessionModal import
if (!code.includes("CreateSessionModal")) {
  code = code.replace(
    'import { CreateCampusModal } from "@/components/modals/CreateCampusModal";',
    `import { CreateCampusModal } from "@/components/modals/CreateCampusModal";
import { CreateSessionModal } from "@/components/modals/CreateSessionModal";`
  );
}

// 2. Add createSessionInSupabase import
if (!code.includes("createSessionInSupabase")) {
  code = code.replace(
    'promoteStudentInSupabase',
    `promoteStudentInSupabase,
  createSessionInSupabase`
  );
}

// 3. Add isCreateSessionOpen state
if (!code.includes("isCreateSessionOpen")) {
  code = code.replace(
    'const [isCreateCampusOpen, setIsCreateCampusOpen] = useState(false);',
    `const [isCreateCampusOpen, setIsCreateCampusOpen] = useState(false);
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);`
  );
}

// 4. Add handleCreateSession
if (!code.includes("handleCreateSession =")) {
  const handleSessionCode = `  // Register new Academic Session into Supabase
  const handleCreateSession = async (newSession: AcademicSession) => {
    setSessions((prev) => [...prev, newSession]);
    await createSessionInSupabase(newSession);
    await loadLiveData();
  };

  // Add new Campus branch to a School`;

  code = code.replace('// Add new Campus branch to a School', handleSessionCode);
}

// 5. Add Dashboard Prerequisite Alert Banners
const dashboardStart = `{activeTab === "dashboard" && (
            <>
              {/* Primary KPIs & Real-time Branch Metrics */}`;

const newDashboardStart = `{activeTab === "dashboard" && (
            <>
              {/* Prerequisite Action: No Campus Registered */}
              {currentSchoolCampuses.length === 0 && (
                <div className="p-4 sm:p-5 rounded-3xl bg-amber-950/40 border border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl animate-modal-enter">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Action Required: No Campus Branch for {selectedSchool.name}</span>
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-900/60 border border-amber-700/50 text-amber-300">
                          Prerequisite
                        </span>
                      </h4>
                      <p className="text-xs text-amber-300/80 mt-0.5">
                        This school tenant has no physical branch partition. Register a campus branch to unlock class allocations, fee cashier POS, and scholar directories.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCreateCampusOpen(true)}
                    className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>+ Register Campus Branch</span>
                  </button>
                </div>
              )}

              {/* Prerequisite Action: No Academic Session Configured */}
              {sessions.filter(s => s.schoolId === selectedSchool.id).length === 0 && (
                <div className="p-4 sm:p-5 rounded-3xl bg-indigo-950/40 border border-indigo-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl animate-modal-enter">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Action Required: No Academic Session for {selectedSchool.name}</span>
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-900/60 border border-indigo-700/50 text-indigo-300">
                          Calendar Prerequisite
                        </span>
                      </h4>
                      <p className="text-xs text-indigo-300/80 mt-0.5">
                        Academic terms, student admissions, and promotions require an active session (e.g. 2026–2027). Configure your academic calendar year now.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCreateSessionOpen(true)}
                    className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>+ Create Academic Session</span>
                  </button>
                </div>
              )}

              {/* Primary KPIs & Real-time Branch Metrics */}`;

code = code.replace(dashboardStart, newDashboardStart);

// 6. Pass onOpenCreateCampus & onOpenCreateSession to StudentAdmissionModal
code = code.replace(
  `onStudentAdmitted={handleStudentAdmitted}
      />`,
  `onStudentAdmitted={handleStudentAdmitted}
        onOpenCreateCampus={() => setIsCreateCampusOpen(true)}
        onOpenCreateSession={() => setIsCreateSessionOpen(true)}
      />`
);

// 7. Render CreateSessionModal
const sessionModalRender = `      <CreateCampusModal
        isOpen={isCreateCampusOpen}
        onClose={() => setIsCreateCampusOpen(false)}
        schools={schools}
        selectedSchool={selectedSchool}
        onCreateCampus={handleCreateCampus}
      />

      <CreateSessionModal
        isOpen={isCreateSessionOpen}
        onClose={() => setIsCreateSessionOpen(false)}
        schools={schools}
        selectedSchool={selectedSchool}
        onCreateSession={handleCreateSession}
      />`;

code = code.replace(
  `      <CreateCampusModal
        isOpen={isCreateCampusOpen}
        onClose={() => setIsCreateCampusOpen(false)}
        schools={schools}
        selectedSchool={selectedSchool}
        onCreateCampus={handleCreateCampus}
      />`,
  sessionModalRender
);

fs.writeFileSync(filePath, code, "utf8");
console.log("Successfully updated page.tsx with CreateSessionModal and guided prerequisite flows!");
