import { supabase } from '../supabaseClient';

// Pakistani first names (male and female)
const firstNames = [
  'Ahmed', 'Ali', 'Usman', 'Hassan', 'Hamza', 'Muhammad', 'Ibrahim', 'Zain', 'Omar', 'Yusuf',
  'Fatima', 'Ayesha', 'Sana', 'Zainab', 'Maryam', 'Hafsa', 'Amina', 'Sara', 'Layla', 'Noor',
  'Abdullah', 'Bilal', 'Fahad', 'Imran', 'Junaid', 'Khalid', 'Mansoor', 'Nadeem', 'Qasim', 'Rashid',
  'Aisha', 'Bushra', 'Dua', 'Eman', 'Farah', 'Ghazala', 'Hina', 'Iqra', 'Javeria', 'Khadija',
  'Mahmood', 'Naeem', 'Obaid', 'Parvez', 'Qaiser', 'Rizwan', 'Sajid', 'Tahir', 'Umar', 'Vaqar',
  'Maham', 'Nadia', 'Omaima', 'Palwasha', 'Quratulain', 'Rabia', 'Sadia', 'Tahira', 'Uzma', 'Varda'
];

// Pakistani last names
const lastNames = [
  'Khan', 'Ali', 'Hussain', 'Raza', 'Abbas', 'Hassan', 'Malik', 'Qureshi', 'Shah', 'Butt',
  'Chaudhry', 'Sheikh', 'Rizvi', 'Zaidi', 'Hashmi', 'Jafri', 'Naqvi', 'Rashid', 'Siddiqui', 'Mirza',
  'Ahmad', 'Bashir', 'Chishti', 'Daud', 'Ehsan', 'Farooq', 'Ghani', 'Hameed', 'Iqbal', 'Javed',
  'Kashif', 'Latif', 'Mahmood', 'Nawaz', 'Omar', 'Pervaiz', 'Qadir', 'Rafiq', 'Saleem', 'Tariq',
  'Usman', 'Viqar', 'Waqar', 'Yasir', 'Zahid', 'Aamir', 'Babar', 'Danish', 'Faisal', 'Gulzar'
];

// Pakistani cities and areas
const cities = [
  { city: 'Karachi', areas: ['Gulshan-e-Iqbal', 'Defence', 'Clifton', 'North Nazimabad', 'Gulistan-e-Jauhar', 'Malir', 'Korangi', 'Landhi'] },
  { city: 'Lahore', areas: ['Gulberg', 'DHA', 'Model Town', 'Johar Town', 'Wapda Town', 'Cantt', 'Anarkali', 'Shahdara'] },
  { city: 'Islamabad', areas: ['F-8', 'F-10', 'E-11', 'DHA Phase 2', 'Bahria Town', 'G-9', 'I-8', 'H-12'] },
  { city: 'Rawalpindi', areas: ['Saddar', 'Westridge', 'Bahria Town', 'DHA', 'Chaklala', 'Peshawar Road', 'Murree Road', 'Raja Bazar'] },
  { city: 'Faisalabad', areas: ['D Ground', 'Madina Town', 'Gulberg', 'Peoples Colony', 'Satiana Road', 'Jaranwala Road', 'Samundri Road', 'Lyallpur Town'] },
  { city: 'Multan', areas: ['Gulgasht', 'Bosan Road', 'Shah Rukn-e-Alam', 'Ghanta Ghar', 'Haram Gate', 'Pak Gate', 'Delhi Gate', 'Daulat Gate'] },
  { city: 'Peshawar', areas: ['Hayatabad', 'University Town', 'Cantt', 'Sadar', 'Gulbahar', 'Charsadda Road', 'Ring Road', 'Kohat Road'] },
  { city: 'Quetta', areas: ['Jinnah Town', 'Samungli Road', 'Sariab Road', 'Brewery Road', 'Hanna Valley', 'Koh-e-Murdar', 'Spinny Road', 'Airport Road'] }
];

