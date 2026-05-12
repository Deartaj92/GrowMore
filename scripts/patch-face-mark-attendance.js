const fs = require('fs');
const p = 'src/services/rfidOfflineService.ts';
let s = fs.readFileSync(p, 'utf8');
const startMarker = '            const resolvedPerson = person;';
const i = s.indexOf(startMarker);
const outerCatch = s.indexOf('        } catch (error) {\n            // Person lookup itself failed', i);
if (i < 0 || outerCatch < 0) {
    console.error('markers not found', i, outerCatch);
    process.exit(1);
}
const oldBlock = s.slice(i, outerCatch);
const newBlock = `            return await this.runAttendancePipelineAfterIdentification(
                person as RFIDMapping,
                schoolId,
                targetDate,
                cleanUID,
                platform,
            );

`;
let inner = oldBlock.replace(/^            const resolvedPerson = person;\s*\n/m, '');
inner = inner.replace(/const currentPerson = person as RFIDMapping;/g, 'const currentPerson = resolvedPerson;');
const methodLines = inner.split('\n').map((line) => {
    if (line.startsWith('            ')) return '        ' + line.slice(12);
    return line;
});
const methodBody = methodLines.join('\n');

const insertMethods = `
    private buildSyntheticFaceQueueUid(personId: number): string {
        let h = '';
        let x = (personId ^ 0x9e3779b9) >>> 0;
        for (let i = 0; i < 32; i++) {
            x = Math.imul(x, 1664525) + 1013904223;
            h += ((x >>> (i % 28)) & 15).toString(16).toUpperCase();
        }
        return h;
    }

    private async runAttendancePipelineAfterIdentification(
        resolvedPerson: RFIDMapping,
        schoolId: number,
        targetDate: string | undefined,
        cleanUID: string,
        platform: RuntimePlatform,
    ): Promise<{ success: boolean; person: RFIDMapping | null; type: MarkResultType; attendance_status?: string; recorded_time?: string }> {
${methodBody}
    }

    async markAttendanceWithPerson(
        person: RFIDMapping,
        schoolId: number,
        targetDate?: string,
    ): Promise<{ success: boolean; person: RFIDMapping | null; type: MarkResultType; attendance_status?: string; recorded_time?: string }> {
        const platform = this.getRuntimePlatform();
        let cleanUID = sanitizeRfidUid(person.rfid_uid);
        if (cleanUID.length < 4) {
            cleanUID = this.buildSyntheticFaceQueueUid(person.person_id);
        }
        return this.runAttendancePipelineAfterIdentification(person, schoolId, targetDate, cleanUID, platform);
    }

`;

const insertPoint = s.indexOf('    async getAllMappings(): Promise<RFIDMapping[]> {');
if (insertPoint < 0) {
    console.error('getAllMappings not found');
    process.exit(1);
}
s = s.slice(0, i) + newBlock + s.slice(outerCatch);
s = s.slice(0, insertPoint) + insertMethods + s.slice(insertPoint);
fs.writeFileSync(p, s);
console.log('patched');
