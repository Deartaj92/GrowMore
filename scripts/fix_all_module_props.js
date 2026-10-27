const fs = require("fs");
const path = require("path");

const pagePath = "d:/newGrowMore/src/app/page.tsx";
let pageCode = fs.readFileSync(pagePath, "utf8");

// Fix AcademicsModule
pageCode = pageCode.replace(
  /<AcademicsModule[\s\S]*?\/>/,
  `<AcademicsModule campus={selectedCampus} />`
);

// Fix AcademicSetupModule
pageCode = pageCode.replace(
  /<AcademicSetupModule[\s\S]*?\/>/,
  `<AcademicSetupModule
              school={selectedSchool}
              campus={selectedCampus}
              campuses={campuses}
              sessions={sessions}
              classes={classes}
              students={students}
              onAddSession={handleAddSession}
              onUpdateSession={handleUpdateSession}
              onAddClass={handleAddClass}
              onUpdateClass={handleUpdateClass}
              onDeleteClass={handleDeleteClass}
            />`
);

// Fix FeesModule
pageCode = pageCode.replace(
  /<FeesModule[\s\S]*?\/>/,
  `<FeesModule
              campus={selectedCampus}
              onOpenCashierPOS={() => {
                if (students.length > 0) setFeeModalStudent(students[0]);
              }}
            />`
);

// Fix ExamsModule
pageCode = pageCode.replace(
  /<ExamsModule[\s\S]*?\/>/,
  `<ExamsModule
              campus={selectedCampus}
              students={students}
              onOpenReportCard={(student) => setReportCardStudent(student)}
            />`
);

// Fix TenancySettingsModule
pageCode = pageCode.replace(
  /<TenancySettingsModule[\s\S]*?\/>/,
  `<TenancySettingsModule
              schools={schools}
              campuses={campuses}
              onOpenCreateSchool={() => setIsCreateSchoolOpen(true)}
              onOpenCreateCampus={() => setIsCreateCampusOpen(true)}
            />`
);

fs.writeFileSync(pagePath, pageCode, "utf8");
console.log("Updated all module props in page.tsx successfully!");
