import styled, { useTheme } from 'styled-components';
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const PageGrid = styled.div`
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  width: 100vw;
  max-width: 100vw;
  box-sizing: border-box;
  overflow-x: auto;
  @media (max-width: 900px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.1rem;
`;

const Heading = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: ${({ theme }) => theme.ACCENT};
  margin: 0;
  text-align: left;
`;

const TopRightDropdown = styled.div`
  margin-left: 1.5rem;
  display: flex;
  align-items: center;
`;

const LeftSection = styled.div`
  flex: 0 0 420px;
  max-width: 420px;
  min-width: 320px;
  @media (max-width: 900px) {
    flex: 1 1 100%;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    margin: 0;
  }
`;

const RightSection = styled.div`
  flex: 2 1 0;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const FormCard = styled.form`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  box-shadow: 0 6px 32px rgba(0,0,0,0.18), 0 1.5px 6px rgba(0,0,0,0.10);
  border-radius: 14px;
  padding: 1.5rem 1.5rem 1.2rem 1.5rem;
  margin-bottom: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  width: 100%;
  align-items: stretch;
`;

const FineCard = styled.div`
  background: ${({ theme }) => theme.BG === '#252525' ? '#2a2a2a' : theme.CARD};
  border-radius: 14px;
  box-shadow: 0 6px 32px rgba(0,0,0,0.22), 0 1.5px 6px rgba(0,0,0,0.10);
  padding: 1.2rem 1.2rem 1rem 1.2rem;
  display: flex;
  flex-direction: column;
  position: relative;
  border: 1px solid ${({ theme }) => theme.BORDER};
  transition: border-color 0.18s;
  &:hover {
    border-color: #6366f1;
  }
`;

const FineCardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.7rem;
`;

const FineCardClass = styled.div`
  font-size: 1.3rem;
  font-weight: 800;
  color: #6366f1;
  margin-bottom: 0;
`;

const FineCardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const FineCardLabel = styled.div`
  font-size: 0.97rem;
  color: #aaa;
`;

const FineAmount = styled.div`
  font-size: 1.5rem;
  font-weight: 800;
  color: #a78bfa;
  margin-bottom: 0.3rem;
`;

const Container = styled.div`
  width: 100vw;
  max-width: 100vw;
  margin: 0 auto;
  padding: 1.5rem 1rem;
  box-sizing: border-box;
  @media (max-width: 768px) {
    padding: 1rem 0.5rem;
  }
