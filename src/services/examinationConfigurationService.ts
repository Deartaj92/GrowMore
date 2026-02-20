import { supabase } from '../supabaseClient';

export interface GradeConfiguration {
  id?: number;
  grade: string;
  min_percentage: number;
  max_percentage: number;
  description?: string;
  color?: string;
}

export interface DMCConfiguration {
  id?: number;
  include_student_photo: boolean;
  include_teacher_signature: boolean;
  include_principal_signature: boolean;
  include_school_logo: boolean;
  include_attendance_percentage: boolean;
  include_remarks: boolean;
  include_grade: boolean;
  include_school_motto: boolean;
  attendance_threshold: number;
  default_remarks?: string;
  include_parent_signature: boolean;
  include_guardian_details: boolean;
  include_medical_certificate: boolean;
  include_conduct_certificate: boolean;
  include_achievement_certificate: boolean;
  watermark_text?: string;
  footer_text?: string;
  header_text?: string;
  certificate_template: 'standard' | 'premium' | 'custom';
  print_quality: 'draft' | 'normal' | 'high';
  auto_generate_serial: boolean;
  include_qr_code: boolean;
  include_barcode: boolean;
}

export interface DMCColorConfiguration {
  id?: number;
  // Header colors
  header_gradient_start: string;
  header_gradient_end: string;
  header_text_color: string;
  header_text_shadow: string;
  
  // Logo colors
  logo_background: string;
  logo_border: string;
  
  // Title colors
  title_background: string;
  title_text_color: string;
  title_border: string;
  
  // Bar colors
  bar_gradient_start: string;
  bar_gradient_end: string;
  
  // Student details colors
  details_background: string;
  details_border: string;
  details_text_color: string;
  details_label_color: string;
  
  // Table colors
  table_header_background: string;
  table_header_text: string;
  table_border: string;
  table_alternate_row: string;
  table_text_color: string;
  
  // Summary colors
  summary_background: string;
  summary_border: string;
  summary_text_color: string;
  summary_label_color: string;
  
  // Performance colors
  excellent_color: string; // 90%+
  good_color: string;      // 80-89%
  average_color: string;   // 70-79%
  poor_color: string;      // <70%
  
  // Special marks colors
  absent_color: string;
  fail_color: string;
  
  // Footer colors
  footer_gradient_start: string;
  footer_gradient_end: string;
  
  // Border colors
  border_color: string;
  signature_text_color: string;
}

export interface ExaminationConfig {
  id?: number;
  school_id: number;
  grade_configurations: GradeConfiguration[];
  dmc_configuration: DMCConfiguration;
  dmc_color_configuration: DMCColorConfiguration;
  created_at?: string;
  updated_at?: string;
}