// Additional data
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];
const religions = ['Muslim', 'Christianity', 'Hinduism', 'Sikhism', 'Other'];
const nationalities = ['Pakistani', 'Indian', 'Afghan', 'Bangladeshi', 'Other'];
const occupations = ['Business', 'Government Job', 'Private Job', 'Self Employed', 'Teacher', 'Doctor', 'Engineer', 'Lawyer', 'Accountant', 'Sales', 'Driver', 'Laborer', 'Farmer', 'Shopkeeper', 'Carpenter', 'Electrician', 'Plumber', 'Painter', 'Welder', 'Mechanic'];
const educations = ['Primary', 'Middle', 'Matric', 'Intermediate', 'Bachelor', 'Master', 'PhD', 'Other'];
const casts = ['Arain', 'Jutt', 'Rajput', 'Gujjar', 'Syed', 'Mughal', 'Pathan', 'Baloch', 'Sindhi', 'Punjabi', 'Other'];
const diseases = ['None', 'Diabetes', 'Asthma', 'Hypertension', 'Heart Disease', 'Kidney Disease', 'Liver Disease', 'Cancer', 'Other'];
const idMarks = ['None', 'Birth Mark on Face', 'Birth Mark on Arm', 'Birth Mark on Leg', 'Scar on Face', 'Scar on Arm', 'Scar on Leg', 'Mole on Face', 'Mole on Arm', 'Mole on Leg', 'Other'];

// Configuration
const SCHOOL_ID = 2;
const SESSION_ID = 4;
const USER_ID = 1;

// Class and section mapping
const classSectionMap = [
  { classId: 10, sectionIds: [4, 5] },
  { classId: 11, sectionIds: [6, 7] },
  { classId: 12, sectionIds: [8, 9] }
];

// Generate random date between 2005 and 2015 for DOB
const getRandomDOB = () => {
  const start = new Date(2005, 0, 1);
  const end = new Date(2015, 11, 31);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Generate random admission date between 2020 and 2024
const getRandomAdmissionDate = () => {
  const start = new Date(2020, 0, 1);
  const end = new Date(2024, 11, 31);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Generate random phone number
const getRandomPhone = () => {
  const prefixes = ['0300', '0301', '0302', '0303', '0304', '0305', '0306', '0307', '0308', '0309', '0310', '0311', '0312', '0313', '0314', '0315', '0316', '0317', '0318', '0319', '0320', '0321', '0322', '0323', '0324', '0325', '0326', '0327', '0328', '0329', '0330', '0331', '0332', '0333', '0334', '0335', '0336', '0337', '0338', '0339', '0340', '0341', '0342', '0343', '0344', '0345', '0346', '0347', '0348', '0349'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  return `${prefix}${number}`;
};

// Generate random address
const getRandomAddress = () => {
  const city = cities[Math.floor(Math.random() * cities.length)];
  const area = city.areas[Math.floor(Math.random() * city.areas.length)];
  const houseNo = Math.floor(Math.random() * 999) + 1;
  const streetNo = Math.floor(Math.random() * 50) + 1;
  const block = Math.floor(Math.random() * 20) + 1;
  return `House #${houseNo}, Street ${streetNo}, Block ${block}, ${area}, ${city.city}`;
};

// Generate random income
const getRandomIncome = () => {
  const minIncome = 15000;
  const maxIncome = 500000;
  return Math.floor(Math.random() * (maxIncome - minIncome + 1)) + minIncome;
};

// Generate random discount
const getRandomDiscount = () => {
  const discounts = [0, 500, 1000, 1500, 2000, 2500, 3000, 5000, 10000];
  return discounts[Math.floor(Math.random() * discounts.length)];
};

// Helper function to generate school-specific student ID
const generateSchoolSpecificStudentId = async (schoolId: number): Promise<number> => {
  try {
    const { data: existingStudents, error } = await supabase
      .from('students')
      .select('id')
      .eq('school_id', schoolId)
      .order('id', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error getting student count:', error);
      throw new Error('Failed to generate student ID: ' + error.message);
    }

    const nextStudentId = existingStudents && existingStudents.length > 0 
      ? existingStudents[0].id + 1 
      : 1;

    return nextStudentId;
  } catch (error) {
    console.error('Error generating student ID:', error);
    throw error;
  }
};

// Helper function to insert student with retry mechanism for race conditions
const insertStudentWithRetry = async (studentData: any, maxRetries: number = 3): Promise<any> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data: newStudent, error: insertError } = await supabase
        .from('students')
        .insert([studentData])
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505' && attempt < maxRetries) {
          console.log(`Attempt ${attempt} failed due to race condition, retrying...`);
          const newId = await generateSchoolSpecificStudentId(SCHOOL_ID);
          studentData.id = newId;
          continue;
        }
        throw insertError;
      }

      return newStudent;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 100 * attempt));
    }
  }
};

