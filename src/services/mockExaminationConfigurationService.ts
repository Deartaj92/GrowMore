// Mock service for frontend development - no database dependencies
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
  
  // Signature colors
  signature_line_color: string;
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

class MockExaminationConfigurationService {
  private config: ExaminationConfig | null = null;
  private schoolId = 1; // Mock school ID

  /**
   * Get examination configuration for a school
   */
  async getExaminationConfiguration(schoolId: number): Promise<ExaminationConfig | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (this.config) {
      return this.config;
    }

    // Return default configuration if none exists
    return {
      id: 1,
      school_id: schoolId,
      grade_configurations: this.getDefaultGradeConfigurations(),
      dmc_configuration: this.getDefaultDMCConfiguration(),
      dmc_color_configuration: this.getDefaultDMCColorConfiguration(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Create or update examination configuration
   */
  async upsertExaminationConfiguration(config: ExaminationConfig): Promise<ExaminationConfig> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Store in memory (mock)
    this.config = {
      ...config,
      id: this.config?.id || 1,
      school_id: this.schoolId,
      updated_at: new Date().toISOString()
    };
    
    return this.config;
  }

  /**
   * Delete examination configuration
   */
  async deleteExaminationConfiguration(schoolId: number): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    this.config = null;
  }

  /**
   * Get default grade configurations
   */
  getDefaultGradeConfigurations(): GradeConfiguration[] {
    return [
      { id: 1, grade: 'A+', min_percentage: 90, max_percentage: 100, description: 'Outstanding', color: '#4CAF50' },
      { id: 2, grade: 'A', min_percentage: 80, max_percentage: 89, description: 'Excellent', color: '#8BC34A' },
      { id: 3, grade: 'B+', min_percentage: 70, max_percentage: 79, description: 'Very Good', color: '#CDDC39' },
      { id: 4, grade: 'B', min_percentage: 60, max_percentage: 69, description: 'Good', color: '#FFC107' },
      { id: 5, grade: 'C+', min_percentage: 50, max_percentage: 59, description: 'Satisfactory', color: '#FF9800' },
      { id: 6, grade: 'C', min_percentage: 40, max_percentage: 49, description: 'Pass', color: '#FF5722' },
      { id: 7, grade: 'D', min_percentage: 0, max_percentage: 39, description: 'Fail', color: '#F44336' }
    ];
  }

  /**
   * Get default DMC configuration
   */
  getDefaultDMCConfiguration(): DMCConfiguration {
    return {
      id: 1,
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
      watermark_text: 'CONFIDENTIAL',
      footer_text: 'This certificate is computer generated and does not require signature.',
      header_text: 'DETAILED MARK CERTIFICATE',
      certificate_template: 'standard',
      print_quality: 'normal',
      auto_generate_serial: true,
      include_qr_code: false,
      include_barcode: false
    };
  }


  /**
   * Get default DMC Color configuration
   */
  getDefaultDMCColorConfiguration(): DMCColorConfiguration {
    return {
      // Header colors - Purple to Pink gradient
      header_gradient_start: '#667eea',
      header_gradient_end: '#f093fb',
      header_text_color: '#ffffff',
      header_text_shadow: '#6b7280',
      
      // Logo colors
      logo_background: '#ffffff',
      logo_border: '#ffffff',
      
      // Title colors
      title_background: '#d8b4fe',
      title_text_color: '#ffffff',
      title_border: '#d8b4fe',
      
      // Bar colors - Multi-color gradient
      bar_gradient_start: '#93c5fd',
      bar_gradient_end: '#86efac',
      
      // Student details colors
      details_background: '#ffffff',
      details_border: '#e2e8f0',
      details_text_color: '#1e293b',
      details_label_color: '#6b7280',
      
      // Table colors
      table_header_background: '#d8b4fe',
      table_header_text: '#ffffff',
      table_border: '#e2e8f0',
      table_alternate_row: '#f3e8ff',
      table_text_color: '#1e293b',
      
      // Summary colors
      summary_background: '#f3e8ff',
      summary_border: '#e5e7eb',
      summary_text_color: '#1e293b',
      summary_label_color: '#6b7280',
      
      // Performance colors
      excellent_color: '#059669', // Green for 90%+
      good_color: '#d97706',      // Orange for 80-89%
      average_color: '#dc2626',   // Red for 70-79%
      poor_color: '#991b1b',      // Dark red for <70%
      
      // Special marks colors
      absent_color: '#dc2626',
      fail_color: '#dc2626',
      
      // Footer colors - Same as header
      footer_gradient_start: '#667eea',
      footer_gradient_end: '#f093fb',
      
      // Signature colors
      signature_line_color: '#dc2626',
      signature_text_color: '#6b7280'
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

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config = null;
  }
}

export const mockExaminationConfigurationService = new MockExaminationConfigurationService();
