import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import styled from 'styled-components';
import {
  Save as SaveIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  Work as WorkIcon,
  RestartAlt as ResetIcon,
  Warning as WarningIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import { useToast } from '../components/useToast';
import { menuStructure, MenuItem as MenuItemType, MenuSection } from '../components/Layout/menuStructure';
import { getPermissionKeyForPath } from '../utils/permissionMapping';

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
  gap: 0.75rem;
  box-shadow: 0 -1px 5px rgba(0, 0, 0, 0.05);
  z-index: 1000;

  @media (max-width: 768px) {
    padding: 0.5rem 1rem;
  }
`;

// Reset Confirmation Modal
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
  box-sizing: border-box;
`;

const ModalBox = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  padding: 2rem;
  min-width: 320px;
  max-width: 95vw;
  width: 100%;
  max-width: 450px;
  position: relative;
  border: 1px solid ${({ theme }) => theme.BORDER};
  animation: slideIn 0.2s ease-out;
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

const ModalIconContainer = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${({ theme }) => theme.BG === '#252525' || theme.BG === '#181c2a' 
    ? 'rgba(239, 68, 68, 0.2)' 
    : 'rgba(239, 68, 68, 0.1)'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  color: #ef4444;
`;

const ModalTitleStyled = styled.h3`
  font-size: 1.3rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 0.75rem;
  text-align: center;
`;

const ModalMessageStyled = styled.p`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0 0 1.75rem;
  text-align: center;
  line-height: 1.6;
`;

const ModalButtonRow = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

const ModalButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  ${({ $variant, theme }) => {
    if ($variant === 'primary') {
      return `
        background: #ef4444;
        color: white;
        &:hover {
          background: #dc2626;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }
        &:active {
          transform: scale(0.98);
        }
      `;
    } else {
      return `
        background: ${theme.BG === '#252525' || theme.BG === '#181c2a' 
          ? 'rgba(255, 255, 255, 0.1)' 
          : 'rgba(0, 0, 0, 0.05)'};
        color: ${theme.TEXT_PRIMARY};
        border: 1px solid ${theme.BORDER};
        &:hover {
          background: ${theme.BG === '#252525' || theme.BG === '#181c2a' 
            ? 'rgba(255, 255, 255, 0.15)' 
            : 'rgba(0, 0, 0, 0.08)'};
        }
        &:active {
          transform: scale(0.98);
        }
      `;
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
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

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
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

const UserSection = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 1.5rem;
`;

const UserSelectWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 200px;
`;

const UserSelect = styled.select`
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

const UserInfo = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: ${({ theme }) => theme.BG};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
`;

const InfoRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;

  strong {
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    min-width: 120px;
  }

  span {
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const InfoNote = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  background: ${({ theme }) => theme.ACCENT ? theme.ACCENT + '15' : 'rgba(99, 102, 241, 0.1)'};
  border-left: 3px solid ${({ theme }) => theme.ACCENT || '#6366f1'};
  border-radius: 4px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
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

const DropdownMenuItem = styled.label<{ $color: string; $checked: boolean; $inherited?: boolean }>`
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
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

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  staff_id?: number;
}

interface Permission {
  id: number;
  key: string;
  name: string;
  description: string | null;
  category: string;
  path?: string;
}

interface UserPermission {
  permission_id: number;
  granted: boolean;
}

interface RolePermission {
  permission_id: number;
}

const UserPermissionManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userPermissions, setUserPermissions] = useState<Map<number, boolean>>(new Map()); // permission_id -> granted
  const [rolePermissions, setRolePermissions] = useState<Set<number>>(new Set()); // permission_ids from role
  const [userRoles, setUserRoles] = useState<number[]>([]); // role_ids for selected user
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set([...menuStructure.map(m => m.label), 'Standalone Pages/Features']));
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Get userId from URL params if available
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userId = params.get('userId');
    if (userId) {
      setSelectedUserId(Number(userId));
    }
  }, [location]);

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

  // Check if WhatsApp permission is granted
  const isWhatsAppPermissionGranted = (): boolean => {
    if (!whatsappPermissionId) return false;
    return isPermissionGranted(whatsappPermissionId);
  };

  // Check if WhatsApp permission is from role
  const isWhatsAppPermissionFromRole = (): boolean => {
    if (!whatsappPermissionId) return false;
    return isPermissionFromRole(whatsappPermissionId);
  };

  // Find permission ID for a menu item path
  const getPermissionIdForPath = (path: string): number | null => {
    const permissionKey = getPermissionKeyForPath(path);
    if (!permissionKey) return null;
    return permissionKeyToId.get(permissionKey) || null;
  };

  // Check if a menu item is granted
  const isMenuItemGranted = (menuItem: MenuItemType): boolean => {
    const permissionId = getPermissionIdForPath(menuItem.path);
    if (!permissionId) return false;
    return isPermissionGranted(permissionId);
  };

  // Check if a menu item is from role
  const isMenuItemFromRole = (menuItem: MenuItemType): boolean => {
    const permissionId = getPermissionIdForPath(menuItem.path);
    if (!permissionId) return false;
    return isPermissionFromRole(permissionId);
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

  // Fetch users
  const fetchUsers = useCallback(async () => {
    if (!user?.school_id) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, name, role, staff_id')
        .eq('school_id', user.school_id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      showToast('Failed to load users', 'error');
    }
  }, [user?.school_id, showToast]);

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

  // Fetch user role from users table (using role_id)
  const fetchUserRoles = useCallback(async (userId: number) => {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('role_id')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      
      const roleId = user?.role_id;
      setUserRoles(roleId ? [roleId] : []);

      // Fetch permissions from the user's role
      if (roleId) {
        const { data: rolePerms, error: permError } = await supabase
          .from('role_permissions')
          .select('permission_id')
          .eq('role_id', roleId);

        if (permError) throw permError;
        setRolePermissions(new Set((rolePerms || []).map(rp => rp.permission_id)));
      } else {
        setRolePermissions(new Set());
      }
    } catch (error: any) {
      console.error('Error fetching user role:', error);
      showToast('Failed to load user role', 'error');
    }
  }, [showToast]);

  // Fetch user-specific permissions
  const fetchUserPermissions = useCallback(async (userId: number) => {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('permission_id, granted')
        .eq('user_id', userId);

      if (error) throw error;
      const permMap = new Map<number, boolean>();
      (data || []).forEach(up => {
        permMap.set(up.permission_id, up.granted);
      });
      setUserPermissions(permMap);
    } catch (error: any) {
      console.error('Error fetching user permissions:', error);
      showToast('Failed to load user permissions', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchPermissions()]);
      setLoading(false);
    };
    loadData();
  }, [fetchUsers, fetchPermissions]);

  useEffect(() => {
    if (selectedUserId) {
      Promise.all([
        fetchUserRoles(selectedUserId),
        fetchUserPermissions(selectedUserId)
      ]);
    } else {
      setUserRoles([]);
      setRolePermissions(new Set());
      setUserPermissions(new Map());
    }
  }, [selectedUserId, fetchUserRoles, fetchUserPermissions]);

  // Check if permission is granted
  // Logic: If user has saved permissions, use those. Otherwise, use role defaults.
  const isPermissionGranted = (permissionId: number): boolean => {
    // If user has saved permissions (any user_permissions records exist), use those
    if (userPermissions.size > 0) {
      return userPermissions.get(permissionId) === true;
    }
    // If no user permissions saved, use role defaults
    return rolePermissions.has(permissionId);
  };

  // Check if permission is from role (not user override)
  // Only true if user has NO saved permissions AND permission is in role
  const isPermissionFromRole = (permissionId: number): boolean => {
    return userPermissions.size === 0 && rolePermissions.has(permissionId);
  };

  const handlePermissionToggle = (permissionId: number) => {
    const currentlyGranted = isPermissionGranted(permissionId);
    const hasSavedPermissions = userPermissions.size > 0;
    
    const newUserPerms = new Map(userPermissions);
    
    // If user has no saved permissions yet, initialize with role defaults
    if (!hasSavedPermissions) {
      // Copy all role permissions to user permissions first
      rolePermissions.forEach(rolePermId => {
        newUserPerms.set(rolePermId, true);
      });
    }
    
    // Now toggle the specific permission
    if (currentlyGranted) {
      newUserPerms.set(permissionId, false);
    } else {
      newUserPerms.set(permissionId, true);
    }
    
    setUserPermissions(newUserPerms);
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
      '/profile'
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
    const newUserPerms = new Map<number, boolean>();
    
    // If user has no saved permissions, start with role defaults
    if (userPermissions.size === 0) {
      rolePermissions.forEach(rolePermId => {
        newUserPerms.set(rolePermId, true);
      });
    } else {
      // If user already has saved permissions, copy them first
      userPermissions.forEach((granted, permId) => {
        newUserPerms.set(permId, granted);
      });
    }
    
    // Then add all menu permissions
    const allPermissionIds = getAllMenuPermissionIds();
    allPermissionIds.forEach(permissionId => {
      newUserPerms.set(permissionId, true);
    });
    
    setUserPermissions(newUserPerms);
  };

  const handleDeselectAll = () => {
    // If user has no saved permissions, we need to explicitly deny all
    if (userPermissions.size === 0) {
      const newUserPerms = new Map<number, boolean>();
      rolePermissions.forEach(rolePermId => {
        newUserPerms.set(rolePermId, false);
      });
      const allPermissionIds = getAllMenuPermissionIds();
      allPermissionIds.forEach(permissionId => {
        if (!rolePermissions.has(permissionId)) {
          newUserPerms.set(permissionId, false);
        }
      });
      setUserPermissions(newUserPerms);
    } else {
      const newUserPerms = new Map(userPermissions);
      const allPermissionIds = getAllMenuPermissionIds();
      allPermissionIds.forEach(permissionId => {
        newUserPerms.set(permissionId, false);
      });
      setUserPermissions(newUserPerms);
    }
  };

  const handleSelectSection = (section: MenuSection) => {
    const newUserPerms = new Map<number, boolean>();
    
    if (userPermissions.size === 0) {
      rolePermissions.forEach(rolePermId => {
        newUserPerms.set(rolePermId, true);
      });
    } else {
      userPermissions.forEach((granted, permId) => {
        newUserPerms.set(permId, granted);
      });
    }
    
    section.items.forEach(item => {
      const permissionId = getPermissionIdForPath(item.path);
      if (permissionId) newUserPerms.set(permissionId, true);
    });
    if (section.expenseItems) {
      section.expenseItems.forEach(item => {
        const permissionId = getPermissionIdForPath(item.path);
        if (permissionId) newUserPerms.set(permissionId, true);
      });
    }
    
    setUserPermissions(newUserPerms);
  };

  const handleDeselectSection = (section: MenuSection) => {
    const newUserPerms = new Map<number, boolean>();
    
    if (userPermissions.size === 0) {
      rolePermissions.forEach(rolePermId => {
        newUserPerms.set(rolePermId, true);
      });
    } else {
      userPermissions.forEach((granted, permId) => {
        newUserPerms.set(permId, granted);
      });
    }
    
    section.items.forEach(item => {
      const permissionId = getPermissionIdForPath(item.path);
      if (permissionId) newUserPerms.set(permissionId, false);
    });
    if (section.expenseItems) {
      section.expenseItems.forEach(item => {
        const permissionId = getPermissionIdForPath(item.path);
        if (permissionId) newUserPerms.set(permissionId, false);
      });
    }
    
    setUserPermissions(newUserPerms);
  };

  const isSectionAllSelected = (section: MenuSection): boolean => {
    const allItems = [...section.items, ...(section.expenseItems || [])];
    if (allItems.length === 0) return false;
    return allItems.every(item => {
      const permissionId = getPermissionIdForPath(item.path);
      return permissionId !== null && isPermissionGranted(permissionId);
    });
  };

  const isAllSelected = (): boolean => {
    const allPermissionIds = getAllMenuPermissionIds();
    if (allPermissionIds.length === 0) return false;
    return allPermissionIds.every(id => isPermissionGranted(id));
  };

  const handleSave = async () => {
    if (!selectedUserId || !user?.school_id) return;

    setSaving(true);
    try {
      // Delete all existing user permissions
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', selectedUserId);

      // Save ALL checked permissions for this user (complete override of role defaults)
      // When user permissions are saved, they completely replace role defaults
      const permissionsToInsert = Array.from(userPermissions.entries())
        .filter(([permissionId, granted]) => granted === true) // Only save granted permissions
        .map(([permissionId, granted]) => ({
          user_id: selectedUserId,
          permission_id: permissionId,
          granted: true
        }));

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from('user_permissions')
          .insert(permissionsToInsert);

        if (error) throw error;
      }

      showToast('User permissions saved successfully', 'success');
      
      // Refresh user permissions to reflect saved state
      await fetchUserPermissions(selectedUserId);
    } catch (error: any) {
      console.error('Error saving user permissions:', error);
      showToast('Failed to save user permissions', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = () => {
    setResetModalOpen(true);
  };

  const confirmResetToDefault = async () => {
    if (!selectedUserId || !user?.school_id) return;

    setResetModalOpen(false);
    setSaving(true);
    try {
      // Delete all existing user permissions (this will make user inherit from role)
      const { error } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', selectedUserId);

      if (error) throw error;

      showToast('User permissions reset to role defaults successfully', 'success');
      
      // Clear user permissions state (user will now inherit from role)
      setUserPermissions(new Map());
      
      // Refresh user permissions to reflect reset state
      await fetchUserPermissions(selectedUserId);
    } catch (error: any) {
      console.error('Error resetting user permissions:', error);
      showToast('Failed to reset user permissions', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);
  const hasChanges = userPermissions.size > 0;

  if (loading) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
          Loading...
        </div>
      </Container>
    );
  }

  return (
    <>
      <Container>
        <Header>
          <Title>User Permission Management</Title>
        </Header>

        <Content>
        <UserSection>
          <UserSelectWrapper>
            <UserSelect
              value={selectedUserId || ''}
              onChange={(e) => setSelectedUserId(Number(e.target.value) || null)}
            >
              <option value="">-- Select a user --</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.username}) - {user.role}
                </option>
              ))}
            </UserSelect>
          </UserSelectWrapper>

          {selectedUser && (
            <UserInfo>
              <InfoRow>
                <strong>Name:</strong>
                <span>{selectedUser.name}</span>
              </InfoRow>
              <InfoRow>
                <strong>Username:</strong>
                <span>{selectedUser.username}</span>
              </InfoRow>
              <InfoRow>
                <strong>Role:</strong>
                <span>{selectedUser.role}</span>
              </InfoRow>
              <InfoNote>
                <strong>User Permission Customization:</strong> By default, users inherit all permissions from their role 
                (set in Role Management). When you customize permissions for this user and save, those become their 
                complete set of permissions (replacing role defaults). To revert to role defaults, delete all user permissions.
                {userPermissions.size > 0 && (
                  <span style={{ display: 'block', marginTop: '0.5rem', fontWeight: 600 }}>
                    ⚠️ This user has custom permissions saved. Current selections will replace role defaults when saved.
                  </span>
                )}
              </InfoNote>
            </UserInfo>
          )}
        </UserSection>

        {selectedUserId ? (
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
                            const isGranted = isMenuItemGranted(menuItem);
                            const fromRole = isMenuItemFromRole(menuItem);
                            const checkboxId = `checkbox-${menuItem.path}-${itemIdx}`;
                            return (
                              <DropdownMenuItem
                                key={itemIdx}
                                $color={menuItem.color}
                                $checked={isGranted}
                                $inherited={fromRole}
                                htmlFor={checkboxId}
                              >
                                <input
                                  type="checkbox"
                                  id={checkboxId}
                                  checked={isGranted}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleMenuItemPermission(menuItem);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                />
                                <div className="checkbox-indicator">
                                  {isGranted ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
                                </div>
                                <div className="menu-icon">
                                  {menuItem.icon}
                                </div>
                                <div className="menu-content">
                                  <div className="menu-title">
                                    {menuItem.title}
                                    {fromRole && (
                                      <span style={{ 
                                        fontSize: '0.65rem', 
                                        fontWeight: 400, 
                                        color: 'inherit', 
                                        opacity: 0.7, 
                                        marginLeft: '0.5rem' 
                                      }}>
                                        (default from role)
                                      </span>
                                    )}
                                    {userPermissions.has(getPermissionIdForPath(menuItem.path) || 0) && !fromRole && isGranted && (
                                      <span style={{ 
                                        fontSize: '0.65rem', 
                                        fontWeight: 400, 
                                        color: '#6366f1', 
                                        opacity: 0.8, 
                                        marginLeft: '0.5rem' 
                                      }}>
                                        (user override - granted)
                                      </span>
                                    )}
                                    {userPermissions.has(getPermissionIdForPath(menuItem.path) || 0) && !isGranted && (
                                      <span style={{ 
                                        fontSize: '0.65rem', 
                                        fontWeight: 400, 
                                        color: '#ef4444', 
                                        opacity: 0.8, 
                                        marginLeft: '0.5rem' 
                                      }}>
                                        (user override - denied)
                                      </span>
                                    )}
                                  </div>
                                  <div className="menu-description">{menuItem.description}</div>
                                </div>
                              </DropdownMenuItem>
                            );
                          })}
                          {section.expenseItems && (
                            <>
                              <ColumnSeparator />
                              {section.expenseItems.map((menuItem, itemIdx) => {
                                const isGranted = isMenuItemGranted(menuItem);
                                const fromRole = isMenuItemFromRole(menuItem);
                                const checkboxId = `checkbox-expense-${menuItem.path}-${itemIdx}`;
                                return (
                                  <DropdownMenuItem
                                    key={`expense-${itemIdx}`}
                                    $color={menuItem.color}
                                    $checked={isGranted}
                                    $inherited={fromRole}
                                    htmlFor={checkboxId}
                                  >
                                    <input
                                      type="checkbox"
                                      id={checkboxId}
                                      checked={isGranted}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        toggleMenuItemPermission(menuItem);
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                    />
                                    <div className="checkbox-indicator">
                                      {isGranted ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
                                    </div>
                                    <div className="menu-icon">
                                      {menuItem.icon}
                                    </div>
                                    <div className="menu-content">
                                      <div className="menu-title">
                                        {menuItem.title}
                                        {fromRole && (
                                          <span style={{ 
                                            fontSize: '0.65rem', 
                                            fontWeight: 400, 
                                            color: 'inherit', 
                                            opacity: 0.7, 
                                            marginLeft: '0.5rem' 
                                          }}>
                                            (default from role)
                                          </span>
                                        )}
                                        {userPermissions.has(getPermissionIdForPath(menuItem.path) || 0) && !fromRole && isGranted && (
                                          <span style={{ 
                                            fontSize: '0.65rem', 
                                            fontWeight: 400, 
                                            color: '#6366f1', 
                                            opacity: 0.8, 
                                            marginLeft: '0.5rem' 
                                          }}>
                                            (user override - granted)
                                          </span>
                                        )}
                                        {userPermissions.has(getPermissionIdForPath(menuItem.path) || 0) && !isGranted && (
                                          <span style={{ 
                                            fontSize: '0.65rem', 
                                            fontWeight: 400, 
                                            color: '#ef4444', 
                                            opacity: 0.8, 
                                            marginLeft: '0.5rem' 
                                          }}>
                                            (user override - denied)
                                          </span>
                                        )}
                                      </div>
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
                          { path: '/profile' }
                        ];
                        const allSelected = standalonePages.every(page => {
                          const permissionId = getPermissionIdForPath(page.path);
                          return permissionId !== null && isPermissionGranted(permissionId);
                        });
                        
                        // Create a new permissions map
                        const newUserPerms = new Map(userPermissions);
                        
                        // If user has no saved permissions yet, initialize with role defaults
                        if (newUserPerms.size === 0) {
                          rolePermissions.forEach(rolePermId => {
                            newUserPerms.set(rolePermId, true);
                          });
                        }
                        
                        // Update standalone pages
                        standalonePages.forEach(page => {
                          const permissionId = getPermissionIdForPath(page.path);
                          if (permissionId) {
                            if (allSelected) {
                              // Deselect all - set to false (explicitly deny)
                              newUserPerms.set(permissionId, false);
                            } else {
                              // Select all - set to true (explicitly grant)
                              newUserPerms.set(permissionId, true);
                            }
                          }
                        });
                        setUserPermissions(newUserPerms);
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
                          { path: '/profile' }
                        ];
                        const allSelected = standalonePages.every(page => {
                          const permissionId = getPermissionIdForPath(page.path);
                          return permissionId !== null && isPermissionGranted(permissionId);
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
                    }
                  ].map((pageItem, itemIdx) => {
                    const isGranted = isMenuItemGranted(pageItem);
                    const fromRole = isMenuItemFromRole(pageItem);
                    return (
                      <DropdownMenuItem
                        key={itemIdx}
                        $color={pageItem.color}
                        $checked={isGranted}
                        $inherited={fromRole}
                      >
                        <input
                          type="checkbox"
                          checked={isGranted}
                          onChange={() => toggleMenuItemPermission(pageItem)}
                        />
                        <div className="checkbox-indicator">
                          {isGranted ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
                        </div>
                        <div className="menu-icon">
                          {pageItem.icon}
                        </div>
                        <div className="menu-content">
                          <div className="menu-title">
                            {pageItem.title}
                            {fromRole && (
                              <span style={{ 
                                fontSize: '0.65rem', 
                                fontWeight: 400, 
                                color: 'inherit', 
                                opacity: 0.7, 
                                marginLeft: '0.5rem' 
                              }}>
                                (default from role)
                              </span>
                            )}
                            {userPermissions.has(getPermissionIdForPath(pageItem.path) || 0) && !fromRole && isGranted && (
                              <span style={{ 
                                fontSize: '0.65rem', 
                                fontWeight: 400, 
                                color: '#6366f1', 
                                opacity: 0.8, 
                                marginLeft: '0.5rem' 
                              }}>
                                (user override - granted)
                              </span>
                            )}
                            {userPermissions.has(getPermissionIdForPath(pageItem.path) || 0) && !isGranted && (
                              <span style={{ 
                                fontSize: '0.65rem', 
                                fontWeight: 400, 
                                color: '#ef4444', 
                                opacity: 0.8, 
                                marginLeft: '0.5rem' 
                              }}>
                                (user override - denied)
                              </span>
                            )}
                          </div>
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
                          const isGranted = isWhatsAppPermissionGranted();
                          const newUserPerms = new Map(userPermissions);
                          
                          // If user has no saved permissions yet, initialize with role defaults
                          if (newUserPerms.size === 0) {
                            rolePermissions.forEach(rolePermId => {
                              newUserPerms.set(rolePermId, true);
                            });
                          }
                          
                          if (isGranted) {
                            newUserPerms.set(whatsappPermissionId, false);
                          } else {
                            newUserPerms.set(whatsappPermissionId, true);
                          }
                          setUserPermissions(newUserPerms);
                        }}
                        style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.25rem 0.5rem',
                          minWidth: 'auto'
                        }}
                      >
                        {isWhatsAppPermissionGranted() ? 'Deselect All' : 'Select All'}
                      </Button>
                    )}
                  </div>
                  {/* WhatsApp Notification Permission */}
                  {whatsappPermissionId && (
                    <DropdownMenuItem
                      $color="#25d366"
                      $checked={isWhatsAppPermissionGranted()}
                      $inherited={isWhatsAppPermissionFromRole()}
                      htmlFor="whatsapp-notification-permission"
                    >
                      <input
                        type="checkbox"
                        id="whatsapp-notification-permission"
                        checked={isWhatsAppPermissionGranted()}
                        onChange={(e) => {
                          e.stopPropagation();
                          handlePermissionToggle(whatsappPermissionId);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      />
                      <div className="checkbox-indicator">
                        {isWhatsAppPermissionGranted() ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
                      </div>
                      <div className="menu-icon">
                        <WhatsAppIcon />
                      </div>
                      <div className="menu-content">
                        <div className="menu-title">
                          Send WhatsApp Notifications
                          {isWhatsAppPermissionFromRole() && (
                            <span style={{ 
                              fontSize: '0.65rem', 
                              fontWeight: 400, 
                              color: 'inherit', 
                              opacity: 0.7, 
                              marginLeft: '0.5rem' 
                            }}>
                              (default from role)
                            </span>
                          )}
                          {userPermissions.has(whatsappPermissionId) && !isWhatsAppPermissionFromRole() && isWhatsAppPermissionGranted() && (
                            <span style={{ 
                              fontSize: '0.65rem', 
                              fontWeight: 400, 
                              color: '#6366f1', 
                              opacity: 0.8, 
                              marginLeft: '0.5rem' 
                            }}>
                              (user override - granted)
                            </span>
                          )}
                          {userPermissions.has(whatsappPermissionId) && !isWhatsAppPermissionGranted() && (
                            <span style={{ 
                              fontSize: '0.65rem', 
                              fontWeight: 400, 
                              color: '#ef4444', 
                              opacity: 0.8, 
                              marginLeft: '0.5rem' 
                            }}>
                              (user override - denied)
                            </span>
                          )}
                        </div>
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
            <p>Please select a user to manage permissions</p>
          </EmptyState>
        )}
        </Content>
      </Container>
      {selectedUserId && (
        <StickyFooter>
          {userPermissions.size > 0 && (
            <Button 
              $variant="secondary" 
              onClick={handleResetToDefault} 
              disabled={saving} 
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              <ResetIcon style={{ fontSize: '1rem' }} />
              {saving ? 'Resetting...' : 'Reset to Default'}
            </Button>
          )}
          <Button $variant="primary" onClick={handleSave} disabled={saving || !hasChanges} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            <SaveIcon style={{ fontSize: '1rem' }} />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </StickyFooter>
      )}

      {/* Reset Confirmation Modal */}
      {resetModalOpen && (
        <ModalOverlay onClick={() => setResetModalOpen(false)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalIconContainer>
              <WarningIcon style={{ fontSize: '32px' }} />
            </ModalIconContainer>
            <ModalTitleStyled>Reset to Default Permissions</ModalTitleStyled>
            <ModalMessageStyled>
              Are you sure you want to reset this user's permissions to their role defaults? 
              All custom permissions will be removed and the user will inherit permissions from their assigned role.
            </ModalMessageStyled>
            <ModalButtonRow>
              <ModalButton 
                $variant="secondary" 
                onClick={() => setResetModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </ModalButton>
              <ModalButton 
                $variant="primary" 
                onClick={confirmResetToDefault}
                disabled={saving}
              >
                <ResetIcon style={{ fontSize: '1rem' }} />
                {saving ? 'Resetting...' : 'Reset to Default'}
              </ModalButton>
            </ModalButtonRow>
          </ModalBox>
        </ModalOverlay>
      )}
    </>
  );
};

export default UserPermissionManagement;

