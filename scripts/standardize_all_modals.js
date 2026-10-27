const fs = require("fs");
const path = require("path");

const basePath = "d:/newGrowMore/src/components";

// 1. BaseModal.tsx
const baseModalCode = `"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

export type ModalSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full";

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  contentClassName?: string;
  bodyClassName?: string;
  hideHeader?: boolean;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  xs: "max-w-sm",
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-xl",
  xl: "max-w-2xl",
  "2xl": "max-w-3xl",
  "3xl": "max-w-4xl",
  "4xl": "max-w-5xl",
  full: "max-w-[94vw] w-full",
};

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  badge,
  size = "2xl",
  children,
  footer,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  contentClassName = "",
  bodyClassName = "",
  hideHeader = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className={\`relative w-full \${SIZE_CLASSES[size]} my-auto rounded-3xl glass-modal shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-modal-enter \${contentClassName}\`}
      >
        {!hideHeader && (
          <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-800/80 bg-gradient-to-r from-slate-900/90 via-indigo-950/30 to-slate-900/90 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              {icon && (
                <div className="w-10 h-10 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0 shadow-lg shadow-brand-500/10">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {title && (
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                      {title}
                    </h3>
                  )}
                  {badge && typeof badge === "string" ? (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-950/80 border border-brand-800/50 text-brand-300">
                      {badge}
                    </span>
                  ) : (
                    badge
                  )}
                </div>
                {subtitle && (
                  <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all ml-3 shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className={\`flex-1 overflow-y-auto p-5 sm:p-6 \${bodyClassName}\`}>
          {children}
        </div>

        {footer && (
          <div className="px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
`;

// 2. CreateCampusModal.tsx
const createCampusCode = `"use client";

import React, { useState } from "react";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Users, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck,
  Lock
} from "lucide-react";
import { School, Campus } from "@/types";
import { BaseModal } from "@/components/common/BaseModal";

interface CreateCampusModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  selectedSchool: School;
  onCreateCampus: (newCampus: Campus) => void;
}

export const CreateCampusModal: React.FC<CreateCampusModalProps> = ({
  isOpen,
  onClose,
  schools,
  selectedSchool,
  onCreateCampus,
}) => {
  const [targetSchoolId, setTargetSchoolId] = useState(selectedSchool.id);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [city, setCity] = useState("Lahore, Punjab");
  const [address, setAddress] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [capacity, setCapacity] = useState(1500);
  const [error, setError] = useState<string | null>(null);

  const currentSchool = schools.find((s) => s.id === targetSchoolId) || selectedSchool;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !city.trim()) {
      setError("Please fill in Campus Name, Code, and City.");
      return;
    }

    const campusId = \`campus-\${Date.now().toString(36)}\`;
    const sanitizedCode = code.toUpperCase().replace(/\\s+/g, "-");

    const newCampus: Campus = {
      id: campusId,
      schoolId: targetSchoolId,
      name: name.trim(),
      code: sanitizedCode,
      city: city.trim(),
      address: address.trim() || \`\${city.trim()}, Pakistan\`,
      principalName: principalName.trim() || "Campus Principal",
      contactPhone: contactPhone.trim() || "+92 42 35000000",
      contactEmail: contactEmail.trim() || \`\${sanitizedCode.toLowerCase()}@\${currentSchool.code.toLowerCase()}.edu.pk\`,
      totalStudents: 0,
      totalStaff: 0,
      monthlyRevenue: 0,
      attendanceRate: 100,
      activeSession: "2026-2027",
      currency: "PKR",
    };

    onCreateCampus(newCampus);
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Register New Campus"
      subtitle={\`Partitioned Branch under \${currentSchool.name}\`}
      icon={<Building2 className="w-5 h-5 text-brand-400" />}
      badge={currentSchool.code}
      size="2xl"
      footer={
        <div className="w-full flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Partitioned to {currentSchool.code}</span>
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
              form="create-campus-form"
              className="gm-btn-primary text-xs py-2 px-4.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Campus</span>
            </button>
          </div>
        </div>
      }
    >
      <form id="create-campus-form" onSubmit={handleSubmit} className="space-y-4">
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
              Campus Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. DHA Phase 5 Campus"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!code) {
                  const words = e.target.value.split(" ");
                  const autoCode = words.map((w) => w[0]).join("").toUpperCase();
                  if (autoCode.length >= 2) setCode(\`\${currentSchool.code}-\${autoCode}\`);
                }
              }}
              className="gm-input"
            />
          </div>

          <div>
            <label className="gm-label">
              Campus Code <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. GM-DHA5"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="gm-input font-mono uppercase"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="gm-label">
              City & Region <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Lahore, Punjab"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="gm-input"
            />
          </div>

          <div>
            <label className="gm-label">
              Student Enrollment Capacity
            </label>
            <input
              type="number"
              placeholder="1500"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="gm-input"
            />
          </div>
        </div>

        <div>
          <label className="gm-label">Physical Campus Address</label>
          <input
            type="text"
            placeholder="e.g. Plot 42, Sector C, DHA Phase 5, Lahore"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="gm-input"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="gm-label">Principal / Director</label>
            <input
              type="text"
              placeholder="e.g. Dr. Naveed Alam"
              value={principalName}
              onChange={(e) => setPrincipalName(e.target.value)}
              className="gm-input"
            />
          </div>

          <div>
            <label className="gm-label">Contact Phone</label>
            <input
              type="text"
              placeholder="+92 42 37190000"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="gm-input"
            />
          </div>

          <div>
            <label className="gm-label">Official Email</label>
            <input
              type="email"
              placeholder="campus@school.edu.pk"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="gm-input"
            />
          </div>
        </div>
      </form>
    </BaseModal>
  );
};
`;

