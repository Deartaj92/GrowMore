# Non-Sectioned Classes Handling in Examination Summaries

## Overview
The examination summaries system properly handles both sectioned and non-sectioned classes through careful database design and application logic.

## Database Design

### Table Structure
```sql
examination_summaries (
    id SERIAL PRIMARY KEY,
    examination_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    section_id INTEGER,  -- NULLABLE for non-sectioned classes
    school_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    -- ... other fields
)
```

### Key Points
- `section_id` is **nullable** to support non-sectioned classes
- Foreign key constraint allows `NULL` values for `section_id`
- Unique constraint is on `(examination_id, student_id, school_id)` - does not include `section_id`

## Application Logic

### 1. Loading Examination Summaries

#### For Sectioned Classes:
```typescript
// Class has sections (has_sections = true)
const filters = {
  examination_id: examId,
  class_id: classId,
  section_id: selectedSection.id,  // Specific section
  school_id: schoolId
};
```

#### For Non-Sectioned Classes:
```typescript
// Class has no sections (has_sections = false)
const filters = {
  examination_id: examId,
  class_id: classId,
  section_id: null,  // Explicitly null
  school_id: schoolId
};
```

### 2. Storing Examination Summaries

#### For Sectioned Classes:
```typescript
const summary = {
  examination_id: examId,
  student_id: studentId,
  class_id: classId,
  section_id: selectedSection?.id || null,  // Section ID or null
  school_id: schoolId,
  // ... other fields
};
```

#### For Non-Sectioned Classes:
```typescript
const summary = {
  examination_id: examId,
  student_id: studentId,
  class_id: classId,
  section_id: null,  // Always null for non-sectioned classes
  school_id: schoolId,
  // ... other fields
};
```

## Service Layer Handling

### Query Building
```typescript
// In examinationSummaryService.getExaminationSummaries()
Object.entries(filters).forEach(([key, value]) => {
  if (value !== undefined && value !== null && value !== '') {
    if (key === 'section_id') {
      // Handle section_id specially for non-sectioned classes
      if (value === null) {
        query = query.is('section_id', null);  // PostgreSQL IS NULL
      } else {
        query = query.eq(key, value);  // PostgreSQL = value
      }
    } else {
      query = query.eq(key, value);
    }
  }
});
```

### Filter Logic
```typescript
// In MasterSheetManager.loadExaminationSummaries()
const hasSections = selectedClass.has_sections ?? true;

if (hasSections) {
  if (selectedSection) {
    filters.section_id = selectedSection.id;
  } else {
    return []; // No section selected for sectioned class
  }
} else {
  filters.section_id = null; // Explicitly null for non-sectioned classes
}
```

## Examples

### Example 1: Non-Sectioned Class (Play Group)
```sql
-- Class: Play Group (has_sections = false)
INSERT INTO examination_summaries (
  examination_id, student_id, class_id, section_id, school_id, session_id,
  obtained_marks, total_marks, percentage, position, status
) VALUES (
  1, 101, 1, NULL, 1, 1,  -- section_id is NULL
  85, 100, 85.0, 1, 'pass'
);
```

### Example 2: Sectioned Class (9th Grade)
```sql
-- Class: 9th Grade (has_sections = true)
INSERT INTO examination_summaries (
  examination_id, student_id, class_id, section_id, school_id, session_id,
  obtained_marks, total_marks, percentage, position, status
) VALUES (
  1, 201, 9, 1, 1, 1,  -- section_id is 1 (Section A)
  90, 100, 90.0, 1, 'pass'
);
```

## Query Examples

### Query for Non-Sectioned Class
```sql
SELECT * FROM examination_summaries 
WHERE examination_id = 1 
  AND class_id = 1 
  AND section_id IS NULL 
  AND school_id = 1;
```

### Query for Sectioned Class
```sql
SELECT * FROM examination_summaries 
WHERE examination_id = 1 
  AND class_id = 9 
  AND section_id = 1 
  AND school_id = 1;
```

## Benefits

1. **Unified Data Model**: Single table handles both sectioned and non-sectioned classes
2. **Efficient Queries**: Proper indexing and null handling
3. **Data Integrity**: Foreign key constraints prevent orphaned records
4. **Flexible Filtering**: Service layer handles both scenarios transparently
5. **Performance**: Optimized queries with proper null handling

## Testing Scenarios

### Test Case 1: Non-Sectioned Class
1. Create a class with `has_sections = false`
2. Generate master sheet data
3. Verify `section_id` is stored as `NULL`
4. Load data and verify correct filtering

### Test Case 2: Sectioned Class
1. Create a class with `has_sections = true`
2. Create sections for the class
3. Generate master sheet data for specific section
4. Verify `section_id` is stored correctly
5. Load data and verify section-specific filtering

### Test Case 3: Mixed Classes
1. Have both sectioned and non-sectioned classes
2. Generate master sheet data for both
3. Verify correct storage and retrieval
4. Test performance with large datasets

