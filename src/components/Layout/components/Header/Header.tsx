import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Dashboard as DashboardIcon,
  Menu as MenuIcon,
  Refresh as RefreshIcon,
  AccountCircle as UserIcon,
  WifiOff as WifiOffIcon,
} from '@mui/icons-material';
import {
  Header as HeaderStyled,
  HeaderLeft,
  MenuButton,
  PageTitle,
  Logo,
  LogoContent,
  LogoName,
  LogoTagline,
  InstituteLogo,
  HeaderActions,
  NavigationButtonsContainer,
  HeaderIconCircle,
  MacWindowControls,
  MacButton,
  WeakConnectionIndicator,
} from '../../styles';
import { InstituteProfile, StudentInfo, ParentInfo } from '../../types';
import { customHeaderTexts } from '../../constants';
import { matchRoutePattern } from '../../utils/layoutUtils';
import NotificationBell from '../../../NotificationBell';
import StudentSearch from '../StudentSearch/StudentSearch';
import ProfileDropdown from '../ProfileDropdown/ProfileDropdown';
import { Remove, CropSquare, Close } from '@mui/icons-material';

interface HeaderProps {
  user: any;
  studentInfo: StudentInfo | null;
  parentInfo: ParentInfo | null;
  isMobile: boolean;
  isWeb: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  instituteProfile: InstituteProfile | null;
  pageHeader: string;
  isTitleOverflowing: boolean;
  titleRef: React.RefObject<HTMLHeadingElement>;
  isWeakConnection: boolean;
  isDownloadActive: boolean;
  onRefresh: () => void;
  navHistory: string[];
  forwardHistory: string[];
  onGoBack: () => void;
  onGoForward: () => void;
  isMaximized: boolean;
  showStudentSearch: boolean;
  avatarUrl: string | null;
  staffName: string | null;
  profileMenuOpen: boolean;
  setProfileMenuOpen: (open: boolean) => void;
  profileIconRef: React.RefObject<HTMLButtonElement>;
  profileDropdownRef: React.RefObject<HTMLDivElement>;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenChangePassword: () => void;
  onCheckForUpdates: () => void;
  isCheckingUpdate: boolean;
  onAboutUsClick: () => void;
  onLogout: () => void;
  appVersion: string;
}

