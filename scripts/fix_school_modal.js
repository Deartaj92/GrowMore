const fs = require("fs");
const path = require("path");

const filePath = "d:/newGrowMore/src/components/modals/CreateSchoolModal.tsx";
let code = fs.readFileSync(filePath, "utf8");

// Fix newSchool and initialSession in CreateSchoolModal.tsx
const oldSchoolRegex = /const newSchool: School = \{[\s\S]*?\};/;
const newSchoolCode = `const newSchool: School = {
      id: schoolId,
      name: name.trim(),
      code: sanitizedCode,
      registrationNo: registrationNo.trim() || \`REG-\${Math.floor(100000 + Math.random() * 900000)}\`,
      boardAffiliation: boardAffiliation.trim(),
      foundedYear: foundedYear,
      contactEmail: contactEmail.trim() || \`admin@\${sanitizedCode.toLowerCase()}.edu.pk\`,
      contactPhone: contactPhone.trim() || "+92 42 111-000-111",
      headOffice: \`Central Boulevard, \${initialCampusCity.trim()}\`,
      isolationKey: \`tenant_\${sanitizedCode.toLowerCase()}\`,
      status: "ACTIVE",
    };`;

code = code.replace(oldSchoolRegex, newSchoolCode);

// Fix initialSession
const oldSessionRegex = /const initialSession: AcademicSession = \{[\s\S]*?\};/;
const newSessionCode = `const initialSession: AcademicSession = {
      id: \`sess-\${schoolId}-2026\`,
      schoolId: schoolId,
      name: "2026-2027",
      startDate: "2026-08-15",
      endDate: "2027-06-30",
      status: "ACTIVE",
      isEnrollmentOpen: true,
    };`;

code = code.replace(oldSessionRegex, newSessionCode);

fs.writeFileSync(filePath, code, "utf8");
console.log("CreateSchoolModal.tsx updated cleanly with valid TypeScript School and AcademicSession properties!");
