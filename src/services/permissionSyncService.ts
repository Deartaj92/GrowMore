import React from 'react';
import { supabase } from '../supabaseClient';
import { menuStructure, MenuItem as MenuItemType } from '../components/Layout/menuStructure';
import { getPermissionKeyForPath } from '../utils/permissionMapping';
import { Dashboard as DashboardIcon, Person as PersonIcon, Work as WorkIcon } from '@mui/icons-material';

/**
 * Extract all menu items from the menu structure
 */
function getAllMenuItems(): MenuItemType[] {
  const items: MenuItemType[] = [];
  
  menuStructure.forEach(menu => {
    menu.menuItems.forEach(section => {
      items.push(...section.items);
      if (section.expenseItems) {
        items.push(...section.expenseItems);
      }
    });
  });
  
  // Add standalone pages (not in menu structure but need permissions)
  // These are handled in the "Other Pages" section of RoleManagement
  const standalonePages = [
    {
      title: 'Dashboard',
      description: 'View comprehensive dashboard with attendance, fees, admissions, and homework analytics',
      path: '/dashboard',
      color: '#6366f1',
      icon: React.createElement(DashboardIcon)
    },
    {
      title: 'Student Profile',
      description: 'View detailed student profile including attendance, exams, fees, and reports',
      path: '/students/profile/:id',
      color: '#3b82f6',
      icon: React.createElement(PersonIcon)
    },
    {
      title: 'Teacher Profile',
      description: 'View detailed teacher profile including attendance, timetable, test analysis, and diary assignments',
      path: '/profile',
      color: '#8b5cf6',
      icon: React.createElement(WorkIcon)
    }
  ];
  
  items.push(...standalonePages);
  
  return items;
}

/**
 * Get category from path (for organizing permissions)
 */
function getCategoryFromPath(path: string): string {
  if (path.startsWith('/students')) return 'Students';
  if (path.startsWith('/attendance')) return 'Attendance';
  if (path.startsWith('/reports')) return 'Reports';
  if (path.startsWith('/employees')) return 'Employees';
  if (path.startsWith('/fee') || path.startsWith('/concessions') || path.startsWith('/payment') || path.startsWith('/ledger')) return 'Fee Management';
  if (path.startsWith('/expense')) return 'Finance';
  if (path.startsWith('/fines')) return 'Fine Management';
  if (path.startsWith('/students/general-message') || path.startsWith('/settings/user-announcements')) return 'Communication';
  if (path.startsWith('/enquiries')) return 'Communication';
  if (path.startsWith('/examinations') || path.startsWith('/marks-entry') || path.startsWith('/master-sheets') || path.startsWith('/dmc') || path.startsWith('/position') || path.startsWith('/exam-analytics') || path.startsWith('/subjects') || path.startsWith('/examination-configuration')) return 'Academics';
  if (path.startsWith('/test')) return 'Academics';
  if (path.startsWith('/homework-diary') || path.startsWith('/diary-analytics')) return 'Academics';
  if (path.startsWith('/settings')) return 'Settings';
  if (path.startsWith('/dashboard')) return 'Dashboard';
  return 'Other';
}

/**
 * Sync permissions from menu structure to database
 * Creates missing permissions automatically
 */
export async function syncPermissionsFromMenuStructure(): Promise<void> {
  try {
    const menuItems = getAllMenuItems();
    const permissionsToSync: Array<{
      key: string;
      name: string;
      description: string;
      category: string;
      path: string;
    }> = [];

    // Collect all permissions from menu items
    menuItems.forEach(item => {
      const permissionKey = getPermissionKeyForPath(item.path);
      if (permissionKey) {
        permissionsToSync.push({
          key: permissionKey,
          name: item.title,
          description: item.description,
          category: getCategoryFromPath(item.path),
          path: item.path
        });
      }
    });

    if (permissionsToSync.length === 0) {
      console.log('No permissions to sync');
      return;
    }

    // Get existing permissions
    const { data: existingPermissions, error: fetchError } = await supabase
      .from('permissions')
      .select('key');

    if (fetchError) {
      console.error('Error fetching existing permissions:', fetchError);
      return;
    }

    const existingKeys = new Set((existingPermissions || []).map(p => p.key));

    // Find missing permissions
    const missingPermissions = permissionsToSync.filter(
      p => !existingKeys.has(p.key)
    );

    if (missingPermissions.length === 0) {
      console.log('All permissions are already synced');
      return;
    }

    // Insert missing permissions
    const { error: insertError } = await supabase
      .from('permissions')
      .insert(missingPermissions);

    if (insertError) {
      console.error('Error syncing permissions:', insertError);
      return;
    }

    console.log(`Synced ${missingPermissions.length} new permission(s) from menu structure:`, missingPermissions.map(p => p.key));
  } catch (error) {
    console.error('Error in syncPermissionsFromMenuStructure:', error);
  }
}