// 3. CreateSchoolModal.tsx
const createSchoolCode = `"use client";

import React, { useState } from "react";
import { 
  Building, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Lock,
  Calendar
} from "lucide-react";
import { School, Campus, AcademicSession } from "@/types";
import { BaseModal } from "@/components/common/BaseModal";

interface CreateSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSchool: (
    newSchool: School, 
    initialCampuses: Campus[], 
    initialSession: AcademicSession
  ) => void;
}

export const CreateSchoolModal: React.FC<CreateSchoolModalProps> = ({
  isOpen,
  onClose,
  onCreateSchool,
}) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [boardAffiliation, setBoardAffiliation] = useState("FBISE Islamabad & Cambridge International");
  const [foundedYear, setFoundedYear] = useState<number>(2024);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [initialCampusName, setInitialCampusName] = useState("Main Campus");
  const [initialCampusCity, setInitialCampusCity] = useState("Lahore, Punjab");
  const [initialPrincipal, setInitialPrincipal] = useState("Dr. Tariq Mahmood");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError("Please provide a School Name and Acronym Code.");
      return;
    }

    const schoolId = \`school-\${Date.now().toString(36)}\`;
    const sanitizedCode = code.toUpperCase().replace(/\\s+/g, "");

    const newSchool: School = {
      id: schoolId,
      name: name.trim(),
      code: sanitizedCode,
      registrationNo: registrationNo.trim() || \`REG-\${Math.floor(100000 + Math.random() * 900000)}\`,
      boardAffiliation: boardAffiliation.trim(),
      foundedYear: foundedYear,
      themeColor: primaryColor,
      totalCampuses: 1,
      totalStudents: 0,
      status: "ACTIVE",
      databasePartitionKey: \`tenant_\${sanitizedCode.toLowerCase()}\`,
      subscriptionTier: "ENTERPRISE",
      currency: "PKR",
      contactEmail: contactEmail.trim() || \`admin@\${sanitizedCode.toLowerCase()}.edu.pk\`,
      contactPhone: contactPhone.trim() || "+92 42 111-000-111",
      systemHealth: "OPTIMAL",
    };

    const initialCampus: Campus = {
      id: \`campus-\${sanitizedCode.toLowerCase()}-main\`,
      schoolId: schoolId,
      name: \`\${name.trim()} (\${initialCampusName.trim()})\`,
      code: \`\${sanitizedCode}-MAIN\`,
      city: initialCampusCity.trim(),
      address: \`Central Boulevard, \${initialCampusCity.trim()}\`,
      principalName: initialPrincipal.trim(),
      contactPhone: contactPhone.trim() || "+92 42 111-000-111",
      contactEmail: \`main@\${sanitizedCode.toLowerCase()}.edu.pk\`,
      totalStudents: 0,
      totalStaff: 0,
      monthlyRevenue: 0,
      attendanceRate: 100,
      activeSession: "2026-2027",
      currency: "PKR",
    };

    const initialSession: AcademicSession = {
      id: \`sess-\${schoolId}-2026\`,
      schoolId: schoolId,
      name: "2026-2027",
      startDate: "2026-08-15",
      endDate: "2027-06-30",
      status: "ACTIVE",
      totalTerms: 3,
    };

    onCreateSchool(newSchool, [initialCampus], initialSession);
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Provision New School Tenant"
      subtitle="Multi-Tenant Partition Master & Infrastructure Shard"
      icon={<Building className="w-5 h-5 text-brand-400" />}
      badge="Multi-Tenant Master"
      size="2xl"
      footer={
        <div className="w-full flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Auto-initializes 2026–2027 Session & Shard</span>
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
              form="create-school-form"
              className="gm-btn-primary text-xs py-2 px-4.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Initialize School Tenant</span>
            </button>
          </div>
        </div>
      }
    >
      <form id="create-school-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-brand-300 flex items-center gap-1.5">
            <Building className="w-4 h-4 text-brand-400" />
            <span>1. Organization & Institutional Identity</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="gm-label">
                Official School System Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Beaconhouse School System"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!code) {
                    const initials = e.target.value
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase();
                    if (initials.length >= 2) setCode(initials);
                  }
                }}
                className="gm-input"
              />
            </div>

            <div>
              <label className="gm-label">
                Acronym Code <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. BSS"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="gm-input font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="gm-label">Government / Ministry Registration No.</label>
              <input
                type="text"
                placeholder="e.g. REG-PK-884920"
                value={registrationNo}
                onChange={(e) => setRegistrationNo(e.target.value)}
                className="gm-input font-mono"
              />
            </div>

            <div>
              <label className="gm-label">Curriculum & Examination Board</label>
              <input
                type="text"
                value={boardAffiliation}
                onChange={(e) => setBoardAffiliation(e.target.value)}
                className="gm-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="gm-label">Founded Year</label>
              <input
                type="number"
                value={foundedYear}
                onChange={(e) => setFoundedYear(Number(e.target.value))}
                className="gm-input"
              />
            </div>

            <div>
              <label className="gm-label">Corporate Email</label>
              <input
                type="email"
                placeholder="info@school.edu.pk"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="gm-input"
              />
            </div>

            <div>
              <label className="gm-label">Helpline Phone</label>
              <input
                type="text"
                placeholder="+92 42 111-00-11"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="gm-input"
              />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>2. Auto-Provisioned Primary Campus Branch</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="gm-label">Campus Branch Label</label>
              <input
                type="text"
                value={initialCampusName}
                onChange={(e) => setInitialCampusName(e.target.value)}
                className="gm-input"
              />
            </div>

            <div>
              <label className="gm-label">Campus City</label>
              <input
                type="text"
                value={initialCampusCity}
                onChange={(e) => setInitialCampusCity(e.target.value)}
                className="gm-input"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="gm-label">Principal / Director Name</label>
              <input
                type="text"
                placeholder="e.g. Mrs. Shamim Haider"
                value={initialPrincipal}
                onChange={(e) => setInitialPrincipal(e.target.value)}
                className="gm-input"
              />
            </div>
          </div>
        </div>
      </form>
    </BaseModal>
  );
};
`;

