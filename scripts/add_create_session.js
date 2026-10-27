const fs = require("fs");
const path = require("path");

const filePath = "d:/newGrowMore/src/services/schoolService.ts";
let code = fs.readFileSync(filePath, "utf8");

if (!code.includes("createSessionInSupabase")) {
  const newFunc = `
// 12. Persist New Academic Session
export async function createSessionInSupabase(session: AcademicSession): Promise<{ success: boolean; data?: AcademicSession; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("academic_sessions")
      .insert({
        school_id: session.schoolId,
        name: session.name,
        start_date: session.startDate,
        end_date: session.endDate,
        status: session.status,
        is_enrollment_open: session.isEnrollmentOpen,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: mapDbSessionToSession(data) };
  } catch (err: any) {
    console.error("createSessionInSupabase error:", err);
    return { success: false, error: err.message };
  }
}
`;
  code += newFunc;
  fs.writeFileSync(filePath, code, "utf8");
  console.log("Added createSessionInSupabase to schoolService.ts!");
}
