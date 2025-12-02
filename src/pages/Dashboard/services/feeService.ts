import { supabase } from '../../../supabaseClient';
import { FeeSummary, FeeCollectionDetails } from '../types';
import { generateDummyFeeSummary, generateDummyFeeCollectionCharts, generateDummyFeeCollectionDetails, generateDummyDefaulters } from '../utils/dummyData';
import { USE_DUMMY_DATA } from '../constants';

// Helper function to fetch all rows with parallel pagination batches
export const fetchAllRows = async <T,>(queryFn: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>): Promise<T[]> => {
  const firstPageSize = 500;
  const firstPage = await queryFn(0, firstPageSize - 1);
  if (firstPage.error) throw firstPage.error;

  const firstPageData = firstPage.data || [];
  
  if (firstPageData.length < firstPageSize) {
    return firstPageData;
  }

  let allResults: T[] = [...firstPageData];
  const pageSize = 1000;
  let from = firstPageSize;
  const batchSize = 5;
  let hasMore = true;

  while (hasMore) {
    const batchPromises: Promise<{ data: T[] | null; error: any }>[] = [];

    for (let i = 0; i < batchSize && hasMore; i++) {
      const currentFrom = from + i * pageSize;
      batchPromises.push(queryFn(currentFrom, currentFrom + pageSize - 1));
    }

    try {
      const batchResults = await Promise.all(batchPromises);

      let batchHasMore = false;
      for (const result of batchResults) {
        if (result.error) throw result.error;
        if (result.data && result.data.length > 0) {
          allResults = allResults.concat(result.data);
          if (result.data.length === pageSize) {
            batchHasMore = true;
          }
        }
      }

      hasMore = batchHasMore;
      from += batchSize * pageSize;
    } catch (error) {
      console.warn('Parallel batch fetch failed, falling back to sequential:', error);
      hasMore = false;
    }
  }

  return allResults;
};

export const fetchFeeSummary = async (
  schoolId: string,
  setFeeSummary: (data: FeeSummary) => void,
  setFeeSummaryLoading: (loading: boolean) => void,
  getCachedSession: () => Promise<any>
): Promise<void> => {
  if (!schoolId) return;

  setFeeSummaryLoading(true);
  try {
    if (USE_DUMMY_DATA) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setFeeSummary(generateDummyFeeSummary());
      setFeeSummaryLoading(false);
      return;
    }

    const sessionData = await getCachedSession();

    let invoicesQuery = supabase
      .from('fee_invoices')
      .select('total_amount')
      .eq('school_id', schoolId);

    if (sessionData?.id) {
      invoicesQuery = invoicesQuery.eq('session_id', sessionData.id);
    }

    const [invoicesResult, paymentsResult] = await Promise.all([
      invoicesQuery,
      supabase
        .from('fee_payments')
        .select('amount')
        .eq('school_id', schoolId)
    ]);

    const invoicesData = invoicesResult.data || [];
    const paymentsData = paymentsResult.data || [];

    const totalInvoiced = invoicesData.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
    const totalCollected = paymentsData.reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);
    const totalOutstanding = totalInvoiced - totalCollected;
    const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

    const summaryData: FeeSummary = {
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      collectionRate
    };
    
    setFeeSummary(summaryData);
  } catch (error) {
    console.error('Error fetching fee summary:', error);
  } finally {
    setFeeSummaryLoading(false);
  }
};

