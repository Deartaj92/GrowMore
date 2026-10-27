const fs = require("fs");
const path = require("path");

const filePath = "d:/newGrowMore/src/data/mockData.ts";

const content = `/**
 * GrowMore Educational Multi-Tenant SMS
 * Notice: All mock data has been completely eliminated and superseded by live Supabase database tables.
 * This file exports empty typed arrays for backward-compatibility.
 */

import { School, AcademicSession, Campus, AcademicClass, Student, FeeTransaction } from "@/types";

export const MOCK_SCHOOLS: School[] = [];
export const MOCK_SESSIONS: AcademicSession[] = [];
export const MOCK_CAMPUSES: Campus[] = [];
export const MOCK_CLASSES: AcademicClass[] = [];
export const MOCK_STUDENTS: Student[] = [];
export const MOCK_TRANSACTIONS: FeeTransaction[] = [];
`;

fs.writeFileSync(filePath, content, "utf8");
console.log("Successfully emptied src/data/mockData.ts!");