// 4. FeePaymentModal.tsx
const feePaymentCode = `"use client";

import React, { useState } from "react";
import { Student } from "@/types";
import { 
  CreditCard, 
  Printer, 
  CheckCircle2, 
  Tag, 
  ShieldCheck,
  Receipt,
  Building2,
  DollarSign
} from "lucide-react";
import { BaseModal } from "@/components/common/BaseModal";

interface FeePaymentModalProps {
  student: Student | null;
  onClose: () => void;
  onSuccess: (receiptData: any) => void;
}

export const FeePaymentModal: React.FC<FeePaymentModalProps> = ({
  student,
  onClose,
  onSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [tuitionFee, setTuitionFee] = useState(
    student?.dueAmount && student.dueAmount > 0 ? student.dueAmount : 28500
  );
  const [applySiblingDiscount, setApplySiblingDiscount] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptGenerated, setReceiptGenerated] = useState<any>(null);

  if (!student) return null;

  const discountAmount = applySiblingDiscount ? tuitionFee * 0.15 : 0;
  const netPayable = Math.max(0, tuitionFee - discountAmount);

  const handleProcessPayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const receipt = {
        receiptNo: \`REC-\${Date.now().toString(36).toUpperCase()}\`,
        studentId: student.id,
        studentName: student.name,
        enrollmentNo: student.enrollmentNo,
        amount: netPayable,
        discountApplied: discountAmount,
        paymentMethod: paymentMethod,
        date: new Date().toLocaleDateString(),
      };
      setReceiptGenerated(receipt);
      onSuccess(receipt);
    }, 600);
  };

  return (
    <BaseModal
      isOpen={!!student}
      onClose={onClose}
      title={receiptGenerated ? "Payment Confirmation" : "Fee Cashier Collection POS"}
      subtitle={receiptGenerated ? "Transaction verified & recorded in ledger" : \`Collecting dues for \${student.name}\`}
      icon={<CreditCard className="w-5 h-5 text-emerald-400" />}
      badge={student.enrollmentNo}
      size="2xl"
      footer={
        receiptGenerated ? (
          <div className="w-full flex items-center gap-2.5">
            <button
              onClick={() => window.print()}
              className="gm-btn-secondary flex-1 text-xs py-2.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="gm-btn-primary flex-1 text-xs py-2.5"
            >
              <span>Done</span>
            </button>
          </div>
        ) : (
          <div className="w-full flex items-center justify-between">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fiscal Receipt Verified</span>
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
                type="button"
                onClick={handleProcessPayment}
                disabled={isProcessing}
                className="gm-btn-primary text-xs py-2 px-4.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/25"
              >
                {isProcessing ? (
                  <span>Recording...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Complete Collection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )
      }
    >
      {!receiptGenerated ? (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center font-bold text-sm">
                {student.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{student.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {student.grade} ({student.section}) • ID:{" "}
                  <span className="font-mono text-brand-300">{student.enrollmentNo}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Ledger Status</span>
              <p className="text-xs font-bold text-amber-400 mt-0.5">
                {student.dueAmount > 0
                  ? \`Unsettled: Rs. \${student.dueAmount.toLocaleString()}\`
                  : "Pre-billing Cycle"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3.5">
              <div>
                <label className="gm-label">Billing Head / Base Tuition Due (Rs.)</label>
                <div className="relative">
                  <span className="text-xs font-bold text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                    Rs.
                  </span>
                  <input
                    type="number"
                    value={tuitionFee}
                    onChange={(e) => setTuitionFee(Number(e.target.value))}
                    className="gm-input pl-10 font-bold text-base"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Tag className="w-4 h-4 text-brand-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Sibling Concession (15%)</p>
                    <p className="text-[10px] text-slate-400">Policy: Auto-detect registered sibling in Campus</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={applySiblingDiscount}
                  onChange={(e) => setApplySiblingDiscount(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 bg-slate-900 border-slate-700 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="gm-label mb-2">Settlement Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {["CASH", "CARD", "1LINK / RAAST", "MEEZAN / HBL"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={\`py-2.5 text-[11px] font-semibold rounded-xl border transition-all \${
                        paymentMethod === m
                          ? "bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-600/30"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }\`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Total Net Amount Payable</p>
                  {discountAmount > 0 && (
                    <p className="text-[11px] text-emerald-400 font-medium">
                      Saved Rs. {discountAmount.toLocaleString()} via Sibling Policy
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-white">
                    Rs. {netPayable.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-center py-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-4 ring-emerald-500/10 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white">Payment Recorded Successfully</h4>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Receipt No: {receiptGenerated.receiptNo}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-left font-mono text-xs space-y-2 text-slate-300">
            <div className="flex justify-between border-b border-slate-800 pb-1.5 text-slate-400 font-bold">
              <span>ITEM</span>
              <span>AMOUNT</span>
            </div>
            <div className="flex justify-between">
              <span>Tuition & Lab Dues</span>
              <span>Rs. {tuitionFee.toLocaleString()}</span>
            </div>
            {receiptGenerated.discountApplied > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Sibling Concession</span>
                <span>-Rs. {receiptGenerated.discountApplied.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-800 pt-1.5 font-bold text-white text-sm">
              <span>TOTAL PAID ({receiptGenerated.paymentMethod})</span>
              <span>Rs. {receiptGenerated.amount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </BaseModal>
  );
};
`;

