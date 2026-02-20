import React from 'react';
import {
  ProfileDropdown as ProfileDropdownStyled,
  ProfileDropdownItem,
  ProfileDropdownHeader,
  ProfileDropdownDivider,
  ToggleSwitch,
} from '../../styles';
import { StudentInfo, ParentInfo } from '../../types';

interface ProfileDropdownProps {
  studentInfo: StudentInfo | null;
  parentInfo: ParentInfo | null;
  staffName: string | null;
  user: any;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenChangePassword: () => void;
  isWeb: boolean;
  onCheckForUpdates: () => void;
  isCheckingUpdate: boolean;
  isDownloadActive: boolean;
  onAboutUsClick: () => void;
  onLogout: () => void;
  appVersion: string;
}

const ProfileDropdown = React.forwardRef<HTMLDivElement, ProfileDropdownProps>(({
  studentInfo,
  parentInfo,
  staffName,
  user,
  theme,
  onToggleTheme,
  onOpenChangePassword,
  isWeb,
  onCheckForUpdates,
  isCheckingUpdate,
  isDownloadActive,
  onAboutUsClick,
  onLogout,
  appVersion,
}, ref) => {
  return (
    <ProfileDropdownStyled ref={ref}>
      <ProfileDropdownHeader>
        {studentInfo?.name || parentInfo?.name || staffName || user?.name}
        {!studentInfo && !parentInfo && user?.role && (
          <span style={{ color: '#6366f1', fontWeight: 600, marginLeft: 4 }}>{user?.role}</span>
        )}
        {parentInfo && (
          <span style={{ color: '#6366f1', fontWeight: 600, marginLeft: 4 }}>Parent</span>
        )}
        {studentInfo && (
          <span style={{ color: '#6366f1', fontWeight: 600, marginLeft: 4 }}>Student</span>
        )}
      </ProfileDropdownHeader>
      <ProfileDropdownItem onClick={onToggleTheme}>
        <span>Dark Mode</span>
        <ToggleSwitch
          data-checked={theme === 'dark'}
        />
      </ProfileDropdownItem>
      <ProfileDropdownItem onClick={(e) => { e.stopPropagation(); onOpenChangePassword(); }}>
        Change Password
      </ProfileDropdownItem>
      {/* Only show "Check for Updates" in Electron/desktop or Capacitor (mobile), not in web */}
      {!isWeb && (
        <>
          <ProfileDropdownDivider />
          <ProfileDropdownItem
            onClick={(e) => {
              e.stopPropagation();
              onCheckForUpdates();
            }}
            disabled={isCheckingUpdate && !isDownloadActive}
            style={{
              opacity: (isCheckingUpdate && !isDownloadActive) ? 0.6 : 1,
              cursor: (isCheckingUpdate && !isDownloadActive) ? 'not-allowed' : 'pointer',
              color: isDownloadActive ? (theme === 'dark' ? '#60a5fa' : '#2563eb') : undefined
            }}
          >
            {isDownloadActive ? 'Downloading Update...' : (isCheckingUpdate ? 'Checking...' : 'Check for Updates')}
          </ProfileDropdownItem>
        </>
      )}
      <ProfileDropdownDivider />
      <ProfileDropdownItem disabled style={{ opacity: 0.8, cursor: 'default' }}>
        Version: v{appVersion}
      </ProfileDropdownItem>
      {(user?.role === 'Teacher' || studentInfo || parentInfo) && (
        <ProfileDropdownItem onClick={(e) => { e.stopPropagation(); onAboutUsClick(); }}>
          About Us
        </ProfileDropdownItem>
      )}
      <ProfileDropdownItem 
        onClick={(e) => { 
          e.stopPropagation(); 
          e.preventDefault();
          onLogout(); 
        }} 
        style={{ 
          color: '#ef4444', 
          fontWeight: 600,
          position: 'relative',
          zIndex: 100001 /* Ensure logout button is always clickable, even above loading overlay */
        }}
      >
        Logout
      </ProfileDropdownItem>
    </ProfileDropdownStyled>
  );
});

ProfileDropdown.displayName = 'ProfileDropdown';

export default ProfileDropdown;

