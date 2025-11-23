/**
 * Utility functions for student-related operations
 */

/**
 * Extracts the sequence number from roll_number (e.g., "S1-1" -> "1", "S2-15" -> "15")
 * Returns empty string if roll_number is invalid or missing
 */
export const getSequenceNumber = (rollNumber: string | null | undefined): string => {
  if (!rollNumber) return '';
  // Extract the number after the dash (e.g., "S1-1" -> "1", "S2-15" -> "15")
  const match = rollNumber.match(/-(\d+)$/);
  return match ? match[1] : '';
};

/**
 * Gets the display ID for a student (sequence number from roll_number, or falls back to id)
 * @param student - Student object with roll_number and id properties
 * @returns The sequence number if available, otherwise the student id
 */
export const getStudentDisplayId = (student: { roll_number?: string | null; id: number | string }): string | number => {
  const sequenceNumber = getSequenceNumber(student.roll_number);
  return sequenceNumber || student.id;
};

/**
 * Checks if a search term matches a student by ID or roll_number sequence
 * @param student - Student object with id and roll_number
 * @param searchTerm - Search term (can be numeric ID or roll_number sequence)
 * @returns Object with match status and score (higher score = better match)
 */
export const matchesStudentSearch = (
  student: { id: number | string; roll_number?: string | null },
  searchTerm: string
): { matches: boolean; score: number } => {
  const searchLower = searchTerm.toLowerCase().trim();
  const isNumericSearch = !isNaN(Number(searchLower));
  const searchTermNum = isNumericSearch ? parseInt(searchLower) : null;
  
  const studentIdStr = String(student.id);
  const sequenceNumber = getSequenceNumber(student.roll_number);
  const sequenceStr = sequenceNumber || '';
  
  let score = 0;
  let matches = false;
  
  if (isNumericSearch && searchTermNum !== null) {
    // Search by ID or roll_number sequence
    // Check roll_number sequence first (higher priority for display)
    if (sequenceStr && sequenceStr === searchLower) {
      score = 1000; // Highest priority for exact roll_number sequence match
      matches = true;
    } else if (sequenceStr && sequenceStr.startsWith(searchLower)) {
      score = 800; // High priority for roll_number sequence starts with
      matches = true;
    } else if (sequenceStr && sequenceStr.includes(searchLower)) {
      score = 600; // Medium priority for roll_number sequence contains
      matches = true;
    }
    
    // Also check database ID
    if (student.id === searchTermNum) {
      score = Math.max(score, 1000); // Highest priority for exact ID match
      matches = true;
    } else if (studentIdStr.startsWith(searchLower)) {
      score = Math.max(score, 500); // High priority for ID starts with
      matches = true;
    } else if (studentIdStr.includes(searchLower)) {
      score = Math.max(score, 100); // Lower priority for ID contains
      matches = true;
    }
  } else {
    // Non-numeric search - check roll_number sequence as secondary
    if (sequenceStr && sequenceStr.includes(searchLower)) {
      score = 10;
      matches = true;
    }
    
    // Also check ID for non-numeric searches (secondary)
    if (studentIdStr.includes(searchLower)) {
      score = Math.max(score, 10);
      matches = true;
    }
  }
  
  return { matches, score };
};

/**
 * Fetches a student by ID or roll_number sequence
 * @param supabase - Supabase client instance
 * @param identifier - Can be numeric ID (string/number) or roll_number sequence (string)
 * @param schoolId - School ID to filter by
 * @returns Student data or null if not found
 */
export const fetchStudentByIdentifier = async (
  supabase: any,
  identifier: string | number,
  schoolId: number
): Promise<any | null> => {
  const identifierStr = String(identifier).trim();
  const isNumeric = !isNaN(Number(identifierStr));
  
  try {
    if (isNumeric) {
      // Try fetching by ID first
      const { data: studentById, error: errorById } = await supabase
        .from('students')
        .select('*')
        .eq('id', parseInt(identifierStr))
        .eq('school_id', schoolId)
        .single();
      
      if (!errorById && studentById) {
        return studentById;
      }
    }
    
    // Try fetching by roll_number sequence
    // We need to search for roll_number that ends with the sequence
    const { data: studentsByRoll, error: errorByRoll } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', schoolId)
      .like('roll_number', `%-${identifierStr}`);
    
    if (!errorByRoll && studentsByRoll && studentsByRoll.length > 0) {
      // Find exact match (roll_number ends with "-{sequence}")
      const exactMatch = studentsByRoll.find((s: any) => {
        const seq = getSequenceNumber(s.roll_number);
        return seq === identifierStr;
      });
      
      if (exactMatch) {
        return exactMatch;
      }
      
      // Return first match if no exact match
      return studentsByRoll[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching student by identifier:', error);
    return null;
  }
};

