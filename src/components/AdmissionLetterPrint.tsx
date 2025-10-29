import React, { useEffect, useState } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { supabase } from '../supabaseClient';
import { AccountCircle } from '@mui/icons-material';

const PrintGlobal = createGlobalStyle`
  @media print {
    @page {
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
      box-shadow: none !important;
    }
  }
`;

const PrintPage = styled.div`
  width: 210mm;
  min-height: 297mm;
  background: #fff;
  color: #232a3b;
  font-family: 'Segoe UI', Arial, sans-serif;
  box-sizing: border-box;
  padding: 8mm 12mm 8mm 12mm;
  margin: 0 auto;
  font-size: 12px;
  @media print {
    box-shadow: none;
    margin: 0;
    padding: 8mm 12mm 8mm 12mm;
    font-size: 11px;
  }
`;
const Header = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 10px 0 0 0;
  border-bottom: 1.5px solid #e0e7ef;
  margin-bottom: 10px;
  gap: 32px;
  margin-top: 0;
`;
const SchoolLogo = styled.img`
  width: 70px;
  height: 70px;
  object-fit: contain;
  border-radius: 14px;
  background: #f3f4f8;
  margin-bottom: 0;
  display: block;
`;
const SchoolDetails = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
`;
const SchoolName = styled.h2`
  font-size: 1.25rem;
  font-weight: 800;
  color: #6366f1;
  margin: 0 0 2px 0;
`;
const SchoolTag = styled.div`
  font-size: 1.05rem;
  color: #888;
  font-weight: 500;
  margin-bottom: 2px;
`;
const SchoolContact = styled.div`
  font-size: 1.01rem;
  color: #444;
  font-weight: 500;
  margin-bottom: 2px;
`;
const LetterTitle = styled.h3`
  text-align: center;
  font-size: 1.08rem;
  font-weight: 800;
  margin: 18px 0 10px 0;
  color: #232a3b;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e0e7ef;
  padding-bottom: 5px;
`;
const TopRow = styled.div`
  display: grid;
  grid-template-columns: 110px 1fr 1fr 1fr 1fr;
  gap: 0 10px;
  align-items: center;
  margin-bottom: 8px;
  min-height: 110px;
  @media (max-width: 700px) {
    grid-template-columns: 80px 1fr 1fr;
    gap: 6px 6px;
    min-height: 80px;
  }
`;
const Avatar = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #f3f4f8;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin: 0 auto;
  grid-row: 1 / span 4;
`;
const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;
const TopCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 2px;
  justify-content: center;
`;
const Label = styled.div`
  color: #888;
  font-weight: 600;
  font-size: 0.93em;
`;
const Value = styled.div`
  color: #232a3b;
  font-weight: 700;
  font-size: 1em;
`;
const Name = styled.h2`
  font-size: 1.1rem;
  font-weight: 800;
  color: #232a3b;
  margin: 0 0 2px 0;
  text-align: center;
`;
const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px 10px;
  margin: 10px 0 0 0;
  font-size: 0.95em;
  @media (max-width: 700px) {
    grid-template-columns: 1fr 1fr;
    gap: 6px 6px;
  }
`;
const InfoCell = styled.div`
  margin-bottom: 0px;
`;
const SectionTitle = styled.div`
  font-weight: 700;
  color: #6366f1;
  margin: 10px 0 4px 0;
  font-size: 1em;
  text-align: left;
  width: 100%;
  border-bottom: 1px solid #e0e7ef;
  padding-bottom: 3px;
`;
const RulesBox = styled.div`
  background: #f3f4f8;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.93em;
  color: #444;
  margin-top: 10px;
`;
const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
  font-size: 0.95em;
  color: #888;
`;
const PrintButton = styled.button`
  background: #f87171;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 8px 18px;
  font-size: 0.98rem;
  font-weight: 700;
  margin: 16px auto 0 auto;
  box-shadow: 0 2px 8px #6366f122;
  cursor: pointer;
  transition: background 0.18s;
  display: block;
  &:hover {
    background: #ef4444;
  }
  @media print {
    display: none;
  }
`;

const defaultProfile = {
  logo_url: '',
  name: 'Your School Name',
  tagline: '',
  phone: '',
  website: '',
  address: '',
  country: '',
};

