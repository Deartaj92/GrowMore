import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AccountBalance,
  PointOfSale,
  Description,
  Settings,
  CardGiftcard,
  MenuBook,
  AccessTime,
  AssignmentTurnedIn,
  AccountBalanceWallet,
  AssignmentInd,
  Receipt,
  FamilyRestroom,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseClient';
import {
  HubContainer,
  HubHeader,
  StatsGrid,
  StatBox,
  HubTabsNav,
  HubTabBtn,
  formatFeeCurrency,
} from './FeeHubStyles';
import CounterTab from './tabs/CounterTab';
import FamilyFeeTab from './tabs/FamilyFeeTab';
import PaymentsTab from './tabs/PaymentsTab';
import DemandsTab from './tabs/DemandsTab';
import StudentPlansTab from './tabs/StudentPlansTab';
import CatalogTab from './tabs/CatalogTab';
import ConcessionsTab from './tabs/ConcessionsTab';
import LedgerTab from './tabs/LedgerTab';
import AgingTab from './tabs/AgingTab';
import ApprovalsTab from './tabs/ApprovalsTab';
import ShiftsTab from './tabs/ShiftsTab';

export type FeeHubTabKey =
  | 'counter'
  | 'families'
  | 'payments'
  | 'demands'
  | 'plans'
  | 'catalog'
  | 'concessions'
  | 'ledger'
  | 'aging'
  | 'approvals'
  | 'shifts';

