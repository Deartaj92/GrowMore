const fs = require("fs");
const path = require("path");

const filePath = "d:/newGrowMore/src/app/page.tsx";
let code = fs.readFileSync(filePath, "utf8");

const oldPaletteRegex = /<CommandPalette[\s\S]*?\/>/;
const newPalette = `<CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        students={students}
        campuses={currentSchoolCampuses}
        onSelectStudent={(student) => setHistoryModalStudent(student)}
        onSelectCampus={(campus) => setSelectedCampus(campus)}
      />`;

code = code.replace(oldPaletteRegex, newPalette);
fs.writeFileSync(filePath, code, "utf8");
console.log("Fixed CommandPalette props in page.tsx!");