// Generate random student data
const generateStudent = (classId: number, sectionId: number) => {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const fatherFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const fatherLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const motherFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const motherLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  const gender = Math.random() > 0.5 ? 'Male' : 'Female';
  const dob = getRandomDOB();
  const admissionDate = getRandomAdmissionDate();
  
  return {
    id: 0, // Will be set later
    name: `${firstName} ${lastName}`,
    father_name: `${fatherFirstName} ${fatherLastName}`,
    mother_name: `${motherFirstName} ${motherLastName}`,
    dob: dob.toISOString().split('T')[0],
    gender: gender,
    address: getRandomAddress(),
    phone: getRandomPhone(),
    father_mobile: getRandomPhone(),
    mother_mobile: getRandomPhone(),
    class_id: classId,
    section_id: sectionId,
    status: 'active',
    admission_date: admissionDate.toISOString().split('T')[0],
    discount_in_fee: getRandomDiscount(),
    religion: religions[Math.floor(Math.random() * religions.length)],
    nationality: nationalities[Math.floor(Math.random() * nationalities.length)],
    blood_group: bloodGroups[Math.floor(Math.random() * bloodGroups.length)],
    father_occupation: occupations[Math.floor(Math.random() * occupations.length)],
    father_education: educations[Math.floor(Math.random() * educations.length)],
    father_income: getRandomIncome(),
    mother_occupation: occupations[Math.floor(Math.random() * occupations.length)],
    mother_education: educations[Math.floor(Math.random() * educations.length)],
    mother_income: getRandomIncome(),
    cast: casts[Math.floor(Math.random() * casts.length)],
    disease: diseases[Math.floor(Math.random() * diseases.length)],
    id_mark: idMarks[Math.floor(Math.random() * idMarks.length)],
    total_siblings: Math.floor(Math.random() * 6),
    session_id: SESSION_ID,
    school_id: SCHOOL_ID,
    // Additional fields
    form_b: Math.random() > 0.7 ? `B-${Math.floor(Math.random() * 1000000)}` : null,
    orphan: Math.random() > 0.95 ? 'Yes' : 'No',
    osc: Math.random() > 0.8 ? `OSC-${Math.floor(Math.random() * 100000)}` : null,
    previous_school: Math.random() > 0.6 ? `School ${Math.floor(Math.random() * 100)}` : null,
    previous_id: Math.random() > 0.7 ? `ID-${Math.floor(Math.random() * 100000)}` : null,
    additional_note: Math.random() > 0.8 ? 'Additional information for this student.' : null,
    father_national_id: Math.random() > 0.5 ? `${Math.floor(Math.random() * 1000000000000)}` : null,
    father_profession: occupations[Math.floor(Math.random() * occupations.length)],
    mother_national_id: Math.random() > 0.5 ? `${Math.floor(Math.random() * 1000000000000)}` : null,
    mother_profession: occupations[Math.floor(Math.random() * occupations.length)]
  };
};