// 5. SessionPromotionModal.tsx
const sessionPromotionCode = `"use client";

import React, { useState } from "react";
import { 
  TrendingUp, 
  CheckCircle2, 
  Calendar, 
  Building2, 
  Award, 
  ArrowRight,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { Student, AcademicSession, AcademicClass, StudentEnrollmentRecord } from "@/types";
import { BaseModal } from "@/components/common/BaseModal";

interface SessionPromotionModalProps {
  student: Student | null;
  sessions: AcademicSession[];
  classes: AcademicClass[];
  onClose: () => void;
  onPromoteSuccess: (updatedStudent: Student) => void;
}

export const SessionPromotionModal: React.FC<SessionPromotionModalProps> = ({
  student,
  sessions,
  classes,
  onClose,
  onPromoteSuccess,
}) => {
  if (!student) return null;

  const targetSessions = sessions.filter(s => s.name !== student.currentSessionName);
  const defaultTargetSession = targetSessions.find(s => s.status === "UPCOMING") || targetSessions[targetSessions.length - 1];

  const [targetSessionId, setTargetSessionId] = useState(defaultTargetSession?.id || "");
  const selectedTargetSession = sessions.find(s => s.id === targetSessionId) || defaultTargetSession;

  const targetCampusClasses = classes.filter(
    c => c.campusId === student.campusId && (c.academicSessionId === targetSessionId || !c.academicSessionId)
  );

  const [targetClassId, setTargetClassId] = useState(targetCampusClasses[0]?.id || "");
  const selectedTargetClass = targetCampusClasses.find(c => c.id === targetClassId) || targetCampusClasses[0];

  const [promotionResult, setPromotionResult] = useState("Promoted with Honors (GPA 3.8)");
  const [remarks, setRemarks] = useState("Cleared all academic prerequisites, practical labs, and board assessments.");
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePromote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetClass) {
      alert("No target class available in this campus for the chosen session.");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);

      const updatedHistory: StudentEnrollmentRecord[] = (student.enrollmentHistory || []).map(record => {
        if (record.status === "ACTIVE") {
          return {
            ...record,
            status: "COMPLETED",
            completionDate: new Date().toISOString().split("T")[0],
            finalResult: promotionResult,
            remarks: remarks,
          };
        }
        return record;
      });

      const newEnrollmentRecord: StudentEnrollmentRecord = {
        id: \`enh-\${Date.now()}\`,
        studentId: student.id,
        schoolName: student.schoolId,
        campusId: student.campusId,
        campusName: student.campusName,
        academicSessionId: selectedTargetSession?.id || "sess-2027",
        sessionName: selectedTargetSession?.name || "2027-2028",
        classId: selectedTargetClass.id,
        className: selectedTargetClass.name,
        sectionName: selectedTargetClass.section,
        rollNo: \`\${selectedTargetClass.name.replace("Grade ", "")}-\${selectedTargetClass.section.substring(0, 1)}-\${selectedTargetClass.enrolledCount + 1}\`,
        enrollmentType: "PROMOTED",
        enrolledDate: new Date().toISOString().split("T")[0],
        status: "ACTIVE",
        remarks: \`Promoted from Session \${student.currentSessionName} (\${student.grade} - \${student.section}).\`,
      };

      updatedHistory.push(newEnrollmentRecord);

      const updatedStudent: Student = {
        ...student,
        grade: selectedTargetClass.name,
        section: selectedTargetClass.section,
        currentSessionId: selectedTargetSession?.id || "sess-2027",
        currentSessionName: selectedTargetSession?.name || "2027-2028",
        currentClassId: selectedTargetClass.id,
        enrollmentHistory: updatedHistory,
      };

      onPromoteSuccess(updatedStudent);
      onClose();
    }, 600);
  };

  return (
    <BaseModal
      isOpen={!!student}
      onClose={onClose}
      title="Annual Academic Promotion"
      subtitle={\`Non-destructive rollover into new academic session for \${student.name}\`}
      icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
      badge={student.enrollmentNo}
      size="2xl"
      footer={
        <div className="w-full flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Preserves all historical records permanently</span>
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
              form="session-promotion-form"
              disabled={isProcessing}
              className="gm-btn-primary text-xs py-2 px-4.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/25"
            >
              {isProcessing ? (
                <span>Writing Record...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Execute Promotion</span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <form id="session-promotion-form" onSubmit={handlePromote} className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white">{student.name}</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Enrollment ID: <strong className="font-mono text-brand-300">{student.enrollmentNo}</strong>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500">Campus Branch</span>
            <p className="text-xs font-semibold text-slate-200 mt-0.5">{student.campusName}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">From Session (Current)</span>
            <p className="font-bold text-white font-mono">{student.currentSessionName}</p>
            <p className="text-brand-300 font-medium">{student.grade} ({student.section})</p>
          </div>

          <div className="space-y-1 border-l border-slate-800 pl-3">
            <span className="text-[10px] uppercase font-bold text-emerald-400">To Session (Target)</span>
            <p className="font-bold text-emerald-300 font-mono">{selectedTargetSession?.name || "2027-2028"}</p>
            <p className="text-slate-200 font-medium">
              {selectedTargetClass?.name || "Next Grade"} ({selectedTargetClass?.section || ""})
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="gm-label">
              Select Target Academic Session <span className="text-rose-400">*</span>
            </label>
            <select
              value={targetSessionId}
              onChange={(e) => setTargetSessionId(e.target.value)}
              className="gm-select font-mono"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  Session {s.name} ({s.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="gm-label">
              Target Admitting Class & Stream <span className="text-rose-400">*</span>
            </label>
            <select
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              className="gm-select"
            >
              {classes.filter(c => c.campusId === student.campusId).map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} - {cls.section} ({cls.stream})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="gm-label">Annual Evaluation Result & Honors</label>
            <input
              type="text"
              value={promotionResult}
              onChange={(e) => setPromotionResult(e.target.value)}
              className="gm-input"
            />
          </div>

          <div>
            <label className="gm-label">Board / Institutional Remarks</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="gm-input"
            />
          </div>
        </div>
      </form>
    </BaseModal>
  );
};
`;