const Header: React.FC<HeaderProps> = ({
  user,
  studentInfo,
  parentInfo,
  isMobile,
  isWeb,
  sidebarOpen,
  setSidebarOpen,
  instituteProfile,
  pageHeader,
  isTitleOverflowing,
  titleRef,
  isWeakConnection,
  isDownloadActive,
  onRefresh,
  navHistory,
  forwardHistory,
  onGoBack,
  onGoForward,
  isMaximized,
  showStudentSearch,
  avatarUrl,
  staffName,
  profileMenuOpen,
  setProfileMenuOpen,
  profileIconRef,
  profileDropdownRef,
  theme,
  onToggleTheme,
  onOpenChangePassword,
  onCheckForUpdates,
  isCheckingUpdate,
  onAboutUsClick,
  onLogout,
  appVersion,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // State for current time (for dashboard header)
  const [currentTime, setCurrentTime] = React.useState(() => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
  });

  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;
      setCurrentTime(`${hours}:${minutesStr} ${ampm}`);
    }, 1000 * 10);
    return () => clearInterval(interval);
  }, []);

  const getPageHeaderText = (pathname: string) => {
    if (pageHeader) return pageHeader;
    if (pathname === '/') return currentTime;
    if (customHeaderTexts[pathname]) return customHeaderTexts[pathname];
    const dynamicMatch = Object.keys(customHeaderTexts).find(pattern => matchRoutePattern(pattern, pathname));
    if (dynamicMatch) return customHeaderTexts[dynamicMatch];
    const parentMatch = Object.keys(customHeaderTexts)
      .filter(key => key !== '/')
      .find(key => pathname.startsWith(key));
    if (parentMatch) return customHeaderTexts[parentMatch];
    return '';
  };

  const hasSidebar = user && ['Principal', 'Admin', 'Super Admin'].includes(user.role);

  return (
    <HeaderStyled $hasSidebar={hasSidebar}>
      <HeaderLeft>
        {hasSidebar ? (
          isMobile && (
            <MenuButton
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            >
              <MenuIcon />
            </MenuButton>
          )
        ) : (user || studentInfo || parentInfo) ? (
          <MenuButton
            onClick={() => navigate('/home')}
            aria-label="Go to Dashboard"
            title="Dashboard"
          >
            <DashboardIcon />
          </MenuButton>
        ) : null}
        {/* Only show navigation buttons in Electron/Capacitor, not on web */}
        {!isWeb && (
          <NavigationButtonsContainer>
            <HeaderIconCircle
              as="button"
              onClick={onGoBack}
              title={location.pathname === '/dashboard' ? "Home page" : `Go back (Alt+Left) - ${navHistory.length - 1} pages`}
              aria-label={location.pathname === '/dashboard' ? "Home page" : "Go back"}
              disabled={location.pathname === '/dashboard'}
              style={{
                opacity: location.pathname === '/dashboard' ? 0.4 : 1,
                cursor: location.pathname === '/dashboard' ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s ease'
              }}
            >
              <span style={{ display: 'inline-block', transform: 'translateX(-1px)' }}>‹</span>
            </HeaderIconCircle>
            <HeaderIconCircle
              as="button"
              onClick={onGoForward}
              title={forwardHistory.length > 0 ? `Go forward (Alt+Right) - ${forwardHistory.length} pages` : "No forward history"}
              aria-label="Go forward"
              disabled={forwardHistory.length === 0}
              style={{
                opacity: forwardHistory.length === 0 ? 0.4 : 1,
                cursor: forwardHistory.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s ease'
              }}
            >
              <span style={{ display: 'inline-block', transform: 'translateX(1px)' }}>›</span>
            </HeaderIconCircle>
          </NavigationButtonsContainer>
        )}
        {/* Always show school/institute short name in header for both staff and students */}
        {(location.pathname === '/dashboard' || location.pathname === '/teacher' || studentInfo) ? (
          <>
            {isMobile && instituteProfile?.logo_url && (
              <InstituteLogo
                src={instituteProfile.logo_url}
                alt="School Logo"
              />
            )}
            {instituteProfile?.short_name && (
              <Logo>
                <LogoContent>
                  <LogoName>
                    {isMobile ? instituteProfile.short_name : instituteProfile.name || instituteProfile.short_name}
                  </LogoName>
                  {instituteProfile.tagline && (
                    <LogoTagline>{instituteProfile.tagline}</LogoTagline>
                  )}
                </LogoContent>
              </Logo>
            )}
          </>
        ) : (
          <>
            <PageTitle
              ref={titleRef}
              isMobile={isMobile}
              $isOverflowing={isTitleOverflowing}
              data-text={getPageHeaderText(location.pathname)}
            >
              {getPageHeaderText(location.pathname)}
            </PageTitle>
            {/* School logo - hidden on mobile for non-dashboard pages */}
            {!isMobile && instituteProfile?.logo_url && (
              <InstituteLogo
                src={instituteProfile.logo_url}
                alt="School Logo"
              />
            )}
            {!isMobile && instituteProfile?.short_name && (
              <Logo>
                <LogoContent>
                  <LogoName>{instituteProfile.short_name}</LogoName>
                  {instituteProfile.tagline && (
                    <LogoTagline>{instituteProfile.tagline}</LogoTagline>
                  )}
                </LogoContent>
              </Logo>
            )}
          </>
        )}
      </HeaderLeft>
      <HeaderActions>
        {/* Student Search Bar (for Principal on student profile page) */}
        {showStudentSearch && <StudentSearch user={user} />}
        {isWeakConnection && (
          <WeakConnectionIndicator title="Slow internet connection detected">
            <WifiOffIcon style={{ color: '#fbbf24' }} />
            {!isMobile && 'Slow Connection'}
          </WeakConnectionIndicator>
        )}
        {/* Show notification bell for all authenticated users (staff and students) */}
        {(user || studentInfo || parentInfo) && <NotificationBell />}
        <HeaderIconCircle
          as="button"
          onClick={onRefresh}
          aria-label="Refresh page"
          disabled={isDownloadActive}
          style={{
            opacity: isDownloadActive ? 0.5 : 1,
            cursor: isDownloadActive ? 'not-allowed' : 'pointer',
            pointerEvents: isDownloadActive ? 'none' : 'auto'
          }}
          title={isDownloadActive ? 'Download in progress. Please wait before refreshing.' : 'Refresh page'}
        >
          <RefreshIcon />
        </HeaderIconCircle>
        <div style={{ position: 'relative' }}>
          <HeaderIconCircle
            as="button"
            ref={profileIconRef}
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            aria-label="Profile"
          >
            {(avatarUrl || parentInfo?.avatar_url) ? (
              <img
                src={avatarUrl || parentInfo?.avatar_url || ''}
                alt="avatar"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  padding: '2px'
                }}
              />
            ) : (
              <UserIcon />
            )}
          </HeaderIconCircle>
          {profileMenuOpen && (
            <ProfileDropdown
              ref={profileDropdownRef}
              studentInfo={studentInfo}
              parentInfo={parentInfo}
              staffName={staffName}
              user={user}
              theme={theme}
              onToggleTheme={onToggleTheme}
              onOpenChangePassword={onOpenChangePassword}
              isWeb={isWeb}
              onCheckForUpdates={onCheckForUpdates}
              isCheckingUpdate={isCheckingUpdate}
              isDownloadActive={isDownloadActive}
              onAboutUsClick={onAboutUsClick}
              onLogout={onLogout}
              appVersion={appVersion}
            />
          )}
        </div>
      </HeaderActions>
      {window.electronAPI && (
        <MacWindowControls>
          <MacButton
            color="#febc2e"
            onClick={() => window.electronAPI?.minimize()}
            title="Minimize"
          >
            <Remove style={{ fontSize: '12px' }} />
          </MacButton>
          <MacButton
            color="#28c840"
            onClick={() => {
              if (isMaximized) {
                window.electronAPI?.unmaximize();
              } else {
                window.electronAPI?.maximize();
              }
            }}
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <CropSquare style={{ fontSize: '10px', transform: 'scale(0.8) translate(-60%, -60%)' }} />
            ) : (
              <CropSquare style={{ fontSize: '10px' }} />
            )}
          </MacButton>
          <MacButton
            color="#ff5f57"
            onClick={() => {
              window.electronAPI?.close();
            }}
            title="Close"
          >
            <Close style={{ fontSize: '12px' }} />
          </MacButton>
        </MacWindowControls>
      )}
    </HeaderStyled>
  );
};

export default Header;

