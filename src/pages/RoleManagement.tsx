import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import styled from 'styled-components';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  Search as SearchIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  WhatsApp as WhatsAppIcon,
  AccountBalanceWallet,
  AccountBalance as AccountBalanceIcon,
} from '@mui/icons-material';
import { useToast } from '../components/useToast';
import { menuStructure, MenuItem as MenuItemType, MenuSection } from '../components/Layout/menuStructure';
import { getPermissionKeyForPath } from '../utils/permissionMapping';
import Loader from '../components/Loader';

const Container = styled.div`
  width: 100%;
  height: calc(100vh - 44px);
  background: ${({ theme }) => theme.BG};
  padding: 1.5rem 2rem;
  padding-bottom: 3.5rem;
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  @media (max-width: 768px) {
    padding: 1rem;
    padding-bottom: 3.5rem;
    height: calc(100vh - 44px);
  }
`;

const StickyFooter = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${({ theme }) => theme.CARD};
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  padding: 0.5rem 2rem;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  box-shadow: 0 -1px 5px rgba(0, 0, 0, 0.05);
  z-index: 1000;

  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
  }
`;

const Header = styled.div`
  margin-bottom: 1.5rem;
`;

const Title = styled.h1`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0;
`;

const Button = styled.button<{ $variant?: 'primary' | 'danger' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  ${({ $variant, theme }) => {
    if ($variant === 'primary') {
      return `
        background: ${theme.ACCENT || '#6366f1'};
        color: #fff;
        &:hover {
          background: ${theme.ACCENT ? theme.ACCENT + 'dd' : '#4f46e5'};
          transform: translateY(-1px);
        }
        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `;
    } else if ($variant === 'danger') {
      return `
        background: #ef4444;
        color: #fff;
        &:hover {
          background: #dc2626;
        }
      `;
    } else {
      return `
        background: ${theme.CARD};
        color: ${theme.TEXT_PRIMARY};
        border: 1px solid ${theme.BORDER};
        &:hover {
          background: ${theme.BG};
        }
      `;
    }
  }}
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const RoleSection = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 1.5rem;
`;

const RoleHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const RoleSelectWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 200px;
`;

const RoleSelect = styled.select`
  flex: 1;
  padding: 0.625rem 1rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.ACCENT || '#6366f1'};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT || '#6366f1'};
    box-shadow: 0 0 0 3px ${({ theme }) => (theme.ACCENT || '#6366f1')}22;
  }
`;

const AddRoleForm = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  padding: 1rem;
  background: ${({ theme }) => theme.BG};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  margin-top: 1rem;
`;

const Input = styled.input`
  flex: 1;
  min-width: 150px;
  padding: 0.625rem 1rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT || '#6366f1'};
    box-shadow: 0 0 0 3px ${({ theme }) => (theme.ACCENT || '#6366f1')}22;
  }

  &::placeholder {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
  }
`;

// Menu structure matching header
const MenuContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const MenuSectionWrapper = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const MenuSectionHeader = styled.button<{ $isOpen: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  background: ${props => props.$isOpen ? props.theme.BG : 'transparent'};
  color: ${props => props.theme.TEXT_PRIMARY};
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.2s ease;
  width: 100%;
  text-align: left;
  margin-bottom: ${props => props.$isOpen ? '1rem' : '0'};
  
  &:hover {
    background: ${props => props.theme.BG};
  }
  
  svg {
    font-size: 20px;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }
`;

const MenuDropdown = styled.div<{ $isOpen: boolean; $columns?: number }>`
  display: ${props => props.$isOpen ? (props.$columns === 1 ? 'block' : 'grid') : 'none'};
  grid-template-columns: ${props => {
    if (!props.$columns || props.$columns === 1) return '1fr';
    if (props.$columns === 2) return 'repeat(2, 1fr)';
    if (props.$columns === 3) return 'repeat(3, 1fr)';
    return `repeat(${props.$columns}, 1fr)`;
  }};
  gap: 16px;
  width: 100%;
  box-sizing: border-box;
  
  @media (max-width: 1400px) {
    ${props => props.$columns === 3 && `
      grid-template-columns: repeat(2, 1fr);
    `}
  }
  
  @media (max-width: 1024px) {
    ${props => {
      if (props.$columns === 3) {
        return `grid-template-columns: repeat(2, 1fr);`;
      }
      if (props.$columns === 2) {
        return `grid-template-columns: 1fr;`;
      }
      return '';
    }}
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr !important;
    gap: 12px;
  }
`;

const DropdownColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  max-height: 600px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem;
  margin-right: -0.5rem;
  
  &:not(:last-child)::after {
    content: '';
    position: absolute;
    right: -8px;
    top: 0;
    bottom: 0;
    width: 1px;
    background: ${props => props.theme.BORDER};
  }

  /* Custom scrollbar styling - visible */
  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG};
    border-radius: 5px;
    border: 1px solid ${({ theme }) => theme.BORDER};
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.ACCENT || '#6366f1'};
    border-radius: 5px;
    border: 2px solid ${({ theme }) => theme.BG};
    min-height: 30px;
    
    &:hover {
      background: ${({ theme }) => theme.ACCENT ? theme.ACCENT + 'dd' : '#4f46e5'};
    }
  }

  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => (theme.ACCENT || '#6366f1') + ' ' + theme.BG};
`;

const ColumnSeparator = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.BORDER};
  margin: 8px 0;
