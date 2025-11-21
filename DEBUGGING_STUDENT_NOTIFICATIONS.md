# Debugging Student Notifications

## How to Check Console Logs

1. **Open Browser Console:**
   - Press `F12` or `Ctrl+Shift+I` (Windows/Linux)
   - Or right-click → "Inspect" → "Console" tab

2. **Look for these log messages:**
   ```
   [NotificationContext] Student info loaded: {id: 72, name: "Abdul Basit", ...}
   [NotificationContext] refreshNotifications called - schoolId: X, user: undefined, student: 72
   [NotificationContext] Fetching announcements for school: X User: undefined Student: 72
   [NotificationContext] Found announcements: X [...]
   [NotificationContext] Filtered announcements: X [...]
   [NotificationContext] Viewer identifier: student_72
   [NotificationContext] Transformed to notifications: X [...]
   [NotificationContext] Final notifications: X Unread: X
   ```

## What to Check:

### 1. **Student Info Loaded?**
   - Look for: `[NotificationContext] Student info loaded:`
   - Should show student ID, name, school_id, class_id, section_id

### 2. **School ID Present?**
   - Look for: `refreshNotifications called - schoolId: X`
   - If it says `undefined`, student session doesn't have school_id

### 3. **Announcements Found?**
   - Look for: `Found announcements: X`
   - If 0, no announcements exist in database

### 4. **Announcements Filtered?**
   - Look for: `Filtered announcements: X`
   - If 0 but announcements exist, check:
     - `audience_group` = 'students'
     - `target_scope` matches student (all/class/individual)
     - `show_from` and `show_until` dates are valid

### 5. **Viewer Identifier?**
   - Look for: `Viewer identifier: student_72`
   - Should be `student_` + student ID

## Common Issues:

### Issue: "No school ID, skipping refresh"
**Solution:** Student session in localStorage doesn't have `school_id`
- Check: `localStorage.getItem('studentSession')`
- Should contain: `{id, name, school_id, class_id, section_id, ...}`

### Issue: "Found announcements: 0"
**Solution:** No active announcements in database
- Create an announcement in User Announcements page
- Set `audience_group` = 'students'
- Set `target_scope` = 'all' (to show to all students)
- Set `is_active` = true
- Set `show_from` = today or earlier
- Set `show_until` = null or future date

### Issue: "Filtered announcements: 0" (but found some)
**Solution:** Announcements don't match student's audience
- Check announcement `audience_group` = 'students'
- Check announcement `target_scope`:
  - 'all' = shows to all students
  - 'class' = check `class_id` and `section_id` match
  - 'single'/'multi' = check `student_id` or `student_ids` includes this student

## Quick Test:

1. **Create a test announcement:**
   - Go to User Announcements page (as Principal/Admin)
   - Create new announcement
   - Title: "Test Notification"
   - Body: "This is a test"
   - Audience: Students
   - Target: All Students
   - Active: Yes
   - Show from: Today
   - Show until: (leave blank)

2. **Check student view:**
   - Login as student
   - Open notification bell
   - Check console logs
   - Should see the test announcement

## Database Query to Check:

```sql
-- Check if announcements exist for student's school
SELECT id, title, audience_group, target_scope, is_active, show_from, show_until
FROM announcements
WHERE school_id = <student_school_id>
  AND is_active = true
  AND audience_group = 'students'
ORDER BY created_at DESC;
```
