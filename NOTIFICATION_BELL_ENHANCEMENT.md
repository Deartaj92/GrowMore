# Notification Bell Enhancement Plan

## Objective
Make the notification bell visible for all user roles (Principal, Teachers, Students, Guests) and show:
- **Principal**: Teacher activity notifications (current behavior)
- **All other roles**: Announcements as notifications

## Current State Analysis

### NotificationContext.tsx
- Currently only loads notifications for users with `staff_id` and `school_id`
- Filters out teacher activity for Teachers and Students
- Uses `activityTrackingService` to fetch notifications from `notifications` table

### NotificationBell.tsx
- Displays notifications from NotificationContext
- Shows unread count badge
- Already has UI for displaying notification items

### Layout.tsx
- Has NotificationBell component imported
- Need to find where it's conditionally rendered (likely only for Principal)

## Implementation Steps

### Step 1: Update NotificationContext
1. Support both staff and student users
2. Fetch announcements from `announcements` table for non-Principal users
3. Transform announcements into notification format
4. Merge with existing teacher activity notifications (for Principal only)

### Step 2: Create Announcement-to-Notification Transformer
- Map announcement fields to notification fields:
  - `id` → `id`
  - `title` → `title`
  - `body` → `message`
  - `created_at` → `created_at`
  - `is_active` → determines if shown
  - Track read status separately (announcement_views table)

### Step 3: Update Layout.tsx
- Remove role-based conditional rendering of NotificationBell
- Show bell for all authenticated users

### Step 4: Handle Read/Unread State
- For announcements: Use `announcement_views` table
- For teacher activities: Use existing `notifications.is_read`

## Database Schema Reference

### announcements table
- id, title, body, created_at, is_active
- audience_group (students/staff)
- target_scope (all/single/multi/class/role)
- display_start_date, display_end_date

### announcement_views table
- announcement_id, viewer_identifier, seen_at
- Used to track who has seen announcements

### notifications table  
- id, title, message, created_at, is_read
- notification_type, recipient_id, school_id

## Files to Modify
1. src/contexts/NotificationContext.tsx
2. src/components/NotificationBell.tsx (minor updates)
3. src/components/Layout.tsx (remove conditional rendering)