`;

const AdmissionForm: React.FC = () => {
  console.log('AdmissionForm component rendered');
  const theme = useTheme();
  const [form, setForm] = useState({
    name: '',
    registration_no: '',
    class: '',
    admission_date: '',
    discount_in_fee: '',
    mobile: '',
    picture: null as string | null,
    pictureFile: null as File | null,
    dob: '',
    student_id: '',
    gender: '',
    cast: '',
    orphan: '',
    osc: '',
    id_mark: '',
    blood_group: '',
    previous_school: '',
    previous_id: '',
    religion: '',
    family: '',
    disease: '',
    additional_note: '',
    total_siblings: '',
    address: '',
    father_name: '',
    father_national_id: '',
    father_education: '',
    father_mobile: '',
    father_occupation: '',
    father_profession: '',
    father_income: '',
    mother_name: '',
    mother_national_id: '',
    mother_education: '',
    mother_mobile: '',
    mother_occupation: '',
    mother_profession: '',
    mother_income: '',
  });
  const [classOptions, setClassOptions] = useState<any[]>([]);
  const [sectionOptions, setSectionOptions] = useState<any[]>([]);
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [classIdWarning, setClassIdWarning] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      setLoadingClasses(true);
      const { data, error } = await supabase.from('classes').select('id, name');
      setLoadingClasses(false);
      if (error) {
        console.error('Error fetching classes:', error);
      }
      console.log('Fetched classes:', data);
      if (data && data.length > 0 && typeof data[0].id === 'string' && data[0].id.match(/\d(th|st|nd|rd)$/i)) {
        setClassIdWarning('Class id looks like a class name, not a UUID/number. This will cause section fetch to fail!');
        console.warn('Class id looks like a class name, not a UUID/number. This will cause section fetch to fail!');
      } else {
        setClassIdWarning('');
      }
      setClassOptions(data || []);
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (!classFilter) {
      setSectionOptions([]);
      setSectionFilter('');
      return;
    }
    // Debug: log classFilter value and type
    console.log('Fetching sections for classFilter:', classFilter, 'type:', typeof classFilter);
    if (typeof classFilter !== 'string' || !classFilter.trim()) {
      setSectionOptions([]);
      setSectionFilter('');
      return;
    }
    const fetchSections = async () => {
      setLoadingSections(true);
      const { data, error } = await supabase
        .from('sections')
        .select('id, name')
        .eq('class_id', classFilter);
      setLoadingSections(false);
      if (error) {
        console.error('Error fetching sections:', error);
      }
      setSectionOptions(data || []);
    };
    fetchSections();
    setSectionFilter('');
  }, [classFilter]);

  const uploadPicture = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `student_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from('student-pictures')
      .upload(fileName, file, { upsert: true });
    if (error) throw error;
    const { publicUrl } = supabase.storage.from('student-pictures').getPublicUrl(fileName).data;
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // ...validation...
    let pictureUrl = form.picture;
    try {
      if (form.pictureFile) {
        pictureUrl = await uploadPicture(form.pictureFile);
      }
      const insertObj = {
        name: form.name,
        registration_no: form.registration_no,
        class_id: form.class,
        admission_date: form.admission_date,
        discount_in_fee: form.discount_in_fee,
        phone: form.mobile,
        picture_url: pictureUrl,
        dob: form.dob,
        form_b: form.student_id,
        gender: form.gender,
        cast: form.cast,
        orphan: form.orphan,
        osc: form.osc,
        id_mark: form.id_mark,
        blood_group: form.blood_group,
        previous_school: form.previous_school,
        previous_id: form.previous_id,
        religion: form.religion,
        family: form.family,
        disease: form.disease,
        additional_note: form.additional_note,
        total_siblings: form.total_siblings,
        address: form.address,
        father_name: form.father_name,
        father_national_id: form.father_national_id,
        father_education: form.father_education,
        father_mobile: form.father_mobile,
        father_occupation: form.father_occupation,
        father_profession: form.father_profession,
        father_income: form.father_income,
        mother_name: form.mother_name,
        mother_national_id: form.mother_national_id,
        mother_education: form.mother_education,
        mother_mobile: form.mother_mobile,
        mother_occupation: form.mother_occupation,
        mother_profession: form.mother_profession,
        mother_income: form.mother_income,
      };
      const { error } = await supabase.from('students').insert([insertObj]);
      if (error) throw error;
      // ...show toast, reset form, etc...
    } catch (err) {
      // ...show error toast...
    }
  };

  return (
    <Container>
      <div style={{ background: 'red', color: 'white', fontWeight: 900, fontSize: 24, padding: 20, textAlign: 'center' }}>
        DEBUG: This is AdmissionForm.tsx
      </div>
      <HeaderRow>
        <Heading>Admission Form</Heading>
        <TopRightDropdown>
          {/* Add any filter dropdown if needed */}
        </TopRightDropdown>
      </HeaderRow>
      <PageGrid>
        <LeftSection>
          {classIdWarning && (
            <div style={{ background: '#fbbf24', color: '#222', padding: '10px', borderRadius: '8px', marginBottom: '1rem', fontWeight: 700 }}>
              ⚠️ {classIdWarning}
            </div>
          )}
          <FormCard onSubmit={handleSubmit}>
            {/* 1 Student Information */}
            <div style={{ fontWeight: 700, fontSize: '1.18rem', margin: '18px 0 8px 0', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '1.3em', marginRight: 8 }}>①</span> Student Information
            </div>
            <hr style={{ margin: '0 0 18px 0', border: 0, borderTop: '1.5px solid #e5e7eb' }} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Student Name*</label>
            <input type="text" placeholder="Name of Student" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Registration No</label>
            <input type="text" placeholder="Registration No" value={form.registration_no} onChange={e => setForm({ ...form, registration_no: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Select Class*</label>
            <select value={form.class} onChange={e => setForm({ ...form, class: e.target.value })}>
              <option value="">Select Class</option>
              {classOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Date of Admission*</label>
            <input type="date" value={form.admission_date} onChange={e => setForm({ ...form, admission_date: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Discount in Fee*</label>
            <input type="text" placeholder="In %" value={form.discount_in_fee} onChange={e => setForm({ ...form, discount_in_fee: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Mobile No. for SMS/WhatsApp</label>
            <input type="text" placeholder="e.g +44xxxxxxxxxx" value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Picture - Optional</label>
            <input type="file" onChange={e => { if (e.target.files && e.target.files.length > 0) setForm({ ...form, pictureFile: e.target.files[0] }); }} />
            <div style={{ color: '#bfa600', fontWeight: 600, fontSize: '0.98em', marginBottom: 8 }}>Max size 100KB</div>

            {/* 2 Other Information */}
            <div style={{ fontWeight: 700, fontSize: '1.18rem', margin: '28px 0 8px 0', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '1.3em', marginRight: 8 }}>②</span> Other Information
            </div>
            <hr style={{ margin: '0 0 18px 0', border: 0, borderTop: '1.5px solid #e5e7eb' }} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Date Of Birth</label>
            <input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Student Birth Form ID / NIC</label>
            <input type="text" placeholder="Student Birth Form ID / NIC" value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Gender</label>
            <input type="text" placeholder="Gender" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Cast</label>
            <input type="text" placeholder="Cast" value={form.cast} onChange={e => setForm({ ...form, cast: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Orphan Student</label>
            <input type="text" placeholder="Select" value={form.orphan} onChange={e => setForm({ ...form, orphan: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>OSC</label>
            <input type="text" placeholder="Select" value={form.osc} onChange={e => setForm({ ...form, osc: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Any Identification Mark?</label>
            <input type="text" placeholder="Any Identification Mark?" value={form.id_mark} onChange={e => setForm({ ...form, id_mark: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Blood Group</label>
            <input type="text" placeholder="Blood Group" value={form.blood_group} onChange={e => setForm({ ...form, blood_group: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Previous School</label>
            <input type="text" placeholder="Previous School" value={form.previous_school} onChange={e => setForm({ ...form, previous_school: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Previous ID / Board Roll No</label>
            <input type="text" placeholder="Previous ID / Board Roll No" value={form.previous_id} onChange={e => setForm({ ...form, previous_id: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Religion</label>
            <input type="text" placeholder="Religion" value={form.religion} onChange={e => setForm({ ...form, religion: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Select Family</label>
            <input type="text" placeholder="Select" value={form.family} onChange={e => setForm({ ...form, family: e.target.value })} />

            {/* Siblings, Disease, Additional Note, Address */}
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Total Siblings</label>
            <input type="text" placeholder="Total Siblings" value={form.total_siblings} onChange={e => setForm({ ...form, total_siblings: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Disease If Any?</label>
            <input type="text" placeholder="Disease If Any?" value={form.disease} onChange={e => setForm({ ...form, disease: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Any Additional Note</label>
            <input type="text" placeholder="Any Additional Note" value={form.additional_note} onChange={e => setForm({ ...form, additional_note: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Address</label>
            <input type="text" placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />

            {/* 3 Father/Guardian Information */}
            <div style={{ fontWeight: 700, fontSize: '1.18rem', margin: '28px 0 8px 0', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '1.3em', marginRight: 8 }}>③</span> Father/Guardien Information
            </div>
            <hr style={{ margin: '0 0 18px 0', border: 0, borderTop: '1.5px solid #e5e7eb' }} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Father Name</label>
            <input type="text" placeholder="Father Name" value={form.father_name} onChange={e => setForm({ ...form, father_name: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Father National ID</label>
            <input type="text" placeholder="Father National ID" value={form.father_national_id} onChange={e => setForm({ ...form, father_national_id: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Education</label>
            <input type="text" placeholder="Education" value={form.father_education} onChange={e => setForm({ ...form, father_education: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Mobile No</label>
            <input type="text" placeholder="Mobile No" value={form.father_mobile} onChange={e => setForm({ ...form, father_mobile: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Occupation</label>
            <input type="text" placeholder="Occupation" value={form.father_occupation} onChange={e => setForm({ ...form, father_occupation: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Profession</label>
            <input type="text" placeholder="Profession" value={form.father_profession} onChange={e => setForm({ ...form, father_profession: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Income</label>
            <input type="text" placeholder="Income" value={form.father_income} onChange={e => setForm({ ...form, father_income: e.target.value })} />

            {/* 4 Mother Information */}
            <div style={{ fontWeight: 700, fontSize: '1.18rem', margin: '28px 0 8px 0', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '1.3em', marginRight: 8 }}>④</span> Mother Information
            </div>
            <hr style={{ margin: '0 0 18px 0', border: 0, borderTop: '1.5px solid #e5e7eb' }} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Mother Name</label>
            <input type="text" placeholder="Mother Name" value={form.mother_name} onChange={e => setForm({ ...form, mother_name: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Mother National ID</label>
            <input type="text" placeholder="Mother National ID" value={form.mother_national_id} onChange={e => setForm({ ...form, mother_national_id: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Education</label>
            <input type="text" placeholder="Education" value={form.mother_education} onChange={e => setForm({ ...form, mother_education: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Mobile No</label>
            <input type="text" placeholder="Mobile No" value={form.mother_mobile} onChange={e => setForm({ ...form, mother_mobile: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Occupation</label>
            <input type="text" placeholder="Occupation" value={form.mother_occupation} onChange={e => setForm({ ...form, mother_occupation: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Profession</label>
            <input type="text" placeholder="Profession" value={form.mother_profession} onChange={e => setForm({ ...form, mother_profession: e.target.value })} />
            <label style={{ fontWeight: 600, color: '#888', marginBottom: 2 }}>Income</label>
            <input type="text" placeholder="Income" value={form.mother_income} onChange={e => setForm({ ...form, mother_income: e.target.value })} />

            <button type="submit" style={{ marginTop: 24, fontWeight: 700, fontSize: '1.1em' }}>Submit</button>
          </FormCard>
        </LeftSection>
        <RightSection>
          <FineCard>
            <FineCardTop>
              <FineCardClass>Preview</FineCardClass>
            </FineCardTop>
            <FineCardBody>
              <>
                <FineCardLabel>Name: {form.name}</FineCardLabel>
                <FineCardLabel>Registration No: {form.registration_no}</FineCardLabel>
                <FineCardLabel>Class: {classOptions.find(c => c.id === form.class)?.name || '-'}</FineCardLabel>
                <FineCardLabel>Admission Date: {form.admission_date}</FineCardLabel>
                <FineCardLabel>Discount in Fee: {form.discount_in_fee}</FineCardLabel>
                <FineCardLabel>Mobile: {form.mobile}</FineCardLabel>
                <FineCardLabel>Date of Birth: {form.dob}</FineCardLabel>
                <FineCardLabel>Student ID: {form.student_id}</FineCardLabel>
                <FineCardLabel>Gender: {form.gender}</FineCardLabel>
                <FineCardLabel>Cast: {form.cast}</FineCardLabel>
                <FineCardLabel>Orphan: {form.orphan}</FineCardLabel>
                <FineCardLabel>OSC: {form.osc}</FineCardLabel>
                <FineCardLabel>ID Mark: {form.id_mark}</FineCardLabel>
                <FineCardLabel>Blood Group: {form.blood_group}</FineCardLabel>
                <FineCardLabel>Previous School: {form.previous_school}</FineCardLabel>
                <FineCardLabel>Previous ID: {form.previous_id}</FineCardLabel>
                <FineCardLabel>Religion: {form.religion}</FineCardLabel>
                <FineCardLabel>Family: {form.family}</FineCardLabel>
                <FineCardLabel>Disease: {form.disease}</FineCardLabel>
                <FineCardLabel>Additional Note: {form.additional_note}</FineCardLabel>
                <FineCardLabel>Total Siblings: {form.total_siblings}</FineCardLabel>
                <FineCardLabel>Address: {form.address}</FineCardLabel>
                <FineCardLabel>Father Name: {form.father_name}</FineCardLabel>
                <FineCardLabel>Father National ID: {form.father_national_id}</FineCardLabel>
                <FineCardLabel>Father Education: {form.father_education}</FineCardLabel>
                <FineCardLabel>Father Mobile: {form.father_mobile}</FineCardLabel>
                <FineCardLabel>Father Occupation: {form.father_occupation}</FineCardLabel>
                <FineCardLabel>Father Profession: {form.father_profession}</FineCardLabel>
                <FineCardLabel>Father Income: {form.father_income}</FineCardLabel>
                <FineCardLabel>Mother Name: {form.mother_name}</FineCardLabel>
                <FineCardLabel>Mother National ID: {form.mother_national_id}</FineCardLabel>
                <FineCardLabel>Mother Education: {form.mother_education}</FineCardLabel>
                <FineCardLabel>Mother Mobile: {form.mother_mobile}</FineCardLabel>
                <FineCardLabel>Mother Occupation: {form.mother_occupation}</FineCardLabel>
                <FineCardLabel>Mother Profession: {form.mother_profession}</FineCardLabel>
                <FineCardLabel>Mother Income: {form.mother_income}</FineCardLabel>
                <FineCardLabel>Picture URL: {form.picture}</FineCardLabel>
              </>
            </FineCardBody>
          </FineCard>
        </RightSection>
      </PageGrid>
    </Container>
  );
};

export default AdmissionForm; 