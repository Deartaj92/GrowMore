import { supabase } from '../supabaseClient';
import { syncPermissionsFromMenuStructure } from './permissionSyncService';

export interface Permission {
  id: number;
  key: string;
  name: string;
  description: string | null;
  category: string;
  path: string | null;
}

// Sync permissions on module load (runs once when the service is imported)
let syncPromise: Promise<void> | null = null;
export function ensurePermissionsSynced(): Promise<void> {
  if (!syncPromise) {
    syncPromise = syncPermissionsFromMenuStructure();
  }
  return syncPromise;
}

/**
 * Check if a user has a specific permission
 * 
 * Logic:
 * - If user has saved user_permissions → check ONLY those (complete override)
 * - If user has NO saved user_permissions → check role default permissions
 */
export async function hasPermission(
  userId: number,
  permissionKey: string,
  schoolId: number
): Promise<boolean> {
  try {
    // First, get the permission by key
    const { data: permission, error: permError } = await supabase
      .from('permissions')
      .select('id')
      .eq('key', permissionKey)
      .maybeSingle();

    if (permError || !permission) {
      return false;
    }

    // Check if user has any saved user permissions
    const { data: userPermissions, error: userPermError } = await supabase
      .from('user_permissions')
      .select('permission_id, granted')
      .eq('user_id', userId);

    // If user has saved permissions, check ONLY those (complete override)
    if (!userPermError && userPermissions && userPermissions.length > 0) {
      const userPermission = userPermissions.find(up => up.permission_id === permission.id);
      if (userPermission !== undefined) {
        // User has explicit permission record, return that
        return userPermission.granted === true;
      }
      // Permission not in user's saved list, so denied
      return false;
    }

    // If no user permissions saved, check role default permissions using role_id from users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role_id')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user || !user.role_id) {
      return false;
    }

    const { data: rolePermissions, error: rolePermError } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', user.role_id)
      .eq('permission_id', permission.id);

    if (rolePermError || !rolePermissions || rolePermissions.length === 0) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Get all permissions for a user (from roles and user-specific overrides)
 * Returns a Set of permission keys
 * 
 * Logic:
 * - If user has saved user_permissions → use ONLY those (complete override)
 * - If user has NO saved user_permissions → use role default permissions
 */
export async function getUserPermissions(
  userId: number,
  schoolId: number
): Promise<Set<string>> {
  try {
    const permissionKeys = new Set<string>();

    // First, check if user has any saved user permissions
    const { data: userPermissions, error: userPermError } = await supabase
      .from('user_permissions')
      .select('permission_id, granted, permissions!inner(key)')
      .eq('user_id', userId);

    // If user has saved permissions, use ONLY those (complete override)
    if (!userPermError && userPermissions && userPermissions.length > 0) {
      userPermissions.forEach((up: any) => {
        if (up.permissions?.key && up.granted === true) {
          permissionKeys.add(up.permissions.key);
        }
      });
      return permissionKeys;
    }

    // If no user permissions saved, use role default permissions using role_id from users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role_id')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user || !user.role_id) {
      return permissionKeys;
    }

    // Get role permissions (defaults) for the user's role_id
    const { data: rolePermissions, error: rolePermError } = await supabase
      .from('role_permissions')
      .select('permission_id, permissions!inner(key)')
      .eq('role_id', user.role_id);

    if (!rolePermError && rolePermissions) {
      rolePermissions.forEach((rp: any) => {
        if (rp.permissions?.key) {
          permissionKeys.add(rp.permissions.key);
        }
      });
    }

    return permissionKeys;
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return new Set<string>();
  }
}

/**
 * Check if a user has permission to access a specific path
 */
export async function hasPathPermission(
  userId: number,
  path: string,
  schoolId: number
): Promise<boolean> {
  try {
    // Get permission by path
    const { data: permission, error: permError } = await supabase
      .from('permissions')
      .select('id, key')
      .eq('path', path)
      .maybeSingle();

    if (permError || !permission) {
      return false;
    }

    return hasPermission(userId, permission.key, schoolId);
  } catch (error) {
    console.error('Error checking path permission:', error);
    return false;
  }
}