// 6. StudentHistoryModal.tsx
const studentHistoryCode = `"use client";

import React from "react";
import { 
  History, 
  GraduationCap, 
  Calendar, 
  Building2, 
  Award, 
  CheckCircle2, 
  TrendingUp,
  ShieldCheck
} from "lucide-react";
import { Student } from "@/types";
import { BaseModal } from "@/components/common/BaseModal";

interface StudentHistoryModalProps {
  student: Student | null;
  onClose: () => void;
  onOpenPromotionModal: (student: Student) => void;
}

export const StudentHistoryModal: React.FC<StudentHistoryModalProps> = ({
  student,
  onClose,
  onOpenPromotionModal,
}) => {
  if (!student) return null;

  const history = student.enrollmentHistory || [];

  return (
    <BaseModal
      isOpen={!!student}
      onClose={onClose}
      title="Academic Journey & History"
      subtitle={\`Multi-session timeline & promotion audit trail for \${student.name}\`}
      icon={<History className="w-5 h-5 text-brand-400" />}
      badge={student.enrollmentNo}
      size="2xl"
      bodyClassName="p-0 flex flex-col"
      footer={
        <div className="w-full flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Immutable Institutional Class Ledger</span>
          </div>
          <button
            onClick={onClose}
            className="gm-btn-secondary text-xs py-2 px-4"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="p-4 sm:p-5 bg-slate-950/60 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={student.avatarUrl}
              alt={student.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight">{student.name}</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Current Class: <strong className="text-slate-200">{student.grade} - {student.section}</strong> • Session: <strong className="text-brand-300">{student.currentSessionName}</strong>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Campus: {student.campusName} • Guardian: {student.guardianName}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            onClose();
            onOpenPromotionModal(student);
          }}
          className="gm-btn-primary text-xs py-2 px-3.5 shrink-0"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Promote Scholar →</span>
        </button>
      </div>

      <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Verified Session Milestones ({history.length} Records)
          </span>
          <span className="text-[10px] text-emerald-400 font-mono font-semibold">
            Active Ledger Trail
          </span>
        </div>

        <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {history.map((rec) => {
            const isCurrent = rec.status === "ACTIVE";
            return (
              <div key={rec.id} className="relative group">
                <div
                  className={\`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full ring-4 ring-slate-900 transition-all \${
                    isCurrent
                      ? "bg-brand-500 ring-brand-500/20 animate-pulse"
                      : "bg-emerald-500 ring-emerald-500/20"
                  }\`}
                />

                <div
                  className={\`p-4 rounded-2xl border transition-all \${
                    isCurrent
                      ? "bg-brand-950/20 border-brand-800/80 shadow-lg shadow-brand-500/5"
                      : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                  }\`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-mono">
                        Session {rec.sessionName}
                      </span>
                      <span
                        className={\`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider \${
                          rec.enrollmentType === "NEW_ADMISSION"
                            ? "bg-blue-950/80 text-blue-300 border border-blue-800/50"
                            : rec.enrollmentType === "PROMOTED"
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/50"
                            : "bg-purple-950/80 text-purple-300 border border-purple-800/50"
                        }\`}
                      >
                        {rec.enrollmentType.replace("_", " ")}
                      </span>
                    </div>

                    <span
                      className={\`text-[10px] font-semibold \${
                        isCurrent ? "text-brand-300 font-bold" : "text-slate-400"
                      }\`}
                    >
                      {isCurrent ? "● Active Enrolled Status" : \`Completed: \${rec.completionDate || "Finished"}\`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-2">
                    <div>
                      <span className="text-slate-500">Class & Section: </span>
                      <strong className="text-slate-200">{rec.className} ({rec.sectionName})</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Class Roll No: </span>
                      <span className="font-mono text-brand-300 font-bold">{rec.rollNo}</span>
                    </div>
                    <div className="sm:col-span-2 text-slate-400 text-[11px] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{rec.campusName}</span>
                    </div>
                  </div>

                  {rec.finalResult && (
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between text-slate-300">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-400" />
                        <span className="text-slate-400">Evaluation:</span>
                        <strong className="text-emerald-300">{rec.finalResult}</strong>
                      </div>
                    </div>
                  )}

                  {rec.remarks && (
                    <p className="text-[11px] text-slate-500 italic mt-2">
                      Note: &quot;{rec.remarks}&quot;
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </BaseModal>
  );
};
`;

