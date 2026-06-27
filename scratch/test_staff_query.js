const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dgtlbtpqhwizbgvienqb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndGxidHBxaHdpemJndmllbnFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjMzMjk1NSwiZXhwIjoyMDYxOTA4OTU1fQ.TR2L4HT9_ThE1feKHaEdN64fugr9TAYckqNRsxIMZdk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, name, rfid_uid, qr_uid, attendance_mode, status, face_embedding')
      .limit(10);

    if (staffError) throw staffError;

    console.log('\n--- Staff Members ---');
    console.log(staff.map(s => ({
      id: s.id,
      name: s.name,
      rfid_uid: s.rfid_uid,
      qr_uid: s.qr_uid,
      attendance_mode: s.attendance_mode,
      status: s.status,
      has_face: s.face_embedding ? 'Yes' : 'No'
    })));

    const today = new Date().toISOString().slice(0, 10);
    const { data: attn, error: attnError } = await supabase
      .from('staff_attendance_records')
      .select('*')
      .eq('date', today)
      .limit(10);

    if (attnError) throw attnError;

    console.log('\n--- Today Staff Attendance ---');
    console.log(attn);

  } catch (err) {
    console.error(err);
  }
}

run();
