import React from 'react';
import ReactDOM from 'react-dom';
import { TabContainer, TabsWrapper, TabButton, DashboardDateInput } from '../../styles';
import { DashboardTab } from '../../types';

interface TabNavigationProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  dashboardDate: string;
  setDashboardDate: (date: string) => void;
  setAbsentDate: (date: string) => void;
  setFineDate: (date: string) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  setActiveTab,
  dashboardDate,
  setDashboardDate,
  setAbsentDate,
  setFineDate
}) => {
  return (
    <TabContainer>
      <TabsWrapper>
        <TabButton
          active={activeTab === 'attendance'}
          onClick={() => setActiveTab('attendance')}
        >
          Attendance
        </TabButton>
        <TabButton
          active={activeTab === 'fee'}
          onClick={() => setActiveTab('fee')}
        >
          Fee Collection
        </TabButton>
        <TabButton
          active={activeTab === 'admissions'}
          onClick={() => setActiveTab('admissions')}
        >
          Admissions
        </TabButton>
        <TabButton
          active={activeTab === 'homework'}
          onClick={() => setActiveTab('homework')}
        >
          Homework Diary
        </TabButton>
        <TabButton
          active={activeTab === 'employeeAttendance'}
          onClick={() => setActiveTab('employeeAttendance')}
        >
          Employee Attendance
        </TabButton>
        <TabButton
          active={activeTab === 'accounts'}
          onClick={() => setActiveTab('accounts')}
        >
          Accounts
        </TabButton>
      </TabsWrapper>
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

