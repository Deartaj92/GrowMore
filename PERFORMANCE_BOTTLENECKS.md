# 🐌 Performance Bottlenecks - Data Fetching Issues

This document lists all identified performance bottlenecks that can slow down data fetching in the app.

## 🔴 Critical Issues (High Impact)

### 1. **Polling/Interval-Based Data Fetching**
**Location**: Multiple files
**Impact**: Constant database load, unnecessary queries

#### a) NotificationContext.tsx
- **Line 1638**: 2-second interval polling for push notifications (5 attempts)
- **Line 1645**: 30-second polling interval for notification refresh
- **Fix**: Already disabled realtime, but polling still active - should be disabled or increased interval

#### b) UserManagement.tsx  
- **Line 927**: 10-second polling interval to refresh online status (staff/students/families)
- **Impact**: Fetches all users every 10 seconds when tab is active
- **Fix**: Increase interval to 30-60 seconds or disable if realtime is disabled

#### c) EmployeeList.tsx
- **Line 463**: 60-second interval for time updates (low impact, but unnecessary)

#### d) StudentPasswordManagement.tsx
- **Line 731**: 60-second interval for time updates (low impact)

### 2. **N+1 Query Problems**

#### a) StudentProfile.tsx - Exam Summaries
- **Line 4497-4530**: `Promise.all` with `map` that makes individual queries for each exam summary
- **Problem**: If student has 10 exams, makes 10 separate queries to `exam_results`
- **Fix**: Batch query all exam_results at once, then group by exam_id

```typescript
// Current (BAD):
const examSummariesData = await Promise.all(
  filteredSummaries.map(async (summary) => {
    const { data: subjectResults } = await supabase
      .from('exam_results')
      .select('*')
      .eq('exam_id', summary.examination_id)
      .eq('student_id', studentId)
      // ... makes N queries
  })
);

// Should be (GOOD):
const allExamIds = filteredSummaries.map(s => s.examination_id);
const { data: allResults } = await supabase
  .from('exam_results')
  .select('*')
  .eq('student_id', studentId)
  .in('exam_id', allExamIds);
// Then group by exam_id in JavaScript
```

#### b) NotificationBell.tsx - Reports Enrichment
- **Line 909, 951**: `Promise.all` with `map` for each report to fetch category/student/staff
- **Fix**: Batch fetch all categories, students, staff at once

### 3. **Unlimited Data Fetches**

#### a) StudentProfile.tsx
- **Line 4613-4636**: `fetchAllTestResults` - fetches ALL test results without limit
- **Line 4594-4611**: `fetchAllSessions` - fetches ALL sessions without limit
- **Fix**: Add date limits or pagination

#### b) ExaminationAnalytics.tsx
- **Line 1324-1331**: `fetchAllRows` for ALL `exam_results` for an exam
- **Problem**: Could be 10,000+ rows for large exams
- **Fix**: Use RPC function for aggregation or add class/subject filters

#### c) TestRecordMasterSheet.tsx
- **Line 1225-1240**: `fetchAllRows` for test_records in chunks
- **Problem**: Still fetches all records, just in batches
- **Fix**: Add date/session limits

#### d) FineStatistics.tsx
- **Line 289-291**: Fetches ALL fines, fine_payments, attendance_records
- **Problem**: No date limits
- **Fix**: Add date range filters

### 4. **select('*') Queries - Fetching Unnecessary Data**

**Found 165+ instances** of `select('*')` which fetches all columns:
- **Impact**: 30-50% more data transfer than needed
- **Files with most occurrences**:
  - `src/services/feeService.ts`: 20+ instances
  - `src/pages/StudentProfile.tsx`: Multiple instances
  - `src/pages/CustomLandingPage.tsx`: Multiple instances
  - `src/components/HomeworkDiaryManager.tsx`: Multiple instances
  - `src/utils/reportService.ts`: Multiple instances

**Fix**: Replace with specific field selection:
```typescript
// BAD:
.select('*')

// GOOD:
.select('id, name, status, created_at')
```