`;

const ColumnTitle = styled.h3`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${props => props.theme.TEXT_PRIMARY};
  margin: 0 0 10px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid ${props => props.theme.BORDER};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: sticky;
  top: 0;
  background: ${props => props.theme.CARD};
  z-index: 1;
  padding-top: 4px;
  margin-top: -4px;
`;

const DropdownMenuItem = styled.label<{ $color: string; $checked: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 2px solid ${props => props.$checked 
    ? props.$color 
    : props.theme.BORDER};
  background: ${props => props.$checked 
    ? `${props.$color}15` 
    : props.theme.CARD};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
  position: relative;
  
  &:hover {
    background: ${props => props.$checked 
      ? `${props.$color}25` 
      : props.theme.BG};
    border-color: ${props => props.$color};
    transform: translateX(3px);
  }

  input[type="checkbox"] {
    display: none;
  }
  
  .checkbox-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid ${props => props.$checked ? props.$color : props.theme.BORDER};
    background: ${props => props.$checked ? props.$color : 'transparent'};
    flex-shrink: 0;
    transition: all 0.2s ease;
    
    svg {
      font-size: 14px;
      color: white;
    }
  }
  
  .menu-icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: ${props => props.$checked 
      ? `linear-gradient(135deg, ${props.$color} 0%, ${props.$color}dd 100%)`
      : `linear-gradient(135deg, ${props.$color}40 0%, ${props.$color}60 100%)`};
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
    box-shadow: ${props => props.$checked 
      ? `0 2px 8px ${props.$color}60`
      : `0 1px 3px ${props.$color}20`};
    opacity: ${props => props.$checked ? 1 : 0.5};
    transition: all 0.2s ease;
    
    svg {
      font-size: 18px;
    }
  }
  
  .menu-content {
    flex: 1;
    min-width: 0;
  }
  
  .menu-title {
    font-size: 0.8rem;
    font-weight: ${props => props.$checked ? 700 : 600};
    color: ${props => props.$checked 
      ? props.$color 
      : props.theme.TEXT_PRIMARY};
    margin: 0 0 3px 0;
    line-height: 1.2;
    transition: all 0.2s ease;
  }
  
  .menu-description {
    font-size: 0.7rem;
    color: ${props => props.$checked 
      ? props.theme.TEXT_PRIMARY 
      : props.theme.TEXT_SECONDARY};
    margin: 0;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    transition: all 0.2s ease;
  }
`;

const SearchBox = styled.div`
  position: relative;
  margin-bottom: 1.5rem;
  display: flex;
  gap: 0.75rem;
  align-items: center;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ACCENT || '#6366f1'};
    box-shadow: 0 0 0 3px ${({ theme }) => (theme.ACCENT || '#6366f1')}22;
  }

  &::placeholder {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
  }
`;

const SearchIconWrapper = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  display: flex;
  align-items: center;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const RoleDescription = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 0.5rem;
  font-style: italic;
