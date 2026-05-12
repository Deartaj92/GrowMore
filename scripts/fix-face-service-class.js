const fs = require('fs');
const p = 'src/services/rfidOfflineService.ts';
let s = fs.readFileSync(p, 'utf8');
const typeExport =
    "export type MarkResultType = 'new' | 'already' | 'error' | 'offline' | 'out' | 'error_checkout_early' | 'already_out' | 'error_inactive' | 'error_manual_only' | 'offline_present' | 'offline_late' | 'offline_checkout' | 'offline_already' | 'offline_already_out' | 'offline_checkout_early' | 'online_present' | 'online_late';";
const idxType = s.indexOf(typeExport);
const afterType = idxType + typeExport.length;
const orphan = s.slice(afterType).trim();
const head = s.slice(0, idxType + typeExport.length);
const oldTail =
    '    async cacheAttendanceSettings(settings: any): Promise<void> {\n        await this.cacheConfig(KEY_ATTN_SETTINGS, settings);\n    }\n}\n\nexport const rfidOfflineService = new RFIDOfflineService();\n' +
    typeExport;
const newTail =
    '    async cacheAttendanceSettings(settings: any): Promise<void> {\n        await this.cacheConfig(KEY_ATTN_SETTINGS, settings);\n    }\n\n' +
    orphan +
    '\n}\n\nexport const rfidOfflineService = new RFIDOfflineService();\n' +
    typeExport;
if (!head.includes(oldTail)) {
    console.error('oldTail not in head');
    process.exit(1);
}
const rebuilt = head.replace(oldTail, newTail);
fs.writeFileSync(p, rebuilt);
console.log('ok');