const AdmissionLetterPrint = ({ student, onClose }: { student: any, onClose: () => void }) => {
  const [profile, setProfile] = useState<any>(defaultProfile);
  useEffect(() => {
    supabase.from('institute_profile').select('*').single().then(({ data }) => {
      if (data) setProfile(data);
    });
  }, []);

  const handlePrint = () => {
    window.print();
    if (onClose) onClose();
  };

  return (
    <>
      <PrintGlobal />
      <PrintPage id="print-page">
        <Header>
          {profile.logo_url && <SchoolLogo src={profile.logo_url} alt="School Logo" />}
          <SchoolDetails>
            <SchoolName>{profile.name}</SchoolName>
            {profile.tagline && <SchoolTag>{profile.tagline}</SchoolTag>}
            <SchoolContact>
              {profile.address && <div>{profile.address}</div>}
              {profile.phone && <span>+{profile.phone} </span>}
              {profile.website && <span> | {profile.website}</span>}
            </SchoolContact>
          </SchoolDetails>
        </Header>
        <LetterTitle>Admission Letter</LetterTitle>
        <TopRow>
          <Avatar>
            {student.picture_url ? (
              <AvatarImg src={student.picture_url} alt={student.name} />
            ) : (
              <AccountCircle style={{ fontSize: 70, color: '#6366f1' }} />
            )}
          </Avatar>
          <TopCell>
            <Label>Admission ID</Label>
            <Value>{student.id || '-'}</Value>
          </TopCell>
          <TopCell>
            <Label>Date of Birth</Label>
            <Value>{student.dob || '-'}</Value>
          </TopCell>
          <TopCell>
            <Label>Date of Admission</Label>
            <Value>{student.admission_date || student.created_at || '-'}</Value>
          </TopCell>
          <TopCell>
            <Label>Student Birth Form ID / NIC</Label>
            <Value>{student.form_b || '-'}</Value>
          </TopCell>
          <TopCell>
            <Label>Discount in Fee</Label>
            <Value>{student.discount_in_fee || '0%'}</Value>
          </TopCell>
          <TopCell>
            <Label>Student Name</Label>
            <Value>{student.name || '-'}</Value>
          </TopCell>
          <TopCell>
            <Label>Gender</Label>
            <Value>{student.gender || '-'}</Value>
          </TopCell>
          <TopCell>
            <Label>Religion</Label>
            <Value>{student.religion || '-'}</Value>
          </TopCell>
          <TopCell>
            <Label>Class</Label>
            <Value>{student.classes?.name || '-'}</Value>
          </TopCell>
          <TopCell>
            <Label>Section</Label>
            <Value>{student.sections?.name || '-'}</Value>
          </TopCell>
          <TopCell>
            <Label>Nationality</Label>
            <Value>{student.nationality || '-'}</Value>
          </TopCell>
        </TopRow>
        <Name style={{margin:'8px 0 0 0', textAlign:'center'}}>{student.name}</Name>
        <SectionTitle>Address</SectionTitle>
        <Value>{student.address || '-'}</Value>
        <SectionTitle>Other Details</SectionTitle>
        <SectionGrid>
          <InfoCell>
            <Label>Any Identification Mark?</Label>
            <Value>{student.id_mark || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Blood Group</Label>
            <Value>{student.blood_group || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Disease If Any?</Label>
            <Value>{student.disease || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Cast</Label>
            <Value>{student.cast || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Orphan Student</Label>
            <Value>{student.orphan || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>OSC</Label>
            <Value>{student.osc || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Previous School</Label>
            <Value>{student.previous_school || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Previous ID / Board Roll No</Label>
            <Value>{student.previous_id || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Total Siblings</Label>
            <Value>{student.total_siblings || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Mobile No</Label>
            <Value>{student.phone || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Additional Note</Label>
            <Value>{student.additional_note || '-'}</Value>
          </InfoCell>
        </SectionGrid>
        <SectionTitle>Father / Guardian & Mother Details</SectionTitle>
        <SectionGrid>
          <InfoCell>
            <Label>Father/Guardian Name</Label>
            <Value>{student.father_name || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Father/Guardian National ID</Label>
            <Value>{student.father_national_id || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Father/Guardian Education</Label>
            <Value>{student.father_education || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Father/Guardian Mobile No</Label>
            <Value>{student.father_mobile || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Father/Guardian Occupation</Label>
            <Value>{student.father_occupation || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Father/Guardian Profession</Label>
            <Value>{student.father_profession || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Father/Guardian Income</Label>
            <Value>{student.father_income || '-'}</Value>
          </InfoCell>
          <InfoCell style={{gridColumn: '1 / -1', height: 0, padding: 0, margin: 0}} />
          <InfoCell>
            <Label>Mother Name</Label>
            <Value>{student.mother_name || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Mother National ID</Label>
            <Value>{student.mother_national_id || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Mother Education</Label>
            <Value>{student.mother_education || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Mother Mobile No</Label>
            <Value>{student.mother_mobile || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Mother Occupation</Label>
            <Value>{student.mother_occupation || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Mother Profession</Label>
            <Value>{student.mother_profession || '-'}</Value>
          </InfoCell>
          <InfoCell>
            <Label>Mother Income</Label>
            <Value>{student.mother_income || '-'}</Value>
          </InfoCell>
        </SectionGrid>
        <RulesBox>
          <b>Rules And Regulations:</b><br />
          The school rules have been established in partnership with the community over a long period of time. They reflect the school community's expectations in terms of acceptable standards of behaviour, dress and personal presentation in the widest sense. Students are expected to follow the school rules at all times when on the school grounds, representing the school, attending a school activity or when clearly associated with the school i.e. when wearing school uniform.<br /><br />
          Students have the responsibility:<br />
          - To attend school regularly<br />
          - To respect the right of others to learn<br />
          - To respect their peers and teachers regardless of ethnicity, religion or gender<br />
          - To respect the property and equipment of the school and others<br />
          - To carry out reasonable instructions to the best of their ability<br />
          - To conduct themselves in a courteous and appropriate manner in school and in public<br />
          - To keep the school environment and the local community free from litter<br />
          - To observe the uniform code of the school<br />
          - To read all school notices and bring them to their parents'/guardians' attention
        </RulesBox>
        <Footer>
          <div>Signature of Authority: ____________________</div>
          <div>Institute Stamp: ____________________</div>
        </Footer>
        <PrintButton onClick={handlePrint}>Print Admission Letter</PrintButton>
      </PrintPage>
    </>
  );
};

export default AdmissionLetterPrint; 