`;

interface Role {
  id: number;
  name: string;
  description: string | null;
  is_system_role: boolean;
}

interface Permission {
  id: number;
  key: string;
  name: string;
  description: string | null;
  category: string;
  path?: string;
}

const RoleManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [showAddRole, setShowAddRole] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set([...menuStructure.map(m => m.label), 'Standalone Pages/Features']));

  // Create a map of permission keys to permission IDs
  const permissionKeyToId = useMemo(() => {
    const map = new Map<string, number>();
    permissions.forEach(p => {
      map.set(p.key, p.id);
    });
    return map;
  }, [permissions]);

  // Get WhatsApp notification permission
  const whatsappPermissionId = useMemo(() => {
    return permissionKeyToId.get('attendance.send_whatsapp_notifications') || null;
  }, [permissionKeyToId]);

  // Check if WhatsApp permission is checked
  const isWhatsAppPermissionChecked = (): boolean => {
    if (!whatsappPermissionId) return false;
    return rolePermissions.has(whatsappPermissionId);
  };

  // Find permission ID for a menu item path
  const getPermissionIdForPath = (path: string): number | null => {
    const permissionKey = getPermissionKeyForPath(path);
    if (!permissionKey) return null;
    return permissionKeyToId.get(permissionKey) || null;
  };

  // Check if a menu item is checked
  const isMenuItemChecked = (menuItem: MenuItemType): boolean => {
    const permissionId = getPermissionIdForPath(menuItem.path);
    if (!permissionId) return false;
    return rolePermissions.has(permissionId);
  };

  // Toggle menu item permission
  const toggleMenuItemPermission = (menuItem: MenuItemType) => {
    const permissionId = getPermissionIdForPath(menuItem.path);
    if (!permissionId) return;
    handlePermissionToggle(permissionId);
  };

  // Toggle menu section open/close
  const toggleMenu = (menuLabel: string) => {
    const newOpen = new Set(openMenus);
    if (newOpen.has(menuLabel)) {
      newOpen.delete(menuLabel);
    } else {
      newOpen.add(menuLabel);
    }
    setOpenMenus(newOpen);
  };

  // Filter menu items by search query
  const filteredMenuStructure = useMemo(() => {
    if (!searchQuery.trim()) return menuStructure;

    const query = searchQuery.toLowerCase();
    return menuStructure.map(menu => {
      const filteredSections = menu.menuItems.map(section => {
        const filteredItems = section.items.filter(item => 
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
        );
        const filteredExpenseItems = section.expenseItems?.filter(item =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
        );
        return {
          ...section,
          items: filteredItems,
          ...(section.expenseItems && { expenseItems: filteredExpenseItems })
        };
      }).filter(section => 
        section.items.length > 0 || (section.expenseItems && section.expenseItems.length > 0)
      );

      return {
        ...menu,
        menuItems: filteredSections
      };
    }).filter(menu => menu.menuItems.length > 0);
  }, [searchQuery]);

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    if (!user?.school_id) return;

    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('school_id', user.school_id)
        .order('name');

      if (error) throw error;
      setRoles(data || []);
      
      if (data && data.length > 0 && !selectedRoleId) {
        setSelectedRoleId(data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching roles:', error);
      showToast('Failed to load roles', 'error');
    }
  }, [user?.school_id, selectedRoleId, showToast]);

  // Fetch permissions
  const fetchPermissions = useCallback(async () => {
    try {
      // Sync permissions from menu structure first
      const { ensurePermissionsSynced } = await import('../services/permissionService');
      await ensurePermissionsSynced();

      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('category, name');

      if (error) throw error;
      setPermissions(data || []);
    } catch (error: any) {
      console.error('Error fetching permissions:', error);
      showToast('Failed to load permissions', 'error');
    }
  }, [showToast]);

  // Fetch role permissions
  const fetchRolePermissions = useCallback(async (roleId: number) => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', roleId);

      if (error) throw error;
      setRolePermissions(new Set((data || []).map(rp => rp.permission_id)));
    } catch (error: any) {
      console.error('Error fetching role permissions:', error);
      showToast('Failed to load role permissions', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRoles(), fetchPermissions()]);
      setLoading(false);
    };
    loadData();
  }, [fetchRoles, fetchPermissions]);

  useEffect(() => {
    if (selectedRoleId) {
      fetchRolePermissions(selectedRoleId);
    }
  }, [selectedRoleId, fetchRolePermissions]);

  const handlePermissionToggle = (permissionId: number) => {
    const newPermissions = new Set(rolePermissions);
    if (newPermissions.has(permissionId)) {
      newPermissions.delete(permissionId);
    } else {
      newPermissions.add(permissionId);
    }
    setRolePermissions(newPermissions);
  };

  // Get all menu items from structure
  const getAllMenuItems = (): MenuItemType[] => {
    const items: MenuItemType[] = [];
    menuStructure.forEach(menu => {
      menu.menuItems.forEach(section => {
        items.push(...section.items);
        if (section.expenseItems) {
          items.push(...section.expenseItems);
        }
      });
    });
    return items;
  };

  // Get all permission IDs for menu items (including standalone pages and features)
  const getAllMenuPermissionIds = (): number[] => {
    const items = getAllMenuItems();
    const menuPermissionIds = items
      .map(item => getPermissionIdForPath(item.path))
      .filter((id): id is number => id !== null);
    
    // Also include standalone pages (Standalone Pages/Features section)
    const standalonePages = [
      '/dashboard',
      '/students/profile/:id',
      '/profile',
      '/setup-accounts',
      '/balance-sheet'
    ];
    const standalonePermissionIds = standalonePages
      .map(path => getPermissionIdForPath(path))
      .filter((id): id is number => id !== null);
    
    // Also include WhatsApp notification permission
    const featurePermissionIds: number[] = [];
    if (whatsappPermissionId) {
      featurePermissionIds.push(whatsappPermissionId);
    }
    
    // Combine and return unique IDs
    return Array.from(new Set([...menuPermissionIds, ...standalonePermissionIds, ...featurePermissionIds]));
  };

  const handleSelectAll = () => {
    const allPermissionIds = getAllMenuPermissionIds();
    setRolePermissions(new Set(allPermissionIds));
  };

  const handleDeselectAll = () => {
    setRolePermissions(new Set());
  };

  const handleSelectSection = (section: MenuSection) => {
    const newPermissions = new Set(rolePermissions);
    section.items.forEach(item => {
      const permissionId = getPermissionIdForPath(item.path);
      if (permissionId) newPermissions.add(permissionId);
    });
    if (section.expenseItems) {
      section.expenseItems.forEach(item => {
        const permissionId = getPermissionIdForPath(item.path);
        if (permissionId) newPermissions.add(permissionId);
      });
    }
    setRolePermissions(newPermissions);
  };

  const handleDeselectSection = (section: MenuSection) => {
    const newPermissions = new Set(rolePermissions);
    section.items.forEach(item => {
      const permissionId = getPermissionIdForPath(item.path);
      if (permissionId) newPermissions.delete(permissionId);
    });
    if (section.expenseItems) {
      section.expenseItems.forEach(item => {
        const permissionId = getPermissionIdForPath(item.path);
        if (permissionId) newPermissions.delete(permissionId);
      });
    }
    setRolePermissions(newPermissions);
  };

  const isSectionAllSelected = (section: MenuSection): boolean => {
    const allItems = [...section.items, ...(section.expenseItems || [])];
    if (allItems.length === 0) return false;
    return allItems.every(item => {
      const permissionId = getPermissionIdForPath(item.path);
      return permissionId !== null && rolePermissions.has(permissionId);
    });
  };

  const isAllSelected = (): boolean => {
    const allPermissionIds = getAllMenuPermissionIds();
    if (allPermissionIds.length === 0) return false;
    return allPermissionIds.every(id => rolePermissions.has(id));
  };

  const handleSave = async () => {
    if (!selectedRoleId || !user?.school_id) return;

    setSaving(true);
    try {
      // Delete existing permissions
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', selectedRoleId);

      // Insert new permissions
      if (rolePermissions.size > 0) {
        const permissionsToInsert = Array.from(rolePermissions).map(permissionId => ({
          role_id: selectedRoleId,
          permission_id: permissionId
        }));

        const { error } = await supabase
          .from('role_permissions')
          .insert(permissionsToInsert);

        if (error) throw error;
      }

      showToast('Permissions saved successfully', 'success');
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      showToast('Failed to save permissions', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim() || !user?.school_id) return;

    try {
      const { data, error } = await supabase
        .from('roles')
        .insert({
          school_id: user.school_id,
          name: newRoleName.trim(),
          description: newRoleDescription.trim() || null,
          is_system_role: false
        })
        .select()
        .single();

      if (error) throw error;

      setRoles([...roles, data]);
      setSelectedRoleId(data.id);
      setNewRoleName('');
      setNewRoleDescription('');
      setShowAddRole(false);
      showToast('Role created successfully', 'success');
    } catch (error: any) {
      console.error('Error creating role:', error);
      showToast(error.message || 'Failed to create role', 'error');
    }
  };

  const handleDeleteRole = async (roleId: number, roleName: string) => {
    if (!window.confirm(`Delete role "${roleName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId)
        .eq('is_system_role', false);

      if (error) throw error;

      setRoles(roles.filter(r => r.id !== roleId));
      if (selectedRoleId === roleId && roles.length > 1) {
        setSelectedRoleId(roles.find(r => r.id !== roleId)?.id || null);
      } else if (roles.length === 1) {
        setSelectedRoleId(null);
      }
      showToast('Role deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting role:', error);
      showToast(error.message || 'Failed to delete role', 'error');
    }
  };

  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const hasChanges = rolePermissions.size > 0;

  if (loading) {
    return <Loader />;
  }

  return (
    <>
      <Container>
        <Header>
          <Title>Role & Access Management</Title>
        </Header>

        <Content>
        <RoleSection>
          <RoleHeader>
            <RoleSelectWrapper>
              <RoleSelect
                value={selectedRoleId || ''}
                onChange={(e) => setSelectedRoleId(Number(e.target.value) || null)}
              >
                <option value="">-- Select a role --</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name} {role.is_system_role && '(System)'}
                  </option>
                ))}
              </RoleSelect>
              {selectedRole && !selectedRole.is_system_role && (
                <Button
                  $variant="danger"
                  onClick={() => handleDeleteRole(selectedRole.id, selectedRole.name)}
                >
                  <DeleteIcon />
                  Delete
                </Button>
              )}
            </RoleSelectWrapper>
            {!showAddRole ? (
              <Button onClick={() => setShowAddRole(true)}>
                <AddIcon />
                New Role
              </Button>
            ) : (
              <Button $variant="secondary" onClick={() => {
                setShowAddRole(false);
                setNewRoleName('');
                setNewRoleDescription('');
              }}>
                Cancel
              </Button>
            )}
          </RoleHeader>
          
          {selectedRole && (
            <>
              {selectedRole.description && (
                <RoleDescription>{selectedRole.description}</RoleDescription>
              )}
              <RoleDescription style={{ marginTop: selectedRole.description ? '0.5rem' : '0' }}>
                <strong>Default Permissions:</strong> Permissions assigned to this role are the default permissions 
                for all users with this role. To customize permissions for individual users, use the User Permission Management page.
              </RoleDescription>
            </>
          )}

          {showAddRole && (
            <AddRoleForm>
              <Input
                type="text"
                placeholder="Role name"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddRole()}
              />
              <Input
                type="text"
                placeholder="Description (optional)"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddRole()}
              />
              <Button $variant="primary" onClick={handleAddRole} disabled={!newRoleName.trim()}>
                <AddIcon />
                Create
              </Button>
            </AddRoleForm>
          )}
        </RoleSection>

        {selectedRoleId ? (
          <>
            <SearchBox>
              <SearchIconWrapper>
                <SearchIcon style={{ fontSize: '1.2rem' }} />
              </SearchIconWrapper>
              <SearchInput
                type="text"
                placeholder="Search permissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button 
                $variant="secondary" 
                onClick={isAllSelected() ? handleDeselectAll : handleSelectAll}
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}
              >
                {isAllSelected() ? 'Deselect All' : 'Select All'}
              </Button>
            </SearchBox>

            <MenuContainer>
              {filteredMenuStructure.map((menu) => {
                const isOpen = openMenus.has(menu.label);
                
                return (
                  <MenuSectionWrapper key={menu.label}>
                    <MenuSectionHeader
                      $isOpen={isOpen}
                      onClick={() => toggleMenu(menu.label)}
                    >
                      {menu.icon}
                      <span>{menu.label}</span>
                    </MenuSectionHeader>
                    <MenuDropdown $isOpen={isOpen} $columns={menu.columns}>
                      {menu.menuItems.map((section, sectionIdx) => (
                        <DropdownColumn key={sectionIdx}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                          }}>
                            <ColumnTitle>{section.title}</ColumnTitle>
                            <Button
                              $variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isSectionAllSelected(section)) {
                                  handleDeselectSection(section);
                                } else {
                                  handleSelectSection(section);
                                }
                              }}
                              style={{ 
                                fontSize: '0.7rem', 
                                padding: '0.25rem 0.5rem',
                                minWidth: 'auto'
                              }}
                            >
                              {isSectionAllSelected(section) ? 'Deselect All' : 'Select All'}
                            </Button>
                          </div>
                          {section.items.map((menuItem, itemIdx) => {
                            const isChecked = isMenuItemChecked(menuItem);
                            const checkboxId = `checkbox-${menuItem.path}-${itemIdx}`;
                            return (
                              <DropdownMenuItem
                                key={itemIdx}
                                $color={menuItem.color}
                                $checked={isChecked}
                                htmlFor={checkboxId}
                              >
                                <input
                                  type="checkbox"
                                  id={checkboxId}
                                  checked={isChecked}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleMenuItemPermission(menuItem);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                />
                                <div className="checkbox-indicator">
                                  {isChecked ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
                                </div>
                                <div className="menu-icon">
                                  {menuItem.icon}
                                </div>
                                <div className="menu-content">
                                  <div className="menu-title">{menuItem.title}</div>
                                  <div className="menu-description">{menuItem.description}</div>
                                </div>
                              </DropdownMenuItem>
                            );
                          })}
                          {section.expenseItems && (
                            <>
                              <ColumnSeparator />
                              {section.expenseItems.map((menuItem, itemIdx) => {
                                const isChecked = isMenuItemChecked(menuItem);
                                const checkboxId = `checkbox-expense-${menuItem.path}-${itemIdx}`;
                                return (
                                  <DropdownMenuItem
                                    key={`expense-${itemIdx}`}
                                    $color={menuItem.color}
                                    $checked={isChecked}
                                    htmlFor={checkboxId}
                                  >
                                    <input
                                      type="checkbox"
                                      id={checkboxId}
                                      checked={isChecked}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        toggleMenuItemPermission(menuItem);
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                    />
                                    <div className="checkbox-indicator">
                                      {isChecked ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
                                    </div>
                                    <div className="menu-icon">
                                      {menuItem.icon}
                                    </div>
                                    <div className="menu-content">
                                      <div className="menu-title">{menuItem.title}</div>
                                      <div className="menu-description">{menuItem.description}</div>
                                    </div>
                                  </DropdownMenuItem>
                                );
                              })}
                            </>
                          )}
                        </DropdownColumn>
                      ))}
                    </MenuDropdown>
                  </MenuSectionWrapper>
                );
              })}
            </MenuContainer>

            {filteredMenuStructure.length === 0 && (
              <EmptyState>
                <p>No menu items found matching your search.</p>
              </EmptyState>
            )}

            {/* Standalone Pages/Features Section */}
            <MenuSectionWrapper>
              <MenuSectionHeader
                $isOpen={openMenus.has('Standalone Pages/Features')}
                onClick={() => toggleMenu('Standalone Pages/Features')}
              >
                <PersonIcon />
                <span>Standalone Pages/Features</span>
              </MenuSectionHeader>
              <MenuDropdown $isOpen={openMenus.has('Standalone Pages/Features')} $columns={2}>
                {/* Pages Column */}
                <DropdownColumn>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <ColumnTitle>Pages</ColumnTitle>
                    <Button
                      $variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        const standalonePages = [
                          { path: '/dashboard' },
                          { path: '/students/profile/:id' },
                          { path: '/profile' },
                          { path: '/setup-accounts' },
                          { path: '/balance-sheet' }
                        ];
                        const allSelected = standalonePages.every(page => {
                          const permissionId = getPermissionIdForPath(page.path);
                          return permissionId !== null && rolePermissions.has(permissionId);
                        });
                        
                        const newPermissions = new Set(rolePermissions);
                        standalonePages.forEach(page => {
                          const permissionId = getPermissionIdForPath(page.path);
                          if (permissionId) {
                            if (allSelected) {
                              // Deselect all
                              newPermissions.delete(permissionId);
                            } else {
                              // Select all
                              newPermissions.add(permissionId);
                            }
                          }
                        });
                        setRolePermissions(newPermissions);
                      }}
                      style={{ 
                        fontSize: '0.7rem', 
                        padding: '0.25rem 0.5rem',
                        minWidth: 'auto'
                      }}
                    >
                      {(() => {
                        const standalonePages = [
                          { path: '/dashboard' },
                          { path: '/students/profile/:id' },
                          { path: '/profile' },
                          { path: '/setup-accounts' },
                          { path: '/balance-sheet' }
                        ];
                        const allSelected = standalonePages.every(page => {
                          const permissionId = getPermissionIdForPath(page.path);
                          return permissionId !== null && rolePermissions.has(permissionId);
                        });
                        return allSelected ? 'Deselect All' : 'Select All';
                      })()}
                    </Button>
                  </div>
                  {[
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
                    },
                    { 
                      title: 'Setup Accounts', 
                      description: 'Manage bank accounts, EasyPaisa, JazzCash and other payment accounts',
                      path: '/setup-accounts', 
                      color: '#3b82f6', 
                      icon: React.createElement(AccountBalanceWallet) 
                    }
                  ].map((pageItem, itemIdx) => {
                    const isChecked = isMenuItemChecked(pageItem);
                    return (
                      <DropdownMenuItem
                        key={itemIdx}
                        $color={pageItem.color}
                        $checked={isChecked}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleMenuItemPermission(pageItem)}
                        />
                        <div className="checkbox-indicator">
                          {isChecked ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
                        </div>
                        <div className="menu-icon">
                          {pageItem.icon}
                        </div>
                        <div className="menu-content">
                          <div className="menu-title">{pageItem.title}</div>
                          <div className="menu-description">{pageItem.description}</div>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownColumn>
                
                {/* Features Column */}
                <DropdownColumn>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <ColumnTitle>Features</ColumnTitle>
                    {whatsappPermissionId && (
                      <Button
                        $variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          const isChecked = isWhatsAppPermissionChecked();
                          const newPermissions = new Set(rolePermissions);
                          if (isChecked) {
                            newPermissions.delete(whatsappPermissionId);
                          } else {
                            newPermissions.add(whatsappPermissionId);
                          }
                          setRolePermissions(newPermissions);
                        }}
                        style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.25rem 0.5rem',
                          minWidth: 'auto'
                        }}
                      >
                        {isWhatsAppPermissionChecked() ? 'Deselect All' : 'Select All'}
                      </Button>
                    )}
                  </div>
                  {/* WhatsApp Notification Permission */}
                  {whatsappPermissionId && (
                    <DropdownMenuItem
                      $color="#25d366"
                      $checked={isWhatsAppPermissionChecked()}
                      htmlFor="whatsapp-notification-permission"
                    >
                      <input
                        type="checkbox"
                        id="whatsapp-notification-permission"
                        checked={isWhatsAppPermissionChecked()}
                        onChange={(e) => {
                          e.stopPropagation();
                          handlePermissionToggle(whatsappPermissionId);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      />
                      <div className="checkbox-indicator">
                        {isWhatsAppPermissionChecked() ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
                      </div>
                      <div className="menu-icon">
                        <WhatsAppIcon />
                      </div>
                      <div className="menu-content">
                        <div className="menu-title">Send WhatsApp Notifications</div>
                        <div className="menu-description">Allow sending WhatsApp and SMS notifications when marking attendance</div>
                      </div>
                    </DropdownMenuItem>
                  )}
                </DropdownColumn>
              </MenuDropdown>
            </MenuSectionWrapper>
          </>
        ) : (
          <EmptyState>
            <p>Please select a role to manage permissions</p>
            <RoleDescription style={{ marginTop: '1rem' }}>
              <strong>Note:</strong> Permissions assigned to a role are the default permissions for all users with that role. 
              To customize permissions for individual users, use the User Permission Management page.
            </RoleDescription>
          </EmptyState>
        )}
        </Content>
      </Container>
      {selectedRoleId && (
        <StickyFooter>
          <Button $variant="primary" onClick={handleSave} disabled={saving || !hasChanges} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            <SaveIcon style={{ fontSize: '1rem' }} />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </StickyFooter>
      )}
    </>
  );
};

export default RoleManagement;