// 7. ReportCardModal.tsx
const reportCardCode = `"use client";

import React from "react";
import { Student } from "@/types";
import { Award, Printer, QrCode } from "lucide-react";
import { BaseModal } from "@/components/common/BaseModal";

interface ReportCardModalProps {
  student: Student | null;
  onClose: () => void;
}

export const ReportCardModal: React.FC<ReportCardModalProps> = ({
  student,
  onClose,
}) => {
  if (!student) return null;

  const subjectGrades = [
    { subject: "Advanced Mathematics", maxMarks: 100, marksObtained: 94, grade: "A*", gpa: 4.0, remarks: "Outstanding conceptual mastery" },
    { subject: "Physics & Mechanics", maxMarks: 100, marksObtained: 88, grade: "A", gpa: 3.8, remarks: "Strong experimental aptitude" },
    { subject: "Pakistan Studies & History", maxMarks: 100, marksObtained: 92, grade: "A*", gpa: 4.0, remarks: "Comprehensive historical grasp" },
    { subject: "Urdu Literature & Composition", maxMarks: 100, marksObtained: 90, grade: "A*", gpa: 4.0, remarks: "Exemplary linguistic elegance" },
    { subject: "Computer Science & AI", maxMarks: 100, marksObtained: 98, grade: "A*", gpa: 4.0, remarks: "Top percentile in algorithmic logic" },
    { subject: "Islamiat / Religious Ethics", maxMarks: 100, marksObtained: 95, grade: "A*", gpa: 4.0, remarks: "Distinction in ethical philosophy" },
  ];

  const totalObtained = subjectGrades.reduce((acc, s) => acc + s.marksObtained, 0);
  const totalMax = subjectGrades.reduce((acc, s) => acc + s.maxMarks, 0);
  const percentage = ((totalObtained / totalMax) * 100).toFixed(1);
  const cumulativeGPA = (
    subjectGrades.reduce((acc, s) => acc + s.gpa, 0) / subjectGrades.length
  ).toFixed(2);

  return (
    <BaseModal
      isOpen={!!student}
      onClose={onClose}
      title="Official Academic Transcript"
      subtitle={\`Term Evaluation & Examination Report for \${student.name}\`}
      icon={<Award className="w-5 h-5 text-amber-400" />}
      badge={student.enrollmentNo}
      size="2xl"
      bodyClassName="p-0 bg-white text-slate-900"
      footer={
        <div className="w-full flex items-center justify-between">
          <span className="text-xs text-slate-400">Verified Digital Academic Transcript</span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.print()}
              className="gm-btn-secondary text-xs py-2 px-3.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="gm-btn-primary text-xs py-2 px-4"
            >
              Close
            </button>
          </div>
        </div>
      }
    >
      <div className="p-6 sm:p-8 space-y-5 sm:space-y-6">
        <div className="text-center border-b-2 border-slate-900 pb-4 sm:pb-5">
          <div className="flex items-center justify-center gap-2.5 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-md">
              GM
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold uppercase tracking-wide text-slate-900">
              GrowMore Global Academy System
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-600 font-semibold tracking-wider uppercase">
            {student.campusName} • Accredited International Curriculum
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
            Academic Session {student.currentSessionName} • Term Evaluation
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400">Student Name</p>
            <p className="font-bold text-slate-800 text-sm mt-0.5">{student.name}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400">Enrollment ID</p>
            <p className="font-mono font-bold text-slate-700 mt-0.5">{student.enrollmentNo}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400">Class & Section</p>
            <p className="font-bold text-slate-800 mt-0.5">{student.grade} - {student.section}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold text-slate-400">Attendance Rate</p>
            <p className="font-bold text-emerald-600 mt-0.5">97.8% (Present)</p>
          </div>
        </div>

        <div className="overflow-hidden border border-slate-200 rounded-2xl shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Subject</th>
                <th className="py-2.5 px-2 text-center">Max Marks</th>
                <th className="py-2.5 px-2 text-center">Obtained</th>
                <th className="py-2.5 px-2 text-center">Grade</th>
                <th className="py-2.5 px-2 text-center">GPA</th>
                <th className="py-2.5 px-3">Instructor Evaluation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjectGrades.map((sub, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{sub.subject}</td>
                  <td className="py-2.5 px-2 text-center text-slate-500">{sub.maxMarks}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-slate-800">{sub.marksObtained}</td>
                  <td className="py-2.5 px-2 text-center">
                    <span className="px-2 py-0.5 rounded font-bold text-xs bg-brand-50 text-brand-700 border border-brand-200">
                      {sub.grade}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono font-medium text-slate-700">{sub.gpa.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-slate-600 text-[11px] italic">{sub.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between text-xs shadow-md">
          <div>
            <span className="text-[11px] text-slate-400">Total Score:</span>
            <span className="font-bold text-white ml-1.5 text-sm">{totalObtained} / {totalMax}</span>
            <span className="ml-3 text-emerald-400 font-semibold">({percentage}%)</span>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[11px] text-slate-400">Cumulative GPA:</span>
              <span className="font-bold text-brand-300 ml-1.5 text-base">{cumulativeGPA} / 4.0</span>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold uppercase tracking-wider text-[10px]">
              Distinction
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-slate-300 rounded-xl">
              <QrCode className="w-8 h-8 text-slate-800" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-600 font-semibold">VERIFIED DIGITAL CREDENTIAL</p>
              <p className="text-[9px] text-slate-400">Ledger Hash: 0x9b4a...e12d</p>
            </div>
          </div>

          <div className="text-right">
            <div className="h-8 border-b border-dashed border-slate-400 w-36 mb-1 ml-auto" />
            <p className="text-[11px] font-semibold text-slate-800">Campus Director / Principal</p>
            <p className="text-[10px] text-slate-400">Academic Examination Board</p>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
`;