export const fetchCollectionChartsData = async (
  schoolId: string,
  dashboardDate: string,
  setDailyCollectionData: (data: Array<{ day: string; amount: number }>) => void,
  setMonthlyCollectionData: (data: Array<{ month: string; amount: number }>) => void,
  setCollectionChartsLoading: (loading: boolean) => void
): Promise<void> => {
  if (!schoolId) return;

  setCollectionChartsLoading(true);
  try {
    if (USE_DUMMY_DATA) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const chartsData = generateDummyFeeCollectionCharts();
      setDailyCollectionData(chartsData.daily);
      setMonthlyCollectionData(chartsData.monthly);
      setCollectionChartsLoading(false);
      return;
    }

    const selectedDate = new Date(dashboardDate);
    const endDate = new Date(selectedDate);
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(selectedDate);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const currentMonth = selectedDate.getMonth() + 1;
    const currentYear = selectedDate.getFullYear();
    const monthlyEndDate = new Date(currentYear, currentMonth, 0);
    const monthlyStartDate = new Date(currentYear, currentMonth - 12, 1);

    let dailyResult: any = { data: null, error: null };
    let monthlyResult: any = { data: null, error: null };

    const dailyQuery = await supabase
      .from('fee_payments')
      .select('amount, payment_date')
      .eq('school_id', schoolId)
      .gte('payment_date', startDate.toISOString().slice(0, 10))
      .lte('payment_date', endDate.toISOString().slice(0, 10));
    
    dailyResult = {
      data: dailyQuery.data || [],
      error: dailyQuery.error
    };

    // Use direct query instead of RPC to avoid errors
    const monthlyQuery = await supabase
      .from('fee_payments')
      .select('amount, payment_date')
      .eq('school_id', schoolId)
      .gte('payment_date', monthlyStartDate.toISOString().slice(0, 10))
      .lte('payment_date', monthlyEndDate.toISOString().slice(0, 10));
    
    const monthlyData: { [key: string]: number } = {};
    monthlyQuery.data?.forEach((p: any) => {
      if (p.payment_date) {
        const date = new Date(p.payment_date);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (Number(p.amount) || 0);
      }
    });
    
    monthlyResult = {
      data: Object.entries(monthlyData).map(([month, amount]) => ({ month, amount })),
      error: monthlyQuery.error
    };

    const dailyDataMap: { [key: string]: number } = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() - i);
      const dayLabel = `${date.getDate()}/${date.getMonth() + 1}`;
      dailyDataMap[dayLabel] = 0;
    }

    if (dailyResult.data && Array.isArray(dailyResult.data)) {
      dailyResult.data.forEach((payment: any) => {
        if (payment.payment_date) {
          const paymentDate = new Date(payment.payment_date);
          const dayLabel = `${paymentDate.getDate()}/${paymentDate.getMonth() + 1}`;
          if (dailyDataMap.hasOwnProperty(dayLabel)) {
            dailyDataMap[dayLabel] = (dailyDataMap[dayLabel] || 0) + (Number(payment.amount) || 0);
          }
        }
      });
    }

    const dailyCollection = Object.keys(dailyDataMap)
      .sort((a, b) => {
        const [dayA, monthA] = a.split('/').map(Number);
        const [dayB, monthB] = b.split('/').map(Number);
        if (monthA !== monthB) return monthA - monthB;
        return dayA - dayB;
      })
      .map(dayLabel => ({
        day: dayLabel,
        amount: dailyDataMap[dayLabel]
      }));

    setDailyCollectionData(dailyCollection);

    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i - 1, 1);
      months.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
    }

    const monthlyDataMap: { [key: string]: number } = {};
    if (monthlyResult.data) {
      if (Array.isArray(monthlyResult.data) && monthlyResult.data[0]?.month_label) {
        monthlyResult.data.forEach((item: any) => {
          monthlyDataMap[item.month_label] = Number(item.amount) || 0;
        });
      } else if (Array.isArray(monthlyResult.data) && monthlyResult.data[0]?.month) {
        monthlyResult.data.forEach((item: any) => {
          monthlyDataMap[item.month] = Number(item.amount) || 0;
        });
      }
    }

    const monthlyCollection = months.map(month => ({
      month,
      amount: monthlyDataMap[month] || 0
    }));

    setMonthlyCollectionData(monthlyCollection);
  } catch (error) {
    console.error('Error fetching collection charts data:', error);
  } finally {
    setCollectionChartsLoading(false);
  }
};