// Main function to insert 500 students
const insert500PakistaniStudents = async () => {
  try {
    console.log('Starting to insert 500 Pakistani students...');
    console.log(`School ID: ${SCHOOL_ID}, Session ID: ${SESSION_ID}`);
    
    // Verify session exists and is active
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, name, is_active')
      .eq('id', SESSION_ID)
      .eq('school_id', SCHOOL_ID)
      .single();

    if (sessionError || !session) {
      throw new Error(`Session ${SESSION_ID} not found for school ${SCHOOL_ID}`);
    }

    if (!session.is_active) {
      console.warn(`Warning: Session ${SESSION_ID} is not active`);
    }

    console.log(`Using session: ${session.name} (ID: ${session.id})`);

    // Verify classes and sections exist
    for (const classSection of classSectionMap) {
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('id', classSection.classId)
        .eq('school_id', SCHOOL_ID)
        .single();

      if (classError || !classData) {
        throw new Error(`Class ${classSection.classId} not found for school ${SCHOOL_ID}`);
      }

      console.log(`Using class: ${classData.name} (ID: ${classData.id})`);

      for (const sectionId of classSection.sectionIds) {
        const { data: sectionData, error: sectionError } = await supabase
          .from('sections')
          .select('id, name')
          .eq('id', sectionId)
          .eq('class_id', classSection.classId)
          .eq('school_id', SCHOOL_ID)
          .single();

        if (sectionError || !sectionData) {
          throw new Error(`Section ${sectionId} not found for class ${classSection.classId} in school ${SCHOOL_ID}`);
        }

        console.log(`Using section: ${sectionData.name} (ID: ${sectionData.id})`);
      }
    }

    // Calculate students per class-section combination
    const totalClassSections = classSectionMap.reduce((sum, cs) => sum + cs.sectionIds.length, 0);
    const studentsPerClassSection = Math.floor(500 / totalClassSections);
    const remainingStudents = 500 % totalClassSections;

    console.log(`Total class-section combinations: ${totalClassSections}`);
    console.log(`Students per class-section: ${studentsPerClassSection}`);
    console.log(`Remaining students to distribute: ${remainingStudents}`);

    let totalInserted = 0;
    let currentStudentId = await generateSchoolSpecificStudentId(SCHOOL_ID);

    // Insert students for each class-section combination
    for (const classSection of classSectionMap) {
      for (const sectionId of classSection.sectionIds) {
        let studentsForThisSection = studentsPerClassSection;
        
        // Distribute remaining students
        if (remainingStudents > 0) {
          studentsForThisSection += 1;
        }

        console.log(`\nGenerating ${studentsForThisSection} students for Class ${classSection.classId}, Section ${sectionId}...`);

        // Insert students in batches
        const batchSize = 10;
        for (let i = 0; i < studentsForThisSection; i += batchSize) {
          const currentBatchSize = Math.min(batchSize, studentsForThisSection - i);
          const batch = [];

          for (let j = 0; j < currentBatchSize; j++) {
            const studentData = generateStudent(classSection.classId, sectionId);
            studentData.id = currentStudentId++;
            batch.push(studentData);
          }

          // Insert batch
          for (const student of batch) {
            try {
              const newStudent = await insertStudentWithRetry(student);
              
              // Insert into student_class_history
              const { error: historyError } = await supabase
                .from('student_class_history')
                .insert([{
                  student_id: newStudent.id,
                  class_id: classSection.classId,
                  section_id: sectionId,
                  session_id: SESSION_ID,
                  school_id: SCHOOL_ID,
                  admission_date: student.admission_date,
                  status: 'active'
                }]);

              if (historyError) {
                console.error(`Failed to insert history for student ${newStudent.id}:`, historyError);
              }

              totalInserted++;
              if (totalInserted % 50 === 0) {
                console.log(`Progress: ${totalInserted}/500 students inserted`);
              }
            } catch (error) {
              console.error(`Failed to insert student:`, error);
              // Continue with next student
            }
          }

          // Small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    console.log(`\nSuccessfully inserted ${totalInserted} Pakistani students!`);
    console.log(`School ID: ${SCHOOL_ID}`);
    console.log(`Session ID: ${SESSION_ID}`);
    console.log(`Classes used: ${classSectionMap.map(cs => cs.classId).join(', ')}`);
    console.log(`Sections used: ${classSectionMap.flatMap(cs => cs.sectionIds).join(', ')}`);

  } catch (error) {
    console.error('Error inserting students:', error);
    process.exit(1);
  }
};

// Execute the function
insert500PakistaniStudents();