// Write all files
fs.writeFileSync(path.join(basePath, "common/BaseModal.tsx"), baseModalCode, "utf8");
console.log("Updated BaseModal.tsx");

fs.writeFileSync(path.join(basePath, "modals/CreateCampusModal.tsx"), createCampusCode, "utf8");
console.log("Updated CreateCampusModal.tsx");

fs.writeFileSync(path.join(basePath, "modals/CreateSchoolModal.tsx"), createSchoolCode, "utf8");
console.log("Updated CreateSchoolModal.tsx");

fs.writeFileSync(path.join(basePath, "modals/FeePaymentModal.tsx"), feePaymentCode, "utf8");
console.log("Updated FeePaymentModal.tsx");

fs.writeFileSync(path.join(basePath, "modals/SessionPromotionModal.tsx"), sessionPromotionCode, "utf8");
console.log("Updated SessionPromotionModal.tsx");

fs.writeFileSync(path.join(basePath, "modals/StudentHistoryModal.tsx"), studentHistoryCode, "utf8");
console.log("Updated StudentHistoryModal.tsx");

fs.writeFileSync(path.join(basePath, "modals/ReportCardModal.tsx"), reportCardCode, "utf8");
console.log("Updated ReportCardModal.tsx");

console.log("All modals standardized successfully to size=2xl with matching layout and positioning!");