### 5. **Sequential Processing Instead of Parallel**

#### a) PositionHolders.tsx
- **Line 1122-1281**: Processes each class/section sequentially
- **Problem**: If 20 classes, makes 20 sequential queries
- **Fix**: Process in parallel batches

#### b) TestRecordMasterSheet.tsx
- **Line 1219-1240**: Processes test record chunks sequentially
- **Fix**: Process chunks in parallel

## 🟡 Medium Impact Issues

### 6. **Heavy Client-Side Data Processing**

#### a) StudentStatusManager.tsx
- **Line 1896-1982**: Complex filtering/sorting with nested loops
- **Impact**: Slows down UI when filtering large student lists
- **Fix**: Use useMemo with proper dependencies, consider virtual scrolling

#### b) AttendanceReport.tsx
- **Line 1409**: Multiple `.filter()` calls in render (called on every render)
- **Fix**: Memoize the calculation

```typescript
// BAD (in render):
{attendanceDataForDate.filter(a => a.status === 'present').length}

// GOOD (memoized):
const presentCount = useMemo(() => 
  attendanceDataForDate.filter(a => a.status === 'present').length,
  [attendanceDataForDate]
);
```

### 7. **Missing Query Limits**

#### a) FeeDefaultersList.tsx
- **Line 2676-2680**: Fetches ALL invoices for ALL students
- **Problem**: No date limit, could be thousands of invoices
- **Fix**: Add date limit (e.g., last 6 months)

#### b) StudentList.tsx
- **Line 2453**: `select('*, classes(name), sections(name)')` for all students
- **Problem**: Fetches all columns + joins for all students
- **Fix**: Select only needed fields

### 8. **Unnecessary Data Refetching**

#### a) Dashboard.tsx
- **Line 429-442**: Fetches classes and sections on every load
- **Problem**: These rarely change, could be cached longer
- **Fix**: Cache for 5-10 minutes instead of 30 seconds

#### b) Layout.tsx - Student Search
- **Line 177-201**: Fetches ALL students and families for search
- **Problem**: Fetches on every search, no debouncing visible
- **Fix**: Add debouncing and limit results

## 🟢 Low Impact (But Still Worth Fixing)

### 9. **Multiple Filter Calls in Render**
- **Location**: Multiple components
- **Impact**: Recalculates on every render
- **Fix**: Use useMemo

### 10. **setTimeout Delays**
- **Location**: Multiple files use `setTimeout` for artificial delays
- **Impact**: Adds unnecessary wait time
- **Files**: Dashboard services, FeeCollectionNew, etc.
- **Fix**: Remove artificial delays, use actual loading states

## 📊 Summary Statistics

- **Polling Intervals**: 4 active polling mechanisms
- **N+1 Queries**: 2 major instances
- **Unlimited Fetches**: 5+ locations
- **select('*') Queries**: 165+ instances
- **Sequential Processing**: 2 major instances

## 🎯 Recommended Priority Fixes

1. **Disable/Increase Polling Intervals** (Quick win, high impact)
2. **Fix N+1 Queries in StudentProfile** (Medium effort, high impact)
3. **Add Date Limits to Unlimited Fetches** (Quick win, high impact)
4. **Replace select('*') with Specific Fields** (Medium effort, medium impact)
5. **Parallelize Sequential Processing** (Medium effort, medium impact)

## 🔧 Quick Fixes to Apply

### Fix 1: Disable Polling (Already disabled realtime)
```typescript
// UserManagement.tsx - Line 917
// TEMPORARILY DISABLED: Polling
return;
// ... rest of polling code
```

### Fix 2: Add Date Limits
```typescript
// FineStatistics.tsx
.gte('created_at', twoYearsAgo.toISOString())
```

### Fix 3: Batch N+1 Queries
```typescript
// StudentProfile.tsx - Batch all exam_results
const allExamIds = filteredSummaries.map(s => s.examination_id);
const { data: allResults } = await supabase
  .from('exam_results')
  .select('*')
  .eq('student_id', studentId)
  .in('exam_id', allExamIds);
```

