"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var fs = require('fs');
var path = require('path');
var Client = require('pg').Client;
console.log('--- Supabase Seed Script Starting ---');
var configPath = path.resolve(__dirname, '../supabase.config.json');
var config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
var client = new Client({
    connectionString: config.postgres_url,
    ssl: { rejectUnauthorized: false }
});
function seed() {
    return __awaiter(this, void 0, void 0, function () {
        var sessions, _i, sessions_1, s, res, err_1, classes, _a, classes_1, c, res, err_2, sessionRows, classRows, sections, _b, classRows_1, classRow, _c, sections_1, sectionName, res, err_3, err_4;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 24, 25, 27]);
                    return [4 /*yield*/, client.connect()];
                case 1:
                    _d.sent();
                    console.log('Connected to Supabase Postgres');
                    sessions = [
                        { name: '2022-2023', start_date: '2022-04-01', end_date: '2023-03-31', is_active: false },
                        { name: '2023-2024', start_date: '2023-04-01', end_date: '2024-03-31', is_active: true }
                    ];
                    _i = 0, sessions_1 = sessions;
                    _d.label = 2;
                case 2:
                    if (!(_i < sessions_1.length)) return [3 /*break*/, 7];
                    s = sessions_1[_i];
                    _d.label = 3;
                case 3:
                    _d.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, client.query("INSERT INTO sessions (name, start_date, end_date, is_active) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING RETURNING *", [s.name, s.start_date, s.end_date, s.is_active])];
                case 4:
                    res = _d.sent();
                    if (res.rowCount > 0) {
                        console.log('Inserted session:', s.name);
                    }
                    else {
                        console.log('Session already exists:', s.name);
                    }
                    return [3 /*break*/, 6];
                case 5:
                    err_1 = _d.sent();
                    console.error('Error inserting session:', s.name, err_1.message);
                    return [3 /*break*/, 6];
                case 6:
                    _i++;
                    return [3 /*break*/, 2];
                case 7:
                    classes = [
                        { name: 'Nursery', description: 'Nursery class' },
                        { name: '1st', description: 'First grade' },
                        { name: '2nd', description: 'Second grade' },
                        { name: '10th', description: 'Tenth grade' }
                    ];
                    _a = 0, classes_1 = classes;
                    _d.label = 8;
                case 8:
                    if (!(_a < classes_1.length)) return [3 /*break*/, 13];
                    c = classes_1[_a];
                    _d.label = 9;
                case 9:
                    _d.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, client.query("INSERT INTO classes (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING *", [c.name, c.description])];
                case 10:
                    res = _d.sent();
                    if (res.rowCount > 0) {
                        console.log('Inserted class:', c.name);
                    }
                    else {
                        console.log('Class already exists:', c.name);
                    }
                    return [3 /*break*/, 12];
                case 11:
                    err_2 = _d.sent();
                    console.error('Error inserting class:', c.name, err_2.message);
                    return [3 /*break*/, 12];
                case 12:
                    _a++;
                    return [3 /*break*/, 8];
                case 13: return [4 /*yield*/, client.query("SELECT id FROM sessions WHERE is_active = true LIMIT 1")];
                case 14:
                    sessionRows = (_d.sent()).rows;
                    return [4 /*yield*/, client.query("SELECT id, name FROM classes")];
                case 15:
                    classRows = (_d.sent()).rows;
                    sections = ['A', 'B', 'C'];
                    _b = 0, classRows_1 = classRows;
                    _d.label = 16;
                case 16:
                    if (!(_b < classRows_1.length)) return [3 /*break*/, 23];
                    classRow = classRows_1[_b];
                    _c = 0, sections_1 = sections;
                    _d.label = 17;
                case 17:
                    if (!(_c < sections_1.length)) return [3 /*break*/, 22];
                    sectionName = sections_1[_c];
                    _d.label = 18;
                case 18:
                    _d.trys.push([18, 20, , 21]);
                    return [4 /*yield*/, client.query("INSERT INTO sections (name, class_id, session_id) VALUES ($1, $2, $3) ON CONFLICT (name, class_id, session_id) DO NOTHING RETURNING *", [sectionName, classRow.id, sessionRows[0].id])];
                case 19:
                    res = _d.sent();
                    if (res.rowCount > 0) {
                        console.log("Inserted section ".concat(sectionName, " for class ").concat(classRow.name));
                    }
                    else {
                        console.log("Section ".concat(sectionName, " for class ").concat(classRow.name, " already exists"));
                    }
                    return [3 /*break*/, 21];
                case 20:
                    err_3 = _d.sent();
                    console.error("Error inserting section ".concat(sectionName, " for class ").concat(classRow.name, ":"), err_3.message);
                    return [3 /*break*/, 21];
                case 21:
                    _c++;
                    return [3 /*break*/, 17];
                case 22:
                    _b++;
                    return [3 /*break*/, 16];
                case 23:
                    console.log('Seeding complete!');
                    return [3 /*break*/, 27];
                case 24:
                    err_4 = _d.sent();
                    console.error('Seeding failed:', err_4);
                    return [3 /*break*/, 27];
                case 25: return [4 /*yield*/, client.end()];
                case 26:
                    _d.sent();
                    console.log('Connection closed.');
                    return [7 /*endfinally*/];
                case 27: return [2 /*return*/];
            }
        });
    });
}
seed();
