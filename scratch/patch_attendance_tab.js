const fs = require('fs');
const path = 'src/pages/Dashboard/components/AttendanceTab/AttendanceTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add dashboardDate to destructuring (more robust regex)
content = content.replace(
  /consecutiveAbsentStudents,\s+absentDate,/,
  'consecutiveAbsentStudents,\n  dashboardDate,\n  absentDate,'
);

fs.writeFileSync(path, content);
console.log('Update complete');
