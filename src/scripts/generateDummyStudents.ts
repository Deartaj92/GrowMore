import { supabase } from '../supabaseClient';

// Pakistani first names (male and female)
const firstNames = [
  'Ahmed', 'Ali', 'Usman', 'Hassan', 'Hamza', 'Muhammad', 'Ibrahim', 'Zain', 'Omar', 'Yusuf',
  'Fatima', 'Ayesha', 'Sana', 'Zainab', 'Maryam', 'Hafsa', 'Amina', 'Sara', 'Layla', 'Noor'
];

// Pakistani last names
const lastNames = [
  'Khan', 'Ali', 'Hussain', 'Raza', 'Abbas', 'Hassan', 'Malik', 'Qureshi', 'Shah', 'Butt',
  'Chaudhry', 'Sheikh', 'Rizvi', 'Zaidi', 'Hashmi', 'Jafri', 'Naqvi', 'Rashid', 'Siddiqui', 'Mirza'
];

// Pakistani cities and areas
const cities = [
  { city: 'Karachi', areas: ['Gulshan-e-Iqbal', 'Defence', 'Clifton', 'North Nazimabad', 'Gulistan-e-Jauhar'] },
  { city: 'Lahore', areas: ['Gulberg', 'DHA', 'Model Town', 'Johar Town', 'Wapda Town'] },
  { city: 'Islamabad', areas: ['F-8', 'F-10', 'E-11', 'DHA Phase 2', 'Bahria Town'] },
  { city: 'Rawalpindi', areas: ['Saddar', 'Westridge', 'Bahria Town', 'DHA', 'Chaklala'] },
  { city: 'Faisalabad', areas: ['D Ground', 'Madina Town', 'Gulberg', 'Peoples Colony', 'Satiana Road'] }
];

// Class names
const classes = [
  { name: '1st', sections: ['A', 'B'] },
  { name: '2nd', sections: ['A', 'B'] },
  { name: '3rd', sections: ['A', 'B'] },
  { name: '4th', sections: ['A', 'B'] },
  { name: '5th', sections: ['A', 'B'] },
  { name: '6th', sections: ['A', 'B'] },
  { name: '7th', sections: ['A', 'B'] },
  { name: '8th', sections: ['A', 'B'] },
  { name: '9th', sections: ['A', 'B'] },
  { name: '10th', sections: ['A', 'B'] }
];

// Additional data
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];
const religions = ['Muslim', 'Christianity', 'Hinduism', 'Sikhism', 'Other'];
const nationalities = ['Pakistani', 'Indian', 'Afghan', 'Bangladeshi', 'Other'];
const occupations = ['Business', 'Government Job', 'Private Job', 'Self Employed', 'Teacher', 'Doctor', 'Engineer', 'Other'];
const educations = ['Primary', 'Middle', 'Matric', 'Intermediate', 'Bachelor', 'Master', 'PhD', 'Other'];

