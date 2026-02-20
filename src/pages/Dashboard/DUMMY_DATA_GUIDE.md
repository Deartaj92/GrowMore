# Dummy Data Testing Guide

## Overview
The Dashboard has a comprehensive dummy data system for testing without database connections. All dummy data generators are located in `src/pages/Dashboard/utils/dummyData.ts`.

## Enabling Dummy Data Mode

Set `USE_DUMMY_DATA = true` in `src/pages/Dashboard/constants.ts`:

```typescript
export const USE_DUMMY_DATA = true; // Enable dummy data mode
```

## Available Dummy Data Generators

### 1. **Students & Classes**
- `generateDummyStudents(count: number = 500)` - Generates student records with classes, sections, and basic info
- `generateDummyClasses()` - Generates 10 classes (1st through 10th)
- `generateDummySections()` - Generates sections (A, B, C) for each class
- `generateDummyStudentClassHistory(studentIds, sessionId)` - Generates class assignment history

### 2. **Attendance Data**
- `generateDummyAttendance(studentIds, date, sessionId)` - Generates attendance records with statuses (present, absent, late, leave)
- `generateDummyAbsentees(studentIds, date)` - Generates list of absent students (15% of total)
- `generateDummyAttendanceTrend()` - Generates 30 days of attendance rate data (75-95%)
- `generateDummyClassAttendance()` - Generates attendance stats per class
- `generateDummyConsecutiveAbsent()` - Generates students with consecutive absences (3-12 days)
- `generateDummyAttendanceStats()` - Generates overall attendance statistics

### 3. **Fee Data**
- `generateDummyFeeSummary()` - Generates fee summary:
  - Total Invoiced: ₹5,000,000
  - Total Collected: ₹3,500,000
  - Outstanding: ₹1,500,000
  - Collection Rate: 70%

- `generateDummyFeeCollectionCharts()` - Generates:
  - Daily collection data (last 7 days)
  - Monthly collection data (last 12 months)

- `generateDummyFeeCollectionDetails()` - Generates detailed breakdown:
  - Previous Arrears
  - Current Month
  - Next Months
  - Totals

- `generateDummyDefaulters()` - Generates defaulter data for last 6 months

### 4. **Admissions Data**
- `generateDummyAdmissions()` - Generates comprehensive admissions data:
  - Total Inquiries: 500
  - Inquiries This Month: 45
  - Total Students: 1,200
  - Students This Month: 35
  - Total Families: 800
  - Families This Month: 25
  - Total Fee Plans: 1,000
  - Fee Plans This Month: 30
  - Monthly admissions chart (12 months)
  - Withdrawals chart
  - Gender distribution (Boys: 650, Girls: 550)
  - Grade distribution
  - Latest admissions (5 students)
  - Today's birthdays (3 students)

### 5. **Session Data**
- `generateDummySession()` - Generates active session:
  - ID: 1
  - Start Date: 2024-01-01
  - End Date: 2024-12-31
  - Is Active: true

### 6. **Fine Data**
- `generateDummyFineDetails()` - Generates 10 fine records with random amounts (₹100-₹600)

## Usage Examples

### In Service Files
```typescript
import { USE_DUMMY_DATA } from '../constants';
import { generateDummyFeeSummary } from '../utils/dummyData';

export const fetchFeeSummary = async () => {
  if (USE_DUMMY_DATA) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API delay
    return generateDummyFeeSummary();
  }
  // Real database query here
};
```

### Testing Different Scenarios

**High Attendance:**
```typescript
// Modify generateDummyAttendanceStats() to return:
return {
  present: 480,
  absent: 20,
  rate: 96,
  totalStudents: 500,
};
```

**Low Collection Rate:**
```typescript
// Modify generateDummyFeeSummary() to return:
return {
  totalInvoiced: 5000000,
  totalCollected: 2000000,
  totalOutstanding: 3000000,
  collectionRate: 40,
};
```

## Data Characteristics

- **Realistic Ranges**: All dummy data uses realistic ranges based on typical school operations
- **Random Variation**: Most generators include random elements to simulate real-world variance
- **Date-Based**: Many generators use current date to create relative time-based data
- **Relationships**: Data maintains proper relationships (students → classes → sections)

## Performance Testing

Dummy data mode is useful for:
- Testing UI rendering with large datasets
- Performance benchmarking without database load
- Offline development
- Demo presentations
- Automated testing

## Disabling Dummy Data

Set `USE_DUMMY_DATA = false` in `constants.ts` to switch back to real database queries.

