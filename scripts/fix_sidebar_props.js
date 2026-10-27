const fs = require("fs");
const path = require("path");

const filePath = "d:/newGrowMore/src/app/page.tsx";
let code = fs.readFileSync(filePath, "utf8");

// Fix Sidebar usage
code = code.replace(
  /<Sidebar[\s\S]*?\/>/,
  `<Sidebar 
          activeTab={activeTab} 
          onSelectTab={setActiveTab} 
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />`
);

// Fix MobileBottomNav usage
code = code.replace(
  /<MobileBottomNav[\s\S]*?\/>/,
  `<MobileBottomNav 
        activeTab={activeTab} 
        onSelectTab={setActiveTab} 
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />`
);

fs.writeFileSync(filePath, code, "utf8");
console.log("Updated Sidebar and MobileBottomNav props in page.tsx!");