class ExaminationConfigurationService {
  /**
   * Get examination configuration for a school
   */
  async getExaminationConfiguration(schoolId: number): Promise<ExaminationConfig | null> {
    try {
      const { data, error } = await supabase
        .from('examination_configurations')
        .select('*')
        .eq('school_id', schoolId)
        .single();


      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create or update examination configuration
   */
  async upsertExaminationConfiguration(config: ExaminationConfig): Promise<ExaminationConfig> {
    try {
      
      // First, try to get existing configuration
      const { data: existingData, error: fetchError } = await supabase
        .from('examination_configurations')
        .select('*')
        .eq('school_id', config.school_id)
        .single();


      let result;
      
      if (existingData && !fetchError) {
        // Update existing record
        const { data, error } = await supabase
          .from('examination_configurations')
          .update({
            grade_configurations: config.grade_configurations,
            dmc_configuration: config.dmc_configuration,
            dmc_color_configuration: config.dmc_color_configuration,
            updated_at: new Date().toISOString()
          })
          .eq('school_id', config.school_id)
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        result = data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('examination_configurations')
          .insert({
            school_id: config.school_id,
            grade_configurations: config.grade_configurations,
            dmc_configuration: config.dmc_configuration,
            dmc_color_configuration: config.dmc_color_configuration,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        result = data;
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete examination configuration
   */
  async deleteExaminationConfiguration(schoolId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('examination_configurations')
        .delete()
        .eq('school_id', schoolId);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get default grade configurations
   */
  getDefaultGradeConfigurations(): GradeConfiguration[] {
    return [
      { grade: 'A+', min_percentage: 90, max_percentage: 100, description: 'Outstanding', color: '#4CAF50' },
      { grade: 'A', min_percentage: 80, max_percentage: 89, description: 'Excellent', color: '#8BC34A' },
      { grade: 'B+', min_percentage: 70, max_percentage: 79, description: 'Very Good', color: '#CDDC39' },
      { grade: 'B', min_percentage: 60, max_percentage: 69, description: 'Good', color: '#FFC107' },
      { grade: 'C+', min_percentage: 50, max_percentage: 59, description: 'Satisfactory', color: '#FF9800' },
      { grade: 'C', min_percentage: 40, max_percentage: 49, description: 'Pass', color: '#FF5722' },
      { grade: 'D', min_percentage: 0, max_percentage: 39, description: 'Fail', color: '#F44336' }
    ];
  }

  /**
   * Get default DMC configuration
   */
  getDefaultDMCConfiguration(): DMCConfiguration {
    return {
      include_student_photo: true,
      include_teacher_signature: true,
      include_principal_signature: true,
      include_school_logo: true,
      include_attendance_percentage: true,
      include_remarks: true,
      include_grade: true,
      include_school_motto: true,
      attendance_threshold: 75,
      default_remarks: 'Good performance. Keep it up!',
      include_parent_signature: false,
      include_guardian_details: false,
      include_medical_certificate: false,
      include_conduct_certificate: false,
      include_achievement_certificate: false,
      watermark_text: 'OFFICIAL DOCUMENT',
      footer_text: 'This is to certify that the above information is true and correct',
      header_text: 'DETAILED MARKS CERTIFICATE',
      certificate_template: 'standard',
      print_quality: 'normal',
      auto_generate_serial: true,
      include_qr_code: false,
      include_barcode: false
    };
  }

  /**
   * Calculate grade based on percentage using the school's configuration
   */
  calculateGrade(percentage: number, gradeConfigurations: GradeConfiguration[]): string {
    const grade = gradeConfigurations.find(
      config => percentage >= config.min_percentage && percentage <= config.max_percentage
    );
    
    return grade ? grade.grade : 'N/A';
  }

  /**
   * Validate grade configuration
   */
  validateGradeConfiguration(gradeConfigurations: GradeConfiguration[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for overlapping ranges
    for (let i = 0; i < gradeConfigurations.length; i++) {
      for (let j = i + 1; j < gradeConfigurations.length; j++) {
        const grade1 = gradeConfigurations[i];
        const grade2 = gradeConfigurations[j];
        
        if (
          (grade1.min_percentage <= grade2.max_percentage && grade1.max_percentage >= grade2.min_percentage) ||
          (grade2.min_percentage <= grade1.max_percentage && grade2.max_percentage >= grade1.min_percentage)
        ) {
          errors.push(`Overlapping percentage ranges between ${grade1.grade} and ${grade2.grade}`);
        }
      }
    }
    
    // Check for gaps in coverage
    const sortedGrades = [...gradeConfigurations].sort((a, b) => a.min_percentage - b.min_percentage);
    for (let i = 0; i < sortedGrades.length - 1; i++) {
      const current = sortedGrades[i];
      const next = sortedGrades[i + 1];
      
      if (current.max_percentage + 1 < next.min_percentage) {
        errors.push(`Gap in percentage coverage between ${current.grade} (${current.max_percentage}%) and ${next.grade} (${next.min_percentage}%)`);
      }
    }
    
    // Check for duplicate grades
    const grades = gradeConfigurations.map(g => g.grade);
    const duplicateGrades = grades.filter((grade, index) => grades.indexOf(grade) !== index);
    if (duplicateGrades.length > 0) {
      errors.push(`Duplicate grades found: ${duplicateGrades.join(', ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get grade color for a specific grade
   */
  getGradeColor(grade: string, gradeConfigurations: GradeConfiguration[]): string {
    const gradeConfig = gradeConfigurations.find(g => g.grade === grade);
    return gradeConfig?.color || '#2196F3';
  }
}

export const examinationConfigurationService = new ExaminationConfigurationService();