export const FeeHubPage: React.FC = () => {
  const { user } = useAuth();
  const schoolId = user?.school_id || 2;
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab state from URL or default to 'counter'
  const activeTabParam = (searchParams.get('tab') as FeeHubTabKey) || 'counter';
  const [activeTab, setActiveTab] = useState<FeeHubTabKey>(activeTabParam);

  // High-level KPI metrics
  const [metrics, setMetrics] = useState<{
    totalBilled: number;
    totalCollected: number;
    totalOverdue: number;
    pendingApprovals: number;
  }>({
    totalBilled: 0,
    totalCollected: 0,
    totalOverdue: 0,
    pendingApprovals: 0,
  });

  useEffect(() => {
    setActiveTab(activeTabParam);
  }, [activeTabParam]);

  useEffect(() => {
    loadHubMetrics();
  }, [schoolId]);

  const loadHubMetrics = async () => {
    try {
      const [
        { data: demands, error: dErr },
        { data: receipts, error: rErr },
        { count: adjCount },
        { count: concCount },
        { count: overCount },
      ] = await Promise.all([
        supabase
          .from('v_fee_demand_balances')
          .select('net_amount, balance_amount')
          .eq('school_id', schoolId)
          .neq('doc_status', 'cancelled'),
        supabase
          .from('fee_receipts')
          .select('amount')
          .eq('school_id', schoolId)
          .eq('status', 'posted'),
        supabase
          .from('fee_adjustments')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('status', 'pending'),
        supabase
          .from('fee_concessions')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('status', 'pending'),
        supabase
          .from('student_fee_overrides')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('status', 'pending'),
      ]);

      if (dErr) throw dErr;
      if (rErr) throw rErr;

      const billed = (demands || []).reduce((s, r) => s + Number(r.net_amount || 0), 0);
      const collected = (receipts || []).reduce((s, r) => s + Number(r.amount || 0), 0);
      const due = (demands || []).reduce((s, r) => s + Number(r.balance_amount || 0), 0);

      setMetrics({
        totalBilled: billed,
        totalCollected: collected,
        totalOverdue: due,
        pendingApprovals: (adjCount || 0) + (concCount || 0) + (overCount || 0),
      });
    } catch (err: any) {
      console.error('Error loading hub metrics:', err);
    }
  };

  const handleTabChange = (key: FeeHubTabKey) => {
    setActiveTab(key);
    try {
      const url = new URL(window.location.href);
      if (url.hash && url.hash.includes('?')) {
        const [hashPath] = url.hash.split('?');
        url.hash = `${hashPath}?tab=${key}`;
      } else if (url.hash) {
        url.hash = `${url.hash}?tab=${key}`;
      } else {
        url.searchParams.set('tab', key);
      }
      window.history.replaceState(window.history.state, '', url.toString());
    } catch {
      // Fallback if URL parsing fails
    }
  };

  return (
    <HubContainer>
      {/* Header */}
      <HubHeader>
        <div className="header-left">
          <div className="icon-badge">
            <AccountBalance style={{ fontSize: 24 }} />
          </div>
          <div>
            <h1>Fee Management Hub</h1>
            <p>Unified enterprise workspace for fee collection, batch demands, catalog, ledger, and recovery.</p>
          </div>
        </div>
      </HubHeader>

      {/* Top Level School KPIs */}
      <StatsGrid>
        <StatBox $accent="#2563eb">
          <div className="title">Total Billed / Demanded</div>
          <div className="value">{formatFeeCurrency(metrics.totalBilled)}</div>
          <div className="sub">School Lifetime Invoiced</div>
        </StatBox>

        <StatBox $accent="#059669">
          <div className="title">Total Collected</div>
          <div className="value">{formatFeeCurrency(metrics.totalCollected)}</div>
          <div className="sub">
            {metrics.totalBilled > 0
              ? `${Math.round((metrics.totalCollected / metrics.totalBilled) * 100)}% Recovery Rate`
              : 'Lifetime Settlements'}
          </div>
        </StatBox>

        <StatBox $accent="#dc2626">
          <div className="title">Total Outstanding Dues</div>
          <div className="value" style={{ color: '#dc2626' }}>
            {formatFeeCurrency(metrics.totalOverdue)}
          </div>
          <div className="sub">Actionable Student Arrears</div>
        </StatBox>

        <StatBox $accent={metrics.pendingApprovals > 0 ? '#d97706' : '#059669'}>
          <div className="title">Governance Queue</div>
          <div className="value">{metrics.pendingApprovals}</div>
          <div className="sub">
            {metrics.pendingApprovals > 0 ? 'Pending Maker-Checker' : 'Zero Pending Requests'}
          </div>
        </StatBox>
      </StatsGrid>

      {/* Tab Navigation */}
      <HubTabsNav>
        <HubTabBtn
          $active={activeTab === 'counter'}
          $color="#059669"
          onClick={() => handleTabChange('counter')}
        >
          <PointOfSale fontSize="small" /> POS Counter
        </HubTabBtn>

        <HubTabBtn
          $active={activeTab === 'families'}
          $color="#7c3aed"
          onClick={() => handleTabChange('families')}
        >
          <FamilyRestroom fontSize="small" /> Family Billing & History
        </HubTabBtn>

        <HubTabBtn
          $active={activeTab === 'payments'}
          $color="#10b981"
          onClick={() => handleTabChange('payments')}
        >
          <Receipt fontSize="small" /> Payment History
        </HubTabBtn>

        <HubTabBtn
          $active={activeTab === 'demands'}
          $color="#2563eb"
          onClick={() => handleTabChange('demands')}
        >
          <Description fontSize="small" /> Demands & Challans
        </HubTabBtn>

        <HubTabBtn
          $active={activeTab === 'plans'}
          $color="#0284c7"
          onClick={() => handleTabChange('plans')}
        >
          <AssignmentInd fontSize="small" /> Student Fee Plans
        </HubTabBtn>

        <HubTabBtn
          $active={activeTab === 'catalog'}
          $color="#7c3aed"
          onClick={() => handleTabChange('catalog')}
        >
          <Settings fontSize="small" /> Fee Catalog & Rates
        </HubTabBtn>

        <HubTabBtn
          $active={activeTab === 'concessions'}
          $color="#ec4899"
          onClick={() => handleTabChange('concessions')}
        >
          <CardGiftcard fontSize="small" /> Concessions & Overrides
        </HubTabBtn>

        <HubTabBtn
          $active={activeTab === 'ledger'}
          $color="#0284c7"
          onClick={() => handleTabChange('ledger')}
        >
          <MenuBook fontSize="small" /> Student Ledger
        </HubTabBtn>

        <HubTabBtn
          $active={activeTab === 'aging'}
          $color="#dc2626"
          onClick={() => handleTabChange('aging')}
        >
          <AccessTime fontSize="small" /> Aging & Defaulters
        </HubTabBtn>

        <HubTabBtn
          $active={activeTab === 'approvals'}
          $color="#d97706"
          onClick={() => handleTabChange('approvals')}
        >
          <AssignmentTurnedIn fontSize="small" /> Approvals Queue
          {metrics.pendingApprovals > 0 && (
            <span className="count-pill">{metrics.pendingApprovals}</span>
          )}
        </HubTabBtn>

        <HubTabBtn
          $active={activeTab === 'shifts'}
          $color="#0d9488"
          onClick={() => handleTabChange('shifts')}
        >
          <AccountBalanceWallet fontSize="small" /> Cashier Shifts
        </HubTabBtn>
      </HubTabsNav>

      {/* Active Tab View */}
      <div>
        {activeTab === 'counter' && <CounterTab onPaymentCollected={loadHubMetrics} />}
        {activeTab === 'families' && <FamilyFeeTab onPaymentCollected={loadHubMetrics} />}
        {activeTab === 'payments' && <PaymentsTab />}
        {activeTab === 'demands' && <DemandsTab />}
        {activeTab === 'plans' && <StudentPlansTab />}
        {activeTab === 'catalog' && <CatalogTab />}
        {activeTab === 'concessions' && <ConcessionsTab />}
        {activeTab === 'ledger' && <LedgerTab />}
        {activeTab === 'aging' && <AgingTab />}
        {activeTab === 'approvals' && <ApprovalsTab />}
        {activeTab === 'shifts' && <ShiftsTab />}
      </div>
    </HubContainer>
  );
};
export default FeeHubPage;