export const fetchFeeCollectionDetails = async (
  schoolId: string,
  dashboardDate: string,
  setFeeCollectionDetails: (data: FeeCollectionDetails) => void,
  setFeeCollectionDetailsLoading: (loading: boolean) => void
): Promise<void> => {
  if (!schoolId) return;

  setFeeCollectionDetailsLoading(true);
  try {
    if (USE_DUMMY_DATA) {
      await new Promise(resolve => setTimeout(resolve, 150));
      setFeeCollectionDetails(generateDummyFeeCollectionDetails());
      setFeeCollectionDetailsLoading(false);
      return;
    }

    const { data: sessionData } = await supabase
      .from('sessions')
      .select('id, start_date, end_date')
      .eq('is_active', true)
      .eq('school_id', schoolId)
      .maybeSingle();

    if (!sessionData) {
      setFeeCollectionDetailsLoading(false);
      return;
    }

    const selectedDate = new Date(dashboardDate);
    const currentMonth = selectedDate.getMonth() + 1;
    const currentYear = selectedDate.getFullYear();
    const twoYearsAgo = new Date(currentYear - 2, 1, 1).toISOString().slice(0, 10);
    
    const invoices = await fetchAllRows(async (from, to) => {
      const result = await supabase
        .from('fee_invoices')
        .select('id, student_id, total_amount, month, year, status, invoice_date')
        .eq('school_id', schoolId)
        .gte('invoice_date', twoYearsAgo)
        .range(from, to);
      return { data: result.data, error: result.error };
    });

    const invoiceIds = invoices.map((inv: any) => inv.id);
    let payments: any[] = [];
    if (invoiceIds.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < invoiceIds.length; i += chunkSize) {
        const chunk = invoiceIds.slice(i, i + chunkSize);
        const { data } = await supabase
          .from('fee_payments')
          .select('id, invoice_id, amount, payment_date')
          .eq('school_id', schoolId)
          .in('invoice_id', chunk);
        if (data) payments = payments.concat(data);
      }
    }

    let invoiceItems: any[] = [];
    if (invoiceIds.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < invoiceIds.length; i += chunkSize) {
        const chunk = invoiceIds.slice(i, i + chunkSize);
        const { data } = await supabase
          .from('fee_invoice_items')
          .select('id, invoice_id, discount')
          .eq('school_id', schoolId)
          .in('invoice_id', chunk);
        if (data) invoiceItems = invoiceItems.concat(data);
      }
    }

    const studentIds = Array.from(new Set(invoices.map((inv: any) => inv.student_id)));
    let students: any[] = [];
    if (studentIds.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < studentIds.length; i += chunkSize) {
        const chunk = studentIds.slice(i, i + chunkSize);
        const { data } = await supabase
          .from('students')
          .select('id, admission_date, status, session_id')
          .eq('school_id', schoolId)
          .in('id', chunk);
        if (data) students = students.concat(data);
      }
    }

    const paymentsByInvoice = new Map<number, number>();
    payments.forEach((payment: any) => {
      const invoiceId = payment.invoice_id;
      const amount = Number(payment.amount) || 0;
      paymentsByInvoice.set(invoiceId, (paymentsByInvoice.get(invoiceId) || 0) + amount);
    });

    const discountsByInvoice = new Map<number, number>();
    invoiceItems.forEach((item: any) => {
      const invoiceId = item.invoice_id;
      const discount = Number(item.discount) || 0;
      discountsByInvoice.set(invoiceId, (discountsByInvoice.get(invoiceId) || 0) + discount);
    });

    const studentMap = new Map<number, { admissionDate: string; status: string; sessionId: number }>();
    students.forEach((student: any) => {
      studentMap.set(student.id, {
        admissionDate: student.admission_date,
        status: student.status || 'active',
        sessionId: student.session_id
      });
    });

    const isNewAdmission = (studentId: number): boolean => {
      const student = studentMap.get(studentId);
      if (!student) return false;
      return student.sessionId === sessionData.id;
    };

    const previousArrears = {
      oldStudents: 0,
      newAdmissions: 0,
      totalPayable: 0,
      paid: 0,
      discount: 0,
      droppedOut: 0,
      remaining: 0
    };

    const currentMonthData = {
      oldStudents: 0,
      newAdmissions: 0,
      totalPayable: 0,
      paid: 0,
      discount: 0,
      droppedOut: 0,
      remaining: 0
    };

    const nextMonths = {
      oldStudents: 0,
      newAdmissions: 0,
      totalPayable: 0,
      paid: 0,
      discount: 0,
      droppedOut: 0,
      remaining: 0
    };

    const parseMonth = (month: any): number => {
      if (typeof month === 'number') return month;
      if (typeof month === 'string') {
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december'];
        const monthIndex = monthNames.findIndex(m => m.toLowerCase().startsWith(month.toLowerCase()));
        if (monthIndex !== -1) return monthIndex + 1;
        const num = parseInt(month);
        if (!isNaN(num) && num >= 1 && num <= 12) return num;
      }
      return 0;
    };

    invoices.forEach((invoice: any) => {
      let invoiceYear = invoice.year;
      let invoiceMonth = parseMonth(invoice.month);

      if (!invoiceYear || !invoiceMonth) {
        const invoiceDate = invoice.invoice_date ? new Date(invoice.invoice_date) :
          (invoice.created_at ? new Date(invoice.created_at) : null);
        if (invoiceDate) {
          invoiceYear = invoiceYear || invoiceDate.getFullYear();
          invoiceMonth = invoiceMonth || invoiceDate.getMonth() + 1;
        }
      }

      if (!invoiceYear || !invoiceMonth) return;

      const totalAmount = Number(invoice.total_amount) || 0;
      const paid = paymentsByInvoice.get(invoice.id) || 0;
      const discount = discountsByInvoice.get(invoice.id) || 0;
      const studentId = invoice.student_id;
      const student = studentMap.get(studentId);
      const isDroppedOut = student?.status === 'withdrawn' || student?.status === 'dropped';
      const isNew = isNewAdmission(studentId);

      let targetCategory: typeof previousArrears;

      if (invoiceYear < currentYear || (invoiceYear === currentYear && invoiceMonth < currentMonth)) {
        targetCategory = previousArrears;
      } else if (invoiceYear === currentYear && invoiceMonth === currentMonth) {
        targetCategory = currentMonthData;
      } else {
        targetCategory = nextMonths;
      }

      if (isNew) {
        targetCategory.newAdmissions += totalAmount;
      } else {
        targetCategory.oldStudents += totalAmount;
      }

      targetCategory.totalPayable += totalAmount;
      targetCategory.paid += paid;
      targetCategory.discount += discount;

      if (isDroppedOut) {
        targetCategory.droppedOut += totalAmount - paid - discount;
      }

      targetCategory.remaining += totalAmount - paid - discount;
    });

    const total = {
      oldStudents: previousArrears.oldStudents + currentMonthData.oldStudents + nextMonths.oldStudents,
      newAdmissions: previousArrears.newAdmissions + currentMonthData.newAdmissions + nextMonths.newAdmissions,
      totalPayable: previousArrears.totalPayable + currentMonthData.totalPayable + nextMonths.totalPayable,
      paid: previousArrears.paid + currentMonthData.paid + nextMonths.paid,
      discount: previousArrears.discount + currentMonthData.discount + nextMonths.discount,
      droppedOut: previousArrears.droppedOut + currentMonthData.droppedOut + nextMonths.droppedOut,
      remaining: previousArrears.remaining + currentMonthData.remaining + nextMonths.remaining
    };

    const detailsData: FeeCollectionDetails = {
      previousArrears,
      currentMonth: currentMonthData,
      nextMonths,
      total
    };
    
    setFeeCollectionDetails(detailsData);
  } catch (error) {
    console.error('Error fetching fee collection details:', error);
  } finally {
    setFeeCollectionDetailsLoading(false);
  }
};

export const fetchDefaultersData = async (
  schoolId: string,
  dashboardDate: string,
  setDefaultersData: (data: Array<{ month: string; challan: number; amount: number }>) => void,
  setDefaultersLoading: (loading: boolean) => void
): Promise<void> => {
  if (!schoolId) return;

  setDefaultersLoading(true);
  try {
    if (USE_DUMMY_DATA) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setDefaultersData(generateDummyDefaulters());
      setDefaultersLoading(false);
      return;
    }

    const selectedDate = new Date(dashboardDate);
    const currentMonth = selectedDate.getMonth() + 1;
    const currentYear = selectedDate.getFullYear();
    const sixMonthsAgo = new Date(currentYear, currentMonth - 7, 1).toISOString().slice(0, 10);
    
    const invoices = await fetchAllRows(async (from, to) => {
      const result = await supabase
        .from('fee_invoices')
        .select('id, total_amount, month, year, status, due_date, invoice_date')
        .eq('school_id', schoolId)
        .in('status', ['unpaid', 'partial', 'overdue'])
        .gte('invoice_date', sixMonthsAgo)
        .range(from, to);
      return { data: result.data, error: result.error };
    });

    const invoiceIds = invoices.map((inv: any) => inv.id);
    let payments: any[] = [];
    if (invoiceIds.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < invoiceIds.length; i += chunkSize) {
        const chunk = invoiceIds.slice(i, i + chunkSize);
        const { data } = await supabase
          .from('fee_payments')
          .select('id, invoice_id, amount')
          .eq('school_id', schoolId)
          .in('invoice_id', chunk);
        if (data) payments = payments.concat(data);
      }
    }

    const paymentsByInvoice = new Map<number, number>();
    payments.forEach((payment: any) => {
      const invoiceId = payment.invoice_id;
      const amount = Number(payment.amount) || 0;
      paymentsByInvoice.set(invoiceId, (paymentsByInvoice.get(invoiceId) || 0) + amount);
    });

    const parseMonth = (month: any): number => {
      if (typeof month === 'number') return month;
      if (typeof month === 'string') {
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december'];
        const monthIndex = monthNames.findIndex(m => m.toLowerCase().startsWith(month.toLowerCase()));
        if (monthIndex !== -1) return monthIndex + 1;
        const num = parseInt(month);
        if (!isNaN(num) && num >= 1 && num <= 12) return num;
      }
      return 0;
    };

    const monthlyData: { [key: string]: { challan: number; amount: number } } = {};
    const months: string[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i - 1, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const monthLabel = `${date.toLocaleDateString('en-US', { month: 'short' })}-${date.getFullYear()}`;
      months.push(monthLabel);
      monthlyData[monthKey] = { challan: 0, amount: 0 };
    }

    invoices.forEach((invoice: any) => {
      let invoiceYear = invoice.year;
      let invoiceMonth = parseMonth(invoice.month);

      if (!invoiceYear || !invoiceMonth) {
        const invoiceDate = invoice.invoice_date ? new Date(invoice.invoice_date) :
          (invoice.due_date ? new Date(invoice.due_date) : null);
        if (invoiceDate) {
          invoiceYear = invoiceYear || invoiceDate.getFullYear();
          invoiceMonth = invoiceMonth || invoiceDate.getMonth() + 1;
        }
      }

      if (!invoiceYear || !invoiceMonth) return;

      const monthKey = new Date(invoiceYear, invoiceMonth - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (monthlyData.hasOwnProperty(monthKey)) {
        const totalAmount = Number(invoice.total_amount) || 0;
        const paid = paymentsByInvoice.get(invoice.id) || 0;
        const remaining = totalAmount - paid;

        if (remaining > 0) {
          monthlyData[monthKey].challan += 1;
          monthlyData[monthKey].amount += remaining;
        }
      }
    });

    const defaultersArray = months.map(monthLabel => {
      const monthKey = Object.keys(monthlyData).find(key => {
        const date = new Date(key);
        const label = `${date.toLocaleDateString('en-US', { month: 'short' })}-${date.getFullYear()}`;
        return label === monthLabel;
      });

      if (monthKey) {
        return {
          month: monthLabel,
          challan: monthlyData[monthKey].challan,
          amount: monthlyData[monthKey].amount
        };
      }

      return {
        month: monthLabel,
        challan: 0,
        amount: 0
      };
    });

    setDefaultersData(defaultersArray);
  } catch (error) {
    console.error('Error fetching defaulters data:', error);
  } finally {
    setDefaultersLoading(false);
  }
};

