const fs = require("fs");
const path = require("path");

// 1. In page.tsx
const pagePath = "d:/newGrowMore/src/app/page.tsx";
let pageCode = fs.readFileSync(pagePath, "utf8");

pageCode = pageCode.replace(
  /<SuperAdminSchoolsModule[\s\S]*?\/>/,
  `<SuperAdminSchoolsModule
              schools={schools}
              campuses={campuses}
              sessions={sessions}
              students={students}
              currentSchool={selectedSchool}
              onSelectSchool={handleSelectSchool}
              onAddSchool={handleCreateSchool}
              onUpdateSchool={(sch) => setSchools((prev) => prev.map((s) => s.id === sch.id ? sch : s))}
              onDeleteSchool={(id) => setSchools((prev) => prev.filter((s) => s.id !== id))}
              onOpenCreateCampus={() => setIsCreateCampusOpen(true)}
            />`
);

fs.writeFileSync(pagePath, pageCode, "utf8");
console.log("Updated SuperAdminSchoolsModule props in page.tsx!");

// 2. In super-admin/page.tsx
const superAdminPath = "d:/newGrowMore/src/app/super-admin/page.tsx";
let superAdminCode = fs.readFileSync(superAdminPath, "utf8");

superAdminCode = superAdminCode.replace(
  /<SuperAdminSchoolsModule[\s\S]*?\/>/,
  `<SuperAdminSchoolsModule
          schools={schools}
          campuses={campuses}
          sessions={sessions}
          students={students}
          currentSchool={selectedSchool}
          onSelectSchool={setSelectedSchool}
          onAddSchool={handleCreateSchool}
          onUpdateSchool={(sch) => setSchools((prev) => prev.map((s) => s.id === sch.id ? sch : s))}
          onDeleteSchool={(id) => setSchools((prev) => prev.filter((s) => s.id !== id))}
          onOpenCreateCampus={() => setIsCreateCampusOpen(true)}
        />`
);

fs.writeFileSync(superAdminPath, superAdminCode, "utf8");
console.log("Updated SuperAdminSchoolsModule props in super-admin/page.tsx!");
