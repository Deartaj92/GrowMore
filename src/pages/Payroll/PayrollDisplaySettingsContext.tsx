import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { payrollService } from '../../services/payrollService';
import { formatPayrollCurrency, roundPayrollAmount } from './utils';

interface PayrollDisplaySettingsContextValue {
  roundUpAmounts: boolean;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  formatCurrency: (amount: number | undefined | null) => string;
  roundAmount: (amount: number | undefined | null) => number;
}

const PayrollDisplaySettingsContext = createContext<PayrollDisplaySettingsContextValue>({
  roundUpAmounts: false,
  loading: false,
  refreshSettings: async () => {},
  formatCurrency: (amount) => formatPayrollCurrency(amount, false),
  roundAmount: (amount) => roundPayrollAmount(amount, false),
});

export const PayrollDisplaySettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth() as any;
  const [roundUpAmounts, setRoundUpAmounts] = useState(false);
  const [loading, setLoading] = useState(false);

  const refreshSettings = async () => {
    if (!user?.school_id) {
      setRoundUpAmounts(false);
      return;
    }

    try {
      setLoading(true);
      const settings = await payrollService.getPayrollSettings(user.school_id);
      setRoundUpAmounts(!!settings?.roundUpAmounts);
    } catch (error) {
      console.error('Error loading payroll display settings:', error);
      setRoundUpAmounts(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, [user?.school_id]);

  const value = useMemo(() => ({
    roundUpAmounts,
    loading,
    refreshSettings,
    formatCurrency: (amount: number | undefined | null) => formatPayrollCurrency(amount, roundUpAmounts),
    roundAmount: (amount: number | undefined | null) => roundPayrollAmount(amount, roundUpAmounts),
  }), [roundUpAmounts, loading]);

  return (
    <PayrollDisplaySettingsContext.Provider value={value}>
      {children}
    </PayrollDisplaySettingsContext.Provider>
  );
};

export const usePayrollDisplaySettings = () => useContext(PayrollDisplaySettingsContext);
