const fs = require("fs");
const path = require("path");

const targetFile = "d:/newGrowMore/src/components/modals/CreateSessionModal.tsx";

const code = `"use client";

import React, { useState } from "react";
import { 
  Calendar, 
  CalendarCheck, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Lock,
  Layers,
  Clock
} from "lucide-react";
import { School, AcademicSession } from "@/types";
import { BaseModal } from "@/components/common/BaseModal";

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  selectedSchool: School;
  onCreateSession: (newSession: AcademicSession) => void;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  schools,
  selectedSchool,
  onCreateSession,
}) => {
  const [targetSchoolId, setTargetSchoolId] = useState(selectedSchool.id);
  const [name, setName] = useState("2026-2027");
  const [startDate, setStartDate] = useState("2026-08-15");
  const [endDate, setEndDate] = useState("2027-06-30");
  const [status, setStatus] = useState<"ACTIVE" | "UPCOMING" | "COMPLETED">("ACTIVE");
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentSchool = schools.find((s) => s.id === targetSchoolId) || selectedSchool;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a valid session name (e.g. 2026-2027).");
      return;
    }

    const sessionId = \`sess-\${Date.now().toString(36)}\`;

    const newSession: AcademicSession = {
      id: sessionId,
      schoolId: targetSchoolId,
      name: name.trim(),
      startDate: startDate,
      endDate: endDate,
      status: status,
      isEnrollmentOpen: isEnrollmentOpen,
    };

    onCreateSession(newSession);
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Academic Session"
      subtitle={\`Configure New Academic Calendar Year for \${currentSchool.name}\`}
      icon={<Calendar className="w-5 h-5 text-brand-400" />}
      badge="Academic Calendar"
      size="2xl"
      footer={
        <div className="w-full flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Partitioned under {currentSchool.code} Academic Master</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="gm-btn-secondary text-xs py-2 px-3.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-session-form"
              className="gm-btn-primary text-xs py-2 px-4.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Session</span>
            </button>
          </div>
        </div>
      }
    >
      <form id="create-session-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Bound School:</span>
            <select
              value={targetSchoolId}
              onChange={(e) => setTargetSchoolId(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 text-slate-100 text-xs rounded-xl px-3 py-1.5 font-semibold focus:outline-none focus:border-brand-500"
            >
              {schools.map((sch) => (
                <option key={sch.id} value={sch.id}>
                  {sch.name} ({sch.code})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
            <Lock className="w-3 h-3" />
            <span>{currentSchool.code}</span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="gm-label">
              Academic Session Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 2026-2027"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="gm-input font-mono font-bold"
            />
            <p className="text-[10px] text-slate-500 mt-1">Standard format: YYYY-YYYY (e.g. 2026-2027)</p>
          </div>

          <div>
            <label className="gm-label">
              Session Status <span className="text-rose-400">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="gm-select"
            >
              <option value="ACTIVE">ACTIVE (Current Operational Term)</option>
              <option value="UPCOMING">UPCOMING (Pre-Admission & Planning)</option>
              <option value="COMPLETED">COMPLETED (Archived & Locked)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="gm-label">
              Session Start Date <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="gm-input font-mono text-xs"
            />
          </div>

          <div>
            <label className="gm-label">
              Session End Date <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="gm-input font-mono text-xs"
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Enable Open Student Enrollment</p>
              <p className="text-[10px] text-slate-400">Allows campus registrars to allocate incoming student dossiers into this session</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={isEnrollmentOpen}
            onChange={(e) => setIsEnrollmentOpen(e.target.checked)}
            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 bg-slate-900 border-slate-700 cursor-pointer"
          />
        </div>
      </form>
    </BaseModal>
  );
};
`;

fs.writeFileSync(targetFile, code, "utf8");
console.log("Created CreateSessionModal.tsx with BaseModal standard!");
