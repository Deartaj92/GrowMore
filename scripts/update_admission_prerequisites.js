const fs = require("fs");
const path = require("path");

const targetFile = "d:/newGrowMore/src/components/modals/StudentAdmissionModal.tsx";
let code = fs.readFileSync(targetFile, "utf8");

// 1. Update StudentAdmissionModalProps interface
code = code.replace(
  /interface StudentAdmissionModalProps \{[\s\S]*?\}/,
  `interface StudentAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  campuses: Campus[];
  sessions: AcademicSession[];
  classes: AcademicClass[];
  selectedCampusId: string;
  onStudentAdmitted: (newStudent: Student) => void;
  onOpenCreateCampus?: () => void;
  onOpenCreateSession?: () => void;
}`
);

// 2. Destructure onOpenCreateCampus and onOpenCreateSession
code = code.replace(
  /export const StudentAdmissionModal: React\.FC<StudentAdmissionModalProps> = \(\{[\s\S]*?\}\) => \{/,
  `export const StudentAdmissionModal: React.FC<StudentAdmissionModalProps> = ({
  isOpen,
  onClose,
  schools,
  campuses,
  sessions,
  classes,
  selectedCampusId,
  onStudentAdmitted,
  onOpenCreateCampus,
  onOpenCreateSession,
}) => {`
);

// 3. In Step 1, add guided prerequisite alerts when campuses or sessions are missing
const oldStep1Start = `{step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-300 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-brand-400" />
                      <span>Step 1: Academic Structure Prerequisites</span>
                    </h4>
                    <span className="text-[10px] text-emerald-400 font-medium">Database Validated</span>
                  </div>`;

const newStep1Start = `{step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-300 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-brand-400" />
                      <span>Step 1: Academic Structure Prerequisites</span>
                    </h4>
                    <span className="text-[10px] text-emerald-400 font-medium">Database Validated</span>
                  </div>

                  {/* Guided prerequisite action when NO campus exists */}
                  {operationalCampuses.length === 0 && (
                    <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/30 animate-modal-enter">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>Prerequisite Required: No Campus Branch Found</span>
                          </h5>
                          <p className="text-[11px] text-amber-300/90 mt-0.5">
                            You must register a campus branch under <strong className="text-white">{selectedSchool?.name || "this school"}</strong> before admitting new students.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenCreateCampus?.();
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 transition-all flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>+ Add Campus First</span>
                      </button>
                    </div>
                  )}

                  {/* Guided prerequisite action when NO session exists */}
                  {schoolSessions.length === 0 && (
                    <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-indigo-950/30 animate-modal-enter">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>Prerequisite Required: No Academic Session Found</span>
                          </h5>
                          <p className="text-[11px] text-indigo-300/90 mt-0.5">
                            An academic calendar session (e.g. 2026–2027) is required under <strong className="text-white">{selectedSchool?.name || "this school"}</strong> to allocate student dossiers.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenCreateSession?.();
                        }}
                        className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/30 transition-all flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>+ Add Session First</span>
                      </button>
                    </div>
                  )}`;

code = code.replace(oldStep1Start, newStep1Start);

// 4. Update the Campus Branch and Session dropdown sections
const oldCampusSection = `<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Campus Branch */}
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-slate-300 block mb-1">
                        2. Select Campus Branch <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={formData.campusId}
                        onChange={(e) => handleCampusChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500 font-medium"
                      >
                        {operationalCampuses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.code} • {c.city})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Academic Session */}
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1">
                        3. Academic Session <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={formData.sessionId}
                        onChange={(e) => handleSessionChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500"
                      >
                        {schoolSessions.map((s) => (
                          <option key={s.id} value={s.id}>
                            Session {s.name} ({s.status})
                          </option>
                        ))}
                      </select>
                    </div>`;

const newCampusSection = `<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Campus Branch */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-300">
                          2. Select Campus Branch <span className="text-rose-400">*</span>
                        </label>
                        {operationalCampuses.length === 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenCreateCampus?.();
                            }}
                            className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1"
                          >
                            + Register Campus Branch First
                          </button>
                        )}
                      </div>
                      {operationalCampuses.length > 0 ? (
                        <select
                          value={formData.campusId}
                          onChange={(e) => handleCampusChange(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500 font-medium"
                        >
                          {operationalCampuses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.code} • {c.city})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-amber-300 font-medium">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>No campus branches exist under this school.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenCreateCampus?.();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition-colors"
                          >
                            + Add Campus First
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Academic Session */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-300">
                          3. Academic Session <span className="text-rose-400">*</span>
                        </label>
                        {schoolSessions.length === 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenCreateSession?.();
                            }}
                            className="text-[11px] text-brand-400 hover:text-brand-300 font-bold underline flex items-center gap-1"
                          >
                            + Add Session First
                          </button>
                        )}
                      </div>
                      {schoolSessions.length > 0 ? (
                        <select
                          value={formData.sessionId}
                          onChange={(e) => handleSessionChange(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-brand-500"
                        >
                          {schoolSessions.map((s) => (
                            <option key={s.id} value={s.id}>
                              Session {s.name} ({s.status})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/60 flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-xs text-indigo-300 font-medium">
                            <AlertTriangle className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span>No academic sessions configured.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenCreateSession?.();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition-colors text-center"
                          >
                            + Add Session First
                          </button>
                        </div>
                      )}
                    </div>`;

code = code.replace(oldCampusSection, newCampusSection);

// 5. Update Step 1 bottom action to disable when prerequisites are missing
const oldStep1Bottom = `<button
                      type="button"
                      disabled={availableClasses.length === 0}
                      onClick={() => setStep(2)}
                      className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-brand-600/30 transition-all"
                    >
                      Next: Student Particulars ➔
                    </button>`;

const newStep1Bottom = `<div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        {operationalCampuses.length === 0 ? (
                          <span className="text-xs text-amber-400 font-medium">
                            ⚠ Register a campus branch first to proceed with admission.
                          </span>
                        ) : schoolSessions.length === 0 ? (
                          <span className="text-xs text-indigo-400 font-medium">
                            ⚠ Configure an academic session first to proceed with admission.
                          </span>
                        ) : availableClasses.length === 0 ? (
                          <span className="text-xs text-slate-400 font-medium">
                            ⚠ No active classes available for this campus and session.
                          </span>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        disabled={operationalCampuses.length === 0 || schoolSessions.length === 0 || availableClasses.length === 0}
                        onClick={() => setStep(2)}
                        className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md shadow-brand-600/30 transition-all ml-auto"
                      >
                        Next: Student Particulars ➔
                      </button>
                    </div>`;

code = code.replace(oldStep1Bottom, newStep1Bottom);

fs.writeFileSync(targetFile, code, "utf8");
console.log("Updated StudentAdmissionModal.tsx with smart prerequisite guidance!");
