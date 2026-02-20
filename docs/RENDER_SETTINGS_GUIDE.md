# Render Settings Guide

## Overview

The Render Settings system allows administrators to control which menu cards and tabs are visible to teachers and students. It uses a **configuration-driven, JSONB-based approach** that allows adding new cards/tabs **without database schema changes**.

## Architecture

### Database Structure

The `render_settings` table uses a single JSONB column to store all settings:

```sql
{
  "teacher": {
    "mark_attendance": true,
    "reports": false,
    ...
  },
  "student": {
    "profile_tab": true,
    "reports_tab": false,
    ...
  }
}
```

### Configuration File

All available menu items are defined in `src/config/renderSettingsConfig.ts`. This is the **single source of truth** for what can be controlled.

## Adding New Cards/Tabs

### Step 1: Add to Configuration File

Edit `src/config/renderSettingsConfig.ts` and add your new card/tab:

```typescript
// For teacher menu cards
export const TEACHER_MENU_CARDS: MenuItemConfig[] = [
  // ... existing cards
  {
    key: 'new_feature_card',  // Unique key (lowercase, underscores)
    label: 'New Feature',      // Display name
    description: 'Description of what this card does',
    defaultEnabled: true,      // Default visibility
    category: 'teacher'
  }
];

// For student profile tabs
export const STUDENT_PROFILE_TABS: MenuItemConfig[] = [
  // ... existing tabs
  {
    key: 'new_tab',
    label: 'New Tab',
    description: 'Description of what this tab shows',
    defaultEnabled: true,
    category: 'student'
  }
];
```

### Step 2: Use in Component

#### For Teacher Cards (WelcomePage.tsx)

```tsx
import { isTeacherCardVisible } from '../services/renderSettingsService';

// In your component
{isTeacherCardVisible(renderSettings, 'new_feature_card') && (
  <QuickLinkCard onClick={() => navigate('/new-feature')} $color="#3b82f6">
    {/* Card content */}
  </QuickLinkCard>
)}
```

#### For Student Tabs (StudentProfile.tsx)

1. Add the tab key to the `tabIndexMap`:

```typescript
const tabIndexMap: Record<string, number> = {
  // ... existing tabs
  'new_tab': 6,  // Next available index
};
```

2. The tab will automatically appear if:
   - It's in `STUDENT_PROFILE_TABS` configuration
   - It's visible according to render settings
   - The `visibleTabs` useMemo will include it automatically

3. Add the corresponding `CustomTabPanel`:

```tsx
<CustomTabPanel value={activeTab} index={6}>
  {/* Tab content */}
</CustomTabPanel>
```

### Step 3: That's It!

- No database migration needed
- No schema changes required
- The new card/tab automatically appears in Render Settings UI
- Settings are automatically merged with defaults
- Existing schools get the new item enabled by default

## How It Works

### Settings Merging

When settings are fetched, they are automatically merged with defaults:

```typescript
// If a new card is added to config but doesn't exist in DB
// It will be automatically enabled (defaultEnabled: true)
const merged = mergeWithDefaults(savedSettings);
```

### Default Behavior

- **New items**: Enabled by default (`defaultEnabled: true`)
- **Missing settings**: Treated as enabled (visible)
- **Null/undefined**: Treated as enabled (visible)

## Best Practices

1. **Always use the configuration file**: Don't hardcode card/tab keys
2. **Use the service functions**: `isTeacherCardVisible()` and `isStudentTabVisible()`
3. **Provide good descriptions**: Help admins understand what each item does
4. **Set sensible defaults**: Consider what makes sense for most schools
5. **Test with settings disabled**: Ensure your feature works when hidden

## Migration

If you're upgrading from the old column-based structure, run:

```sql
-- migrations/upgrade_render_settings_to_jsonb.sql
```

This will automatically convert existing data to JSONB format.

## API Reference

### Service Functions

```typescript
// Fetch settings for a school
fetchRenderSettings(schoolId: number): Promise<RenderSettings>

// Check if teacher card is visible
isTeacherCardVisible(settings: RenderSettings | null, cardKey: string): boolean

// Check if student tab is visible
isStudentTabVisible(settings: RenderSettings | null, tabKey: string): boolean
```

### Configuration Types

```typescript
interface MenuItemConfig {
  key: string;                    // Unique identifier
  label: string;                  // Display name
  description: string;            // Help text
  defaultEnabled?: boolean;       // Default visibility (default: true)
  category?: 'teacher' | 'student';
}
```

## Examples

### Example 1: Adding a "Library Management" Card

1. Add to `TEACHER_MENU_CARDS`:
```typescript
{
  key: 'library_management',
  label: 'Library Management',
  description: 'Manage library books, issue books to students, and track returns',
  defaultEnabled: true,
  category: 'teacher'
}
```

2. Use in WelcomePage.tsx:
```tsx
{isTeacherCardVisible(renderSettings, 'library_management') && (
  <QuickLinkCard onClick={() => navigate('/library')} $color="#9333ea">
    {/* Card content */}
  </QuickLinkCard>
)}
```

3. Done! The card now appears in Render Settings automatically.

### Example 2: Adding a "Transport" Tab

1. Add to `STUDENT_PROFILE_TABS`:
```typescript
{
  key: 'transport_tab',
  label: 'Transport Tab',
  description: 'View transport details, routes, and bus information',
  defaultEnabled: true,
  category: 'student'
}
```

2. Add to `tabIndexMap` in StudentProfile.tsx:
```typescript
const tabIndexMap: Record<string, number> = {
  // ... existing
  'transport_tab': 6,
};
```

3. Add the tab panel:
```tsx
<CustomTabPanel value={activeTab} index={6}>
  {/* Transport content */}
</CustomTabPanel>
```

4. Done! The tab appears automatically.

## Troubleshooting

### Card/Tab Not Showing in Render Settings

- Check that it's in the configuration file
- Verify the `key` matches what you're checking in the component
- Clear browser cache and refresh

### Card/Tab Always Visible

- Check that you're using `isTeacherCardVisible()` or `isStudentTabVisible()`
- Verify render settings are being fetched
- Check browser console for errors

### Settings Not Saving

- Verify user has Principal/Admin role
- Check database connection
- Verify school_id is correct

## Future Enhancements

Potential improvements:
- Per-role settings (different for different user roles)
- Conditional visibility (e.g., only show for certain classes)
- Grouping/categorization in UI
- Bulk enable/disable operations
- Export/import settings