// Generate random date between 2010 and 2020
const getRandomDate = () => {
  const start = new Date(2010, 0, 1);
  const end = new Date(2020, 11, 31);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Generate random phone number
const getRandomPhone = () => {
  return `03${Math.floor(Math.random() * 100000000)}`;
};

// Generate random address
const getRandomAddress = () => {
  const city = cities[Math.floor(Math.random() * cities.length)];
  const area = city.areas[Math.floor(Math.random() * city.areas.length)];
  const houseNo = Math.floor(Math.random() * 999) + 1;
  const streetNo = Math.floor(Math.random() * 50) + 1;
  return `${houseNo}, Street ${streetNo}, ${area}, ${city.city}`;
};

// Generate random student data
const generateStudent = (classId: number, sectionId: number) => {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const fatherName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  const motherName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  const gender = Math.random() > 0.5 ? 'male' : 'female';
  const dob = getRandomDate();
  
  return {
    name: `${firstName} ${lastName}`,
    father_name: fatherName,
    mother_name: motherName,
    dob: dob.toISOString().split('T')[0],
    gender: gender,
    address: getRandomAddress(),
    phone: getRandomPhone(),
    father_mobile: getRandomPhone(),
    mother_mobile: getRandomPhone(),
    class_id: classId,
    section_id: sectionId,
    status: 'active',
    admission_date: getRandomDate().toISOString().split('T')[0],
    religion: religions[Math.floor(Math.random() * religions.length)],
    nationality: nationalities[Math.floor(Math.random() * nationalities.length)],
    blood_group: bloodGroups[Math.floor(Math.random() * bloodGroups.length)],
    father_occupation: occupations[Math.floor(Math.random() * occupations.length)],
    father_education: educations[Math.floor(Math.random() * educations.length)],
    mother_occupation: occupations[Math.floor(Math.random() * occupations.length)],
    mother_education: educations[Math.floor(Math.random() * educations.length)],
    total_siblings: Math.floor(Math.random() * 5),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

// Main function to insert dummy data
const insertDummyStudents = async () => {
  try {
    console.log('Starting to insert dummy data...');
    
    // Get the current active session
    const { data: activeSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('is_active', true)
      .single();

    if (!activeSession) {
      throw new Error('No active session found');
    }

    // First, ensure classes exist and get their IDs
    const classMap = new Map<string, number>();
    for (const classInfo of classes) {
      console.log(`Checking/creating class: ${classInfo.name}`);
      const { data: existingClass } = await supabase
        .from('classes')
        .select('id')
        .eq('name', classInfo.name)
        .single();

      if (!existingClass) {
        console.log(`Creating new class: ${classInfo.name}`);
        const { data: newClass, error: classError } = await supabase
          .from('classes')
          .insert([{ name: classInfo.name }])
          .select()
          .single();

        if (classError) throw classError;
        classMap.set(classInfo.name, newClass.id);
      } else {
        classMap.set(classInfo.name, existingClass.id);
      }
    }

    // Check existing sections and create only if they don't exist
    const sectionMap = new Map<string, number>();
    for (const classInfo of classes) {
      const classId = classMap.get(classInfo.name);
      if (!classId) continue;

      // First, get all existing sections for this class in the active session
      const { data: existingSections, error: fetchError } = await supabase
        .from('sections')
        .select('id, name')
        .eq('class_id', classId)
        .eq('session_id', activeSession.id);

      if (fetchError) throw fetchError;

      // Create a map of existing section names
      const existingSectionNames = new Set(existingSections?.map(s => s.name) || []);

      for (const sectionName of classInfo.sections) {
        // Check if section already exists
        const existingSection = existingSections?.find(s => s.name === sectionName);
        
        if (existingSection) {
          console.log(`Section ${sectionName} already exists for class ${classInfo.name}`);
          sectionMap.set(`${classInfo.name}-${sectionName}`, existingSection.id);
        } else {
          console.log(`Creating new section ${sectionName} for class ${classInfo.name}`);
          const { data: newSection, error: sectionError } = await supabase
            .from('sections')
            .insert([{ 
              name: sectionName,
              class_id: classId,
              session_id: activeSession.id
            }])
            .select()
            .single();

          if (sectionError) throw sectionError;
          sectionMap.set(`${classInfo.name}-${sectionName}`, newSection.id);
        }
      }
    }

    // Generate students for each class-section combination
    const batchSize = 20;
    for (const classInfo of classes) {
      const classId = classMap.get(classInfo.name);
      if (!classId) continue;

      for (const sectionName of classInfo.sections) {
        const sectionId = sectionMap.get(`${classInfo.name}-${sectionName}`);
        if (!sectionId) continue;

        // Generate 30-40 students for this class-section
        const numStudents = Math.floor(Math.random() * 11) + 30; // Random number between 30-40
        console.log(`Generating ${numStudents} students for ${classInfo.name} Section ${sectionName}...`);

        for (let i = 0; i < numStudents; i += batchSize) {
          const students = [];
          const currentBatchSize = Math.min(batchSize, numStudents - i);
          
          for (let j = 0; j < currentBatchSize; j++) {
            students.push({
              ...generateStudent(classId, sectionId),
              session_id: activeSession.id
            });
          }
          
          if (students.length > 0) {
            const { error } = await supabase
              .from('students')
              .insert(students);

            if (error) throw error;
            console.log(`Successfully inserted ${i + students.length} students for ${classInfo.name} Section ${sectionName}`);
          }
        }
      }
    }

    console.log('Successfully completed inserting students for all classes and sections');
  } catch (error) {
    console.error('Error inserting dummy data:', error);
    process.exit(1);
  }
};

// Execute the function
insertDummyStudents(); 