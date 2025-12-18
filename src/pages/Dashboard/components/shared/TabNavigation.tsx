import React, { useRef, useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { 
  MoreVert,
  EventNote,
  AccountBalanceWallet,
  PersonAdd,
  Assignment,
  Groups,
  AccountBalance
} from '@mui/icons-material';
import { TabContainer, TabsWrapper, TabButton, DashboardDateInput, OverflowButton, TabsContainer, DropdownMenu, DropdownMenuItem } from '../../styles';
import { DashboardTab } from '../../types';

interface TabNavigationProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  dashboardDate: string;
  setDashboardDate: (date: string) => void;
  setAbsentDate: (date: string) => void;
  setFineDate: (date: string) => void;
}

interface TabInfo {
  id: DashboardTab;
  label: string;
  icon: React.ReactNode;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  setActiveTab,
  dashboardDate,
  setDashboardDate,
  setAbsentDate,
  setFineDate
}) => {
  const tabsWrapperRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const overflowButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const tabs: TabInfo[] = [
    { id: 'attendance', label: 'Attendance', icon: <EventNote /> },
    { id: 'fee', label: 'Fee Collection', icon: <AccountBalanceWallet /> },
    { id: 'admissions', label: 'Admissions', icon: <PersonAdd /> },
    { id: 'homework', label: 'Homework Diary', icon: <Assignment /> },
    { id: 'employeeAttendance', label: 'Employee Attendance', icon: <Groups /> },
    { id: 'accounts', label: 'Accounts', icon: <AccountBalance /> }
  ];

  // Get all hidden tabs (not visible in container)
  const getHiddenTabs = useCallback(() => {
    const wrapper = tabsWrapperRef.current;
    const container = tabsContainerRef.current;
    if (!wrapper || !container) return [];
    
    const tabButtons = Array.from(wrapper.querySelectorAll('[data-tab-id]'));
    const containerRect = container.getBoundingClientRect();

    const hidden: TabInfo[] = [];
    tabButtons.forEach((button) => {
      const rect = button.getBoundingClientRect();
      // Check if tab is completely hidden (either left or right of visible area)
      // Account for the overflow button space on the right
      const rightBoundary = containerRect.right - (hasOverflow ? 50 : 0); // Approximate space for overflow button
      if (rect.right <= containerRect.left || rect.left >= rightBoundary) {
        const tabId = button.getAttribute('data-tab-id') as DashboardTab;
        const tabInfo = tabs.find(t => t.id === tabId);
        if (tabInfo) {
          hidden.push(tabInfo);
        }
      }
    });
    
    return hidden;
  }, [tabs, hasOverflow]);

  const checkOverflow = useCallback(() => {
    const container = tabsContainerRef.current;
    const wrapper = tabsWrapperRef.current;
    if (!container || !wrapper) return;

    const wrapperScrollWidth = wrapper.scrollWidth;
    const wrapperClientWidth = wrapper.clientWidth;

    // Check if there's overflow
    const overflow = wrapperScrollWidth > wrapperClientWidth;
    setHasOverflow(overflow);
  }, []);

  // Check overflow on mount and resize
  useEffect(() => {
    checkOverflow();
    
    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
    });

    if (tabsContainerRef.current) {
      resizeObserver.observe(tabsContainerRef.current);
    }

    if (tabsWrapperRef.current) {
      resizeObserver.observe(tabsWrapperRef.current);
    }

    // Also check on window resize
    window.addEventListener('resize', checkOverflow);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkOverflow);
    };
  }, [checkOverflow]);

  // Check overflow when active tab changes
  useEffect(() => {
    setTimeout(checkOverflow, 100);
  }, [activeTab, checkOverflow]);

  const handleOverflowButtonHover = () => {
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    
    const hidden = getHiddenTabs();
    if (hidden.length > 0) {
      setIsDropdownOpen(true);
    }
  };

  const handleMenuClose = () => {
    // Add a small delay before closing to allow moving to dropdown
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    
    closeTimeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
      closeTimeoutRef.current = null;
    }, 150); // 150ms delay to allow mouse movement
  };

  const handleDropdownEnter = () => {
    // Clear close timeout when entering dropdown
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsDropdownOpen(true);
  };

  const handleTabSelect = (tabId: DashboardTab) => {
    setActiveTab(tabId);
    handleMenuClose();
    setTimeout(checkOverflow, 100);
  };

  // Calculate hidden tabs only when dropdown is open
  const hiddenTabs = isDropdownOpen ? getHiddenTabs() : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        overflowButtonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !overflowButtonRef.current.contains(event.target as Node)
      ) {
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
        }
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, [isDropdownOpen]);


  return (
    <TabContainer>
      <TabsContainer ref={tabsContainerRef}>
        <TabsWrapper ref={tabsWrapperRef} $hideScrollbar={true} $preventScroll={true}>
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              data-tab-id={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </TabButton>
          ))}
        </TabsWrapper>
        {hasOverflow && (
          <div style={{ position: 'relative' }}>
            <OverflowButton
              ref={overflowButtonRef}
              onMouseEnter={handleOverflowButtonHover}
              onMouseLeave={handleMenuClose}
              aria-label="Show hidden tabs"
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              <MoreVert />
            </OverflowButton>
            {isDropdownOpen && hiddenTabs.length > 0 && (
              <DropdownMenu
                ref={dropdownRef}
                onMouseEnter={handleDropdownEnter}
                onMouseLeave={handleMenuClose}
              >
                {hiddenTabs.map((tab) => (
                  <DropdownMenuItem
                    key={tab.id}
                    onClick={() => handleTabSelect(tab.id)}
                    $active={activeTab === tab.id}
                  >
                    {tab.icon && <span style={{ marginRight: '0.5rem', display: 'flex', alignItems: 'center' }}>{tab.icon}</span>}
                    {tab.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenu>
            )}
          </div>
        )}
      </TabsContainer>
      <DashboardDateInput
        type="date"
        value={dashboardDate}
        onChange={(e) => {
          const newDate = e.target.value;
          setDashboardDate(newDate);
          setAbsentDate(newDate);
          setFineDate(newDate);
        }}
      />
    </TabContainer>
  );
};

export default TabNavigation;

