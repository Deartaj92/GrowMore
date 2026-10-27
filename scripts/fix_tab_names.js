const fs = require("fs");
const path = require("path");

const filePath = "d:/newGrowMore/src/app/page.tsx";
let code = fs.readFileSync(filePath, "utf8");

code = code.replace('activeTab === "super-admin"', 'activeTab === "super_admin"');
code = code.replace('activeTab === "academic-setup"', 'activeTab === "setup"');
code = code.replace('activeTab === "payroll"', 'activeTab === "hr_payroll"');
code = code.replace('activeTab === "tenancy"', 'activeTab === "settings"');

fs.writeFileSync(filePath, code, "utf8");
console.log("Updated activeTab conditionals in page.tsx!");
