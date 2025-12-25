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
  dashboardDate: string,
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

    // Fetch fee challans (same as FeeCollectionNew)
    let challansQuery = supabase
      .from('fee_challans')
      .select('total_amount')
      .eq('school_id', schoolId);

    if (sessionData?.id) {
      challansQuery = challansQuery.eq('session_id', sessionData.id);
    }

    const challansData = await fetchAllRows(async (from, to) => {
      const result = await challansQuery.range(from, to);
      return { data: result.data, error: result.error };
    });

    // Fetch fee arrears (same as FeeCollectionNew)
    let arrearsData: any[] = [];
    if (sessionData?.id) {
      const arrearsQuery = supabase
        .from('fee_arrears')
        .select('amount')
        .eq('school_id', schoolId)
        .eq('session_id', sessionData.id)
        .in('status', ['unpaid', 'partial']);
      
      arrearsData = await fetchAllRows(async (from, to) => {
        const result = await arrearsQuery.range(from, to);
        return { data: result.data, error: result.error };
      });
    }

    // Fetch payments up to dashboardDate (using created_at, not payment_date)
    const dashboardDateObj = new Date(dashboardDate);
    dashboardDateObj.setHours(23, 59, 59, 999);
    const paymentsData = await fetchAllRows(async (from, to) => {
      const result = await supabase
        .from('fee_payments')
        .select('amount, discount_amount')
        .eq('school_id', schoolId)
        .lte('created_at', dashboardDateObj.toISOString())
        .range(from, to);
      return { data: result.data, error: result.error };
    });

    // Calculate totals (same as FeeCollectionNew: challanTotal + arrearTotal)
    const challanTotal = challansData.reduce((sum, challan) => sum + (Number(challan.total_amount) || 0), 0);
    const arrearTotal = arrearsData.reduce((sum, arrear) => sum + (Number(arrear.amount) || 0), 0);
    const totalInvoiced = challanTotal + arrearTotal;
    const totalCollected = paymentsData.reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);
    const totalDiscount = paymentsData.reduce((sum, pay) => sum + (Number(pay.discount_amount) || 0), 0);
    const totalOutstanding = totalInvoiced - totalCollected - totalDiscount;
    const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

    const summaryData: FeeSummary = {
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      collectionRate,
      totalDiscount
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
    const monthlyStartDate = new Date(currentYear, currentMonth - 12, 1);

    // Fetch daily payments with pagination (using payment_date, capped at dashboardDate)
    const dailyPayments = await fetchAllRows(async (from, to) => {
      const result = await supabase
      .from('fee_payments')
        .select('amount, payment_date')
      .eq('school_id', schoolId)
      .gte('payment_date', startDate.toISOString().slice(0, 10))
        .lte('payment_date', endDate.toISOString().slice(0, 10))
        .range(from, to);
      return { data: result.data, error: result.error };
    });

    // Fetch monthly payments with pagination (using payment_date, capped at dashboardDate)
    const monthlyPayments = await fetchAllRows(async (from, to) => {
      const result = await supabase
      .from('fee_payments')
        .select('amount, payment_date')
      .eq('school_id', schoolId)
      .gte('payment_date', monthlyStartDate.toISOString().slice(0, 10))
        .lte('payment_date', endDate.toISOString().slice(0, 10))
        .range(from, to);
      return { data: result.data, error: result.error };
    });
    
    const monthlyData: { [key: string]: number } = {};
    monthlyPayments.forEach((p: any) => {
      if (p.payment_date) {
        const date = new Date(p.payment_date);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (Number(p.amount) || 0);
      }
    });
    
    const monthlyResult = {
      data: Object.entries(monthlyData).map(([month, amount]) => ({ month, amount })),
      error: null
    };

    const dailyDataMap: { [key: string]: number } = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() - i);
      const dayLabel = `${date.getDate()}/${date.getMonth() + 1}`;
      dailyDataMap[dayLabel] = 0;
    }

    dailyPayments.forEach((payment: any) => {
        if (payment.payment_date) {
          const paymentDate = new Date(payment.payment_date);
          const dayLabel = `${paymentDate.getDate()}/${paymentDate.getMonth() + 1}`;
          if (dailyDataMap.hasOwnProperty(dayLabel)) {
          dailyDataMap[dayLabel] = (dailyDataMap[dayLabel] || 0) + (Number(payment.amount) || 0);
          }
        }
      });

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
    // monthlyResult.data is already processed from monthlyPayments above
    // It's an array of { month: string; amount: number } objects
    if (monthlyResult.data && Array.isArray(monthlyResult.data)) {
      monthlyResult.data.forEach((item: { month: string; amount: number }) => {
          monthlyDataMap[item.month] = Number(item.amount) || 0;
        });
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
    const currentMonth = selectedDate.getMonth() + 1; // 1-12
    const currentYear = selectedDate.getFullYear();
    
    // Calculate previous month (e.g., if current is Dec 2025, previous is Nov 2025)
    let previousMonth = currentMonth - 1;
    let previousYear = currentYear;
    if (previousMonth < 1) {
      previousMonth = 12;
      previousYear = currentYear - 1;
    }
    
    // Calculate date ranges
    const previousMonthStart = new Date(previousYear, previousMonth - 1, 1);
    const previousMonthEnd = new Date(previousYear, previousMonth, 0, 23, 59, 59);
    const currentMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    
    // Calculate next month for payment fetching
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear = currentYear + 1;
    }
    const nextMonthEnd = new Date(nextYear, nextMonth, 0, 23, 59, 59);
    
    // Fetch all students in the session (including withdrawn to check dropped out for previous/current months)
    const allStudents = await fetchAllRows(async (from, to) => {
      const result = await supabase
        .from('students')
        .select('id, admission_date, status, session_id, class_id, section_id, updated_at')
        .eq('school_id', schoolId)
        .eq('session_id', sessionData.id)
        .in('status', ['active', 'withdrawn', 'dropped'])
        .range(from, to);
      return { data: result.data, error: result.error };
    });

    // For next months calculation, only use active students (same as challan generation)
    const activeStudents = allStudents.filter((s: any) => s.status === 'active');
    
    // Fetch student class history for active session to get current class/section (same as challan generation)
    const studentClassMap = new Map<number, { classId: number; sectionId: number | null }>();
    if (activeStudents.length > 0) {
      const activeStudentIds = activeStudents.map((s: any) => s.id);
      const chunkSize = 1000;
      for (let i = 0; i < activeStudentIds.length; i += chunkSize) {
        const chunk = activeStudentIds.slice(i, i + chunkSize);
        const classHistory = await fetchAllRows(async (from, to) => {
          const result = await supabase
            .from('student_class_history')
            .select('student_id, new_class_id, new_section_id')
          .eq('school_id', schoolId)
            .eq('session_id', sessionData.id)
            .in('student_id', chunk)
            .order('id', { ascending: false })
            .range(from, to);
          return { data: result.data, error: result.error };
        });
        
        // Get the latest class history for each student
        classHistory?.forEach((entry: any) => {
          if (!studentClassMap.has(entry.student_id)) {
            studentClassMap.set(entry.student_id, {
              classId: entry.new_class_id,
              sectionId: entry.new_section_id
            });
          }
        });
      }
    }
    
    // Fetch fee plans for all students
    const studentIds = allStudents.map((s: any) => s.id);
    const feePlansMap = new Map<number, any>();
    
    if (studentIds.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < studentIds.length; i += chunkSize) {
        const chunk = studentIds.slice(i, i + chunkSize);
        const plans = await fetchAllRows(async (from, to) => {
          const result = await supabase
            .from('fee_plans')
            .select('id, student_id, effective_from, created_at')
          .eq('school_id', schoolId)
            .in('student_id', chunk)
            .range(from, to);
          return { data: result.data, error: result.error };
        });
        
        // Fetch fee plan items for these plans
        const planIds = plans.map((p: any) => p.id);
        if (planIds.length > 0) {
          const planItemsChunkSize = 1000;
          for (let j = 0; j < planIds.length; j += planItemsChunkSize) {
            const planItemsChunk = planIds.slice(j, j + planItemsChunkSize);
            const planItems = await fetchAllRows(async (from, to) => {
              const result = await supabase
                .from('fee_plan_items')
                .select('id, fee_plan_id, fee_head_id, fee_after_discount')
                .eq('school_id', schoolId)
                .in('fee_plan_id', planItemsChunk)
                .range(from, to);
              return { data: result.data, error: result.error };
            });
            
            // Group items by plan
            plans.forEach((plan: any) => {
              if (!feePlansMap.has(plan.student_id)) {
                feePlansMap.set(plan.student_id, {
                  planId: plan.id,
                  effectiveFrom: plan.effective_from,
                  createdAt: plan.created_at,
                  items: []
                });
              }
              const planData = feePlansMap.get(plan.student_id);
              const items = planItems.filter((item: any) => item.fee_plan_id === plan.id);
              planData.items = items;
            });
          }
        }
      }
    }
    
    // Fetch fee structures to check frequency
    // Note: fee_structures may not have session_id column, so we filter by school_id only
    const feeStructures = await fetchAllRows(async (from, to) => {
      const result = await supabase
        .from('fee_structures')
        .select('id, class_id, section_id, fee_head_id, months, first_time')
        .eq('school_id', schoolId)
        .range(from, to);
      return { data: result.data, error: result.error };
    });
    
    // Build structure map by class/section/fee_head
    const structureMap = new Map<string, any>();
    feeStructures.forEach((struct: any) => {
      const key = `${struct.class_id}_${struct.section_id || 'null'}_${struct.fee_head_id}`;
      structureMap.set(key, struct);
    });

    // Fetch challans for previous, current, and future months
    // Include all challans (including one-time) up to current month end
    const challans = await fetchAllRows(async (from, to) => {
      const result = await supabase
        .from('fee_challans')
        .select('id, student_id, total_amount, month, year, due_date, created_at')
        .eq('school_id', schoolId)
        .eq('session_id', sessionData.id)
        .lte('created_at', currentMonthEnd.toISOString())
        .range(from, to);
      return { data: result.data, error: result.error };
    });

    // Fetch fee arrears
    const arrears = await fetchAllRows(async (from, to) => {
      const result = await supabase
        .from('fee_arrears')
        .select('id, student_id, amount, due_date, created_at')
        .eq('school_id', schoolId)
        .eq('session_id', sessionData.id)
        .in('status', ['unpaid', 'partial'])
        .range(from, to);
      return { data: result.data, error: result.error };
    });

    // Fetch all payments with payment items for previous, current, and next months
    // Filter by created_at to determine which month payments belong to
    // Also filter by dashboardDate to only include payments up to the selected date
    const dashboardDateObj = new Date(dashboardDate);
    dashboardDateObj.setHours(23, 59, 59, 999);
    const payments = await fetchAllRows(async (from, to) => {
      const result = await supabase
        .from('fee_payments')
        .select(`
          id,
          student_id,
          amount,
          discount_amount,
          created_at,
          fee_payment_items (
            id,
            fee_challan_item_id,
            fee_arrear_id,
            paid_amount
          )
        `)
        .eq('school_id', schoolId)
        .gte('created_at', previousMonthStart.toISOString())
        .lte('created_at', dashboardDateObj.toISOString())
        .range(from, to);
      return { data: result.data, error: result.error };
    });

    // Build maps for payments and discounts
    const paymentsByChallan = new Map<number, number>(); // Used for balance calculations
    const paymentsByArrear = new Map<number, number>(); // Used for balance calculations
    const paymentsByMonth = new Map<string, { paid: number; discount: number }>(); // key: "studentId_year_month" for tracking payments/discounts by month

    // Fetch challan items to map payment items to challans
    const challanIds = challans.map((ch: any) => ch.id);
    let challanItems: any[] = [];
    if (challanIds.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < challanIds.length; i += chunkSize) {
        const chunk = challanIds.slice(i, i + chunkSize);
        const chunkItems = await fetchAllRows(async (from, to) => {
          const result = await supabase
            .from('fee_challans_items')
            .select('id, challan_id, fee_head_id')
          .eq('school_id', schoolId)
            .in('challan_id', chunk)
            .range(from, to);
          return { data: result.data, error: result.error };
        });
        challanItems = challanItems.concat(chunkItems);
      }
    }
    const challanItemToChallanMap = new Map<number, number>();
    challanItems.forEach((item: any) => {
      challanItemToChallanMap.set(item.id, item.challan_id);
    });

    // Process payments and group by student and month
    // Use fee_payments.amount and fee_payments.discount_amount directly based on created_at
    payments.forEach((payment: any) => {
      const createdAt = new Date(payment.created_at);
      const paymentMonth = createdAt.getMonth() + 1;
      const paymentYear = createdAt.getFullYear();
      const monthKey = `${payment.student_id}_${paymentYear}_${paymentMonth}`;
      
      // Use amount and discount_amount columns directly from fee_payments table
      const paymentAmount = Number(payment.amount) || 0;
      const paymentDiscount = Number(payment.discount_amount) || 0;
      
      // Track payments by challan/arrear for balance calculations (using payment items)
      if (payment.fee_payment_items && payment.fee_payment_items.length > 0) {
        payment.fee_payment_items.forEach((item: any) => {
          const paidAmount = Number(item.paid_amount || item.amount || 0);
          
          if (item.fee_challan_item_id) {
            const challanId = challanItemToChallanMap.get(item.fee_challan_item_id);
            if (challanId) {
              paymentsByChallan.set(challanId, (paymentsByChallan.get(challanId) || 0) + paidAmount);
            }
          } else if (item.fee_arrear_id) {
            paymentsByArrear.set(item.fee_arrear_id, (paymentsByArrear.get(item.fee_arrear_id) || 0) + paidAmount);
          }
        });
      }
      
      // Track all payments and discounts by month using fee_payments.amount and fee_payments.discount_amount
      // Based on created_at to determine which month the payment belongs to
      const current = paymentsByMonth.get(monthKey) || { paid: 0, discount: 0 };
      current.paid += paymentAmount;
      current.discount += paymentDiscount;
      paymentsByMonth.set(monthKey, current);
    });

    // Helper function to parse month value
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

    // Helper function to check if a fee structure applies to a specific month
    const feeAppliesToMonth = (structure: any, targetMonth: number): boolean => {
      if (structure.first_time) return false; // One-time fees don't apply to monthly calculations
      if (!structure.months || structure.months.length === 0) return false;
      if (structure.months.length === 12) return true; // All months
      return structure.months.includes(targetMonth);
    };

    // Initialize category data
    const previousArrears = {
      oldStudents: 0,
      newAdmissions: 0,
      totalPayable: 0,
      paid: 0,
      discount: 0,
      droppedOut: 0,
      remaining: 0,
      balance: 0
    };

    const currentMonthData = {
      oldStudents: 0,
      newAdmissions: 0,
      totalPayable: 0,
      paid: 0,
      discount: 0,
      droppedOut: 0,
      remaining: 0,
      balance: 0
    };

    const nextMonths = {
      oldStudents: 0,
      newAdmissions: 0,
      totalPayable: 0,
      paid: 0,
      discount: 0,
      droppedOut: 0,
      remaining: 0,
      balance: 0
    };

    // Helper to check if student is new admission (registered in previous month)
    const isNewAdmission = (admissionDate: string | null): boolean => {
      if (!admissionDate) return false;
      const admission = new Date(admissionDate);
      return admission.getFullYear() === previousYear && admission.getMonth() + 1 === previousMonth;
    };

    // Helper to check if student is old (registered before previous month)
    const isOldStudent = (admissionDate: string | null): boolean => {
      if (!admissionDate) return true; // Default to old if no date
      const admission = new Date(admissionDate);
      const admissionYear = admission.getFullYear();
      const admissionMonth = admission.getMonth() + 1;
      return admissionYear < previousYear || (admissionYear === previousYear && admissionMonth < previousMonth);
    };

    // Process previous month (November) - use challans and arrears
    // Include regular monthly challans for previous month AND one-time challans created in or before previous month
    const previousMonthChallans = challans.filter((ch: any) => {
      // Include one-time challans created in or before previous month
      if (ch.month === 'one-time' || ch.month === 'one time') {
        if (ch.created_at) {
          const createdDate = new Date(ch.created_at);
          return createdDate <= previousMonthEnd;
        }
        // If no created_at, include it (backward compatibility)
        return true;
      }
      // Include regular monthly challans for previous month
      const challanYear = ch.year;
      const challanMonth = parseMonth(ch.month);
      return challanYear === previousYear && challanMonth === previousMonth;
    });
    
    // Process challans for previous month
    previousMonthChallans.forEach((challan: any) => {
      const student = allStudents.find((s: any) => s.id === challan.student_id);
      if (!student) return;
      
      const totalAmount = Number(challan.total_amount) || 0;
      
      // Categorize based on challan creation date, not student registration
      // New = challan created in previous month, Old = challan created before previous month
      let isNew = false;
      let isOld = false;
      if (challan.created_at) {
        const challanCreatedDate = new Date(challan.created_at);
        const challanCreatedYear = challanCreatedDate.getFullYear();
        const challanCreatedMonth = challanCreatedDate.getMonth() + 1;
        isNew = challanCreatedYear === previousYear && challanCreatedMonth === previousMonth;
        isOld = challanCreatedYear < previousYear || (challanCreatedYear === previousYear && challanCreatedMonth < previousMonth);
      } else {
        // If no created_at, default to old (backward compatibility)
        isOld = true;
      }
      
      if (isNew) {
        previousArrears.newAdmissions += totalAmount;
      } else if (isOld) {
        previousArrears.oldStudents += totalAmount;
      }
      
      previousArrears.totalPayable += totalAmount;
      
      const studentStatus = student.status || 'active';
      const isDroppedOut = studentStatus === 'withdrawn' || studentStatus === 'dropped';
      const wasDroppedInPreviousMonth = isDroppedOut && student.updated_at && 
        new Date(student.updated_at) >= previousMonthStart && 
        new Date(student.updated_at) <= previousMonthEnd;
      
    });
    
    // Add all payments and discounts made in previous month (same logic for all rows)
    // Use fee_payments.amount and fee_payments.discount_amount based on created_at
    allStudents.forEach((student: any) => {
      const previousMonthKey = `${student.id}_${previousYear}_${previousMonth}`;
      const monthPayments = paymentsByMonth.get(previousMonthKey) || { paid: 0, discount: 0 };
      previousArrears.paid += monthPayments.paid;
      previousArrears.discount += monthPayments.discount;
    });
    
    // Recalculate remaining for previous arrears
    previousArrears.remaining = previousArrears.totalPayable - previousArrears.paid - previousArrears.discount;
    
    // Process arrears for previous month
    arrears.forEach((arrear: any) => {
      const arrearDate = arrear.due_date ? new Date(arrear.due_date) :
        (arrear.created_at ? new Date(arrear.created_at) : null);
      if (!arrearDate) return;
      
      const arrearYear = arrearDate.getFullYear();
      const arrearMonth = arrearDate.getMonth() + 1;
      
      // Only include arrears from previous month
      if (arrearYear !== previousYear || arrearMonth !== previousMonth) return;
      
      const student = allStudents.find((s: any) => s.id === arrear.student_id);
      if (!student) return;
      
      const totalAmount = Number(arrear.amount) || 0;
      
      // Categorize based on arrear creation date, not student registration
      // New = arrear created in previous month, Old = arrear created before previous month
      let isNew = false;
      let isOld = false;
      if (arrear.created_at) {
        const arrearCreatedDate = new Date(arrear.created_at);
        const arrearCreatedYear = arrearCreatedDate.getFullYear();
        const arrearCreatedMonth = arrearCreatedDate.getMonth() + 1;
        isNew = arrearCreatedYear === previousYear && arrearCreatedMonth === previousMonth;
        isOld = arrearCreatedYear < previousYear || (arrearCreatedYear === previousYear && arrearCreatedMonth < previousMonth);
      } else {
        // If no created_at, default to old (backward compatibility)
        isOld = true;
      }
      
      if (isNew) {
        previousArrears.newAdmissions += totalAmount;
      } else if (isOld) {
        previousArrears.oldStudents += totalAmount;
      }
      
      previousArrears.totalPayable += totalAmount;
      
      const studentStatus = student.status || 'active';
      const isDroppedOut = studentStatus === 'withdrawn' || studentStatus === 'dropped';
      const wasDroppedInPreviousMonth = isDroppedOut && student.updated_at && 
        new Date(student.updated_at) >= previousMonthStart && 
        new Date(student.updated_at) <= previousMonthEnd;
      
    });

    // Process current month (December) - use challans and arrears
    // Include regular monthly challans for current month AND one-time challans created in or before current month
    const currentMonthChallans = challans.filter((ch: any) => {
      // Include one-time challans created in or before current month
      if (ch.month === 'one-time' || ch.month === 'one time') {
        if (ch.created_at) {
          const createdDate = new Date(ch.created_at);
          return createdDate <= currentMonthEnd;
        }
        // If no created_at, include it (backward compatibility)
        return true;
      }
      // Include regular monthly challans for current month
      const challanYear = ch.year;
      const challanMonth = parseMonth(ch.month);
      return challanYear === currentYear && challanMonth === currentMonth;
    });
    
    // Process challans for current month
    currentMonthChallans.forEach((challan: any) => {
      const student = allStudents.find((s: any) => s.id === challan.student_id);
      if (!student) return;
      
      const totalAmount = Number(challan.total_amount) || 0;
      
      // Categorize based on challan creation date, not student registration
      // New = challan created in current month, Old = challan created before current month
      let isNew = false;
      let isOld = false;
      if (challan.created_at) {
        const challanCreatedDate = new Date(challan.created_at);
        const challanCreatedYear = challanCreatedDate.getFullYear();
        const challanCreatedMonth = challanCreatedDate.getMonth() + 1;
        isNew = challanCreatedYear === currentYear && challanCreatedMonth === currentMonth;
        isOld = challanCreatedYear < currentYear || (challanCreatedYear === currentYear && challanCreatedMonth < currentMonth);
      } else {
        // If no created_at, default to old (backward compatibility)
        isOld = true;
      }
      
      if (isNew) {
        currentMonthData.newAdmissions += totalAmount;
      } else if (isOld) {
        currentMonthData.oldStudents += totalAmount;
      }
      
      currentMonthData.totalPayable += totalAmount;
      
      const studentStatus = student.status || 'active';
      const isDroppedOut = studentStatus === 'withdrawn' || studentStatus === 'dropped';
      const wasDroppedInCurrentMonth = isDroppedOut && student.updated_at && 
        new Date(student.updated_at) >= currentMonthStart && 
        new Date(student.updated_at) <= currentMonthEnd;
      
    });
    
    // Add all payments and discounts made in current month (same logic for all rows)
    // Use fee_payments.amount and fee_payments.discount_amount based on created_at
    allStudents.forEach((student: any) => {
      const currentMonthKey = `${student.id}_${currentYear}_${currentMonth}`;
      const monthPayments = paymentsByMonth.get(currentMonthKey) || { paid: 0, discount: 0 };
      currentMonthData.paid += monthPayments.paid;
      currentMonthData.discount += monthPayments.discount;
    });
    
    // Recalculate remaining for current month
    currentMonthData.remaining = currentMonthData.totalPayable - currentMonthData.paid - currentMonthData.discount;
    
    // Process arrears for current month
    arrears.forEach((arrear: any) => {
      const arrearDate = arrear.due_date ? new Date(arrear.due_date) :
        (arrear.created_at ? new Date(arrear.created_at) : null);
      if (!arrearDate) return;
      
      const arrearYear = arrearDate.getFullYear();
      const arrearMonth = arrearDate.getMonth() + 1;
      
      // Only include arrears from current month
      if (arrearYear !== currentYear || arrearMonth !== currentMonth) return;
      
      const student = allStudents.find((s: any) => s.id === arrear.student_id);
      if (!student) return;
      
      const totalAmount = Number(arrear.amount) || 0;
      
      // Categorize based on arrear creation date, not student registration
      // New = arrear created in current month, Old = arrear created before current month
      let isNew = false;
      let isOld = false;
      if (arrear.created_at) {
        const arrearCreatedDate = new Date(arrear.created_at);
        const arrearCreatedYear = arrearCreatedDate.getFullYear();
        const arrearCreatedMonth = arrearCreatedDate.getMonth() + 1;
        isNew = arrearCreatedYear === currentYear && arrearCreatedMonth === currentMonth;
        isOld = arrearCreatedYear < currentYear || (arrearCreatedYear === currentYear && arrearCreatedMonth < currentMonth);
      } else {
        // If no created_at, default to old (backward compatibility)
        isOld = true;
      }
      
      if (isNew) {
        currentMonthData.newAdmissions += totalAmount;
      } else {
        currentMonthData.oldStudents += totalAmount;
      }
      
      currentMonthData.totalPayable += totalAmount;
      
      const studentStatus = student.status || 'active';
      const isDroppedOut = studentStatus === 'withdrawn' || studentStatus === 'dropped';
      const wasDroppedInCurrentMonth = isDroppedOut && student.updated_at && 
        new Date(student.updated_at) >= currentMonthStart && 
        new Date(student.updated_at) <= currentMonthEnd;
      
    });

    // Process next month using fee plans (for the month after current)
    // Calculate only the next month (e.g., if current is Dec 2025, next is Jan 2026)
    // Note: nextMonth and nextYear are already calculated above for payment fetching

    // Build a set of students who have existing challans (old students)
    const studentsWithChallans = new Set<number>();
    challans.forEach((challan: any) => {
      studentsWithChallans.add(challan.student_id);
    });
    
    // Build a set of one-time fee heads that have already been generated per student
    const oneTimeGenerated = new Set<string>(); // "studentId-feeHeadId"
    challanItems.forEach((item: any) => {
      const challan = challans.find((ch: any) => ch.id === item.challan_id);
      if (challan && (challan.month === 'one-time' || challan.month === 'one time')) {
        const key = `${challan.student_id}-${item.fee_head_id}`;
        oneTimeGenerated.add(key);
      }
    });
    
    // Build a set of monthly challans already generated per student/month/year/fee_head
    const monthlyGenerated = new Set<string>(); // "studentId-month-year-feeHeadId"
    challanItems.forEach((item: any) => {
      const challan = challans.find((ch: any) => ch.id === item.challan_id);
      if (challan && challan.month !== 'one-time' && challan.month !== 'one time') {
        const challanMonth = parseMonth(challan.month);
        const key = `${challan.student_id}-${challanMonth}-${challan.year}-${item.fee_head_id}`;
        monthlyGenerated.add(key);
      }
    });
    
    // Process next month using fee plans (only active students, same as challan generation)
    // This calculates what would be generated for next month's challans (e.g., Jan 2026 if current is Dec 2025)
    {
      const year = nextYear;
      const month = nextMonth;
      activeStudents.forEach((student: any) => {
        const studentId = student.id;
        const studentStatus = student.status || 'active';
        const isDroppedOut = studentStatus === 'withdrawn' || studentStatus === 'dropped';
        
        const feePlan = feePlansMap.get(studentId);
        if (!feePlan || !feePlan.items || feePlan.items.length === 0) return;
        
        // Categorize based on whether student has existing challans (not based on dates)
        // Old = student has existing challans, New = student has no challans yet
        const hasExistingChallans = studentsWithChallans.has(studentId);
        const isOld = hasExistingChallans;
        const isNew = !hasExistingChallans;
        
        // Calculate applicable fee for this future month based on frequency (like challan generation)
        let applicableFee = 0;
        
        // Get student's current class/section from student_class_history (same as challan generation)
        // Fallback to student's class_id/section_id if no history found
        const studentClassInfo = studentClassMap.get(studentId) || {
          classId: student.class_id,
          sectionId: student.section_id
        };
        
        if (!studentClassInfo.classId) return; // Skip if no class found
        
        feePlan.items.forEach((planItem: any) => {
          // Find fee structure for this student's class/section and fee head
          // Try with section first, then without section (for class-level structures)
          let structure = structureMap.get(`${studentClassInfo.classId}_${studentClassInfo.sectionId || 'null'}_${planItem.fee_head_id}`);
          
          if (!structure) {
            // Try without section (for class-level structures)
            structure = structureMap.get(`${studentClassInfo.classId}_null_${planItem.fee_head_id}`);
          }
          
          if (!structure) return; // Skip if no structure found
          
          // Check if this fee should be included for this month (same logic as challan generation)
          let shouldInclude = false;
          
          if (structure.first_time) {
            // One-time fee - only include if not already generated
            const oneTimeKey = `${studentId}-${planItem.fee_head_id}`;
            if (!oneTimeGenerated.has(oneTimeKey)) {
              shouldInclude = true;
            }
          } else if (structure.months && structure.months.length > 0) {
            // Monthly fees - check if this month is in the frequency list
            if (structure.months.length === 12) {
              // All months - include for any month
              shouldInclude = true;
            } else {
              // Specific months - only include if this month matches
              shouldInclude = structure.months.includes(month);
            }
            
            // Also check if challan already exists for this month/year
            if (shouldInclude) {
              const monthlyKey = `${studentId}-${month}-${year}-${planItem.fee_head_id}`;
              if (monthlyGenerated.has(monthlyKey)) {
                shouldInclude = false; // Already generated, don't include
              }
            }
          }
          
          if (shouldInclude) {
            applicableFee += Number(planItem.fee_after_discount || 0);
          }
        });
        
        if (applicableFee === 0) return; // Skip if no applicable fees
        
        if (isNew) {
          nextMonths.newAdmissions += applicableFee;
        } else if (isOld) {
          nextMonths.oldStudents += applicableFee;
        }
        
        nextMonths.totalPayable += applicableFee;

        if (isDroppedOut) {
          nextMonths.droppedOut += applicableFee;
        }
      });
      
      // Add all payments and discounts made in next month (count all payments, same logic as previous/current)
      // Use fee_payments.amount and fee_payments.discount_amount based on created_at
      allStudents.forEach((student: any) => {
        const nextMonthKey = `${student.id}_${nextYear}_${nextMonth}`;
        const monthPayments = paymentsByMonth.get(nextMonthKey) || { paid: 0, discount: 0 };
        nextMonths.paid += monthPayments.paid;
        nextMonths.discount += monthPayments.discount;
      });
      
      // Recalculate remaining for next months
      nextMonths.remaining = nextMonths.totalPayable - nextMonths.paid - nextMonths.discount;
    }

    // Calculate balance (unpaid dues) for each row
    // Previous arrears row: balance from month before previous month (e.g., October if previous is November)
    let balanceMonth = previousMonth - 1;
    let balanceYear = previousYear;
    if (balanceMonth < 1) {
      balanceMonth = 12;
      balanceYear = previousYear - 1;
    }
    const balanceMonthStart = new Date(balanceYear, balanceMonth - 1, 1);
    const balanceMonthEnd = new Date(balanceYear, balanceMonth, 0, 23, 59, 59);
    
    // Calculate unpaid balance for month before previous month
    const balanceMonthChallans = challans.filter((ch: any) => {
      if (ch.month === 'one-time' || ch.month === 'one time') {
        if (ch.created_at) {
          const createdDate = new Date(ch.created_at);
          return createdDate <= balanceMonthEnd;
        }
        return true;
      }
      const challanYear = ch.year;
      const challanMonth = parseMonth(ch.month);
      return challanYear === balanceYear && challanMonth === balanceMonth;
    });
    
    // Calculate total payable for balance month
    let balanceMonthTotalPayable = 0;
    balanceMonthChallans.forEach((challan: any) => {
      balanceMonthTotalPayable += Number(challan.total_amount) || 0;
    });
    
    const balanceMonthArrears = arrears.filter((arrear: any) => {
      if (!arrear.month) return false;
      const arrearYear = arrear.year;
      const arrearMonth = parseMonth(arrear.month);
      return arrearYear === balanceYear && arrearMonth === balanceMonth;
    });
    
    balanceMonthArrears.forEach((arrear: any) => {
      balanceMonthTotalPayable += Number(arrear.amount) || 0;
    });
    
    // Get all payments and discounts made in balance month (count all payments, not specific to challans/arrears)
    let balanceMonthPaid = 0;
    let balanceMonthDiscount = 0;
    allStudents.forEach((student: any) => {
      const balanceMonthKey = `${student.id}_${balanceYear}_${balanceMonth}`;
      const monthPayments = paymentsByMonth.get(balanceMonthKey) || { paid: 0, discount: 0 };
      balanceMonthPaid += monthPayments.paid;
      balanceMonthDiscount += monthPayments.discount;
    });
    
    previousArrears.balance = balanceMonthTotalPayable - balanceMonthPaid - balanceMonthDiscount;
    
    // Current month row: balance from previous month (e.g., November if current is December)
    const previousMonthChallansForBalance = challans.filter((ch: any) => {
      if (ch.month === 'one-time' || ch.month === 'one time') {
        if (ch.created_at) {
          const createdDate = new Date(ch.created_at);
          return createdDate <= previousMonthEnd;
        }
        return true;
      }
      const challanYear = ch.year;
      const challanMonth = parseMonth(ch.month);
      return challanYear === previousYear && challanMonth === previousMonth;
    });
    
    // Calculate total payable for previous month (balance for current month row)
    let previousMonthTotalPayable = 0;
    previousMonthChallansForBalance.forEach((challan: any) => {
      previousMonthTotalPayable += Number(challan.total_amount) || 0;
    });
    
    const previousMonthArrearsForBalance = arrears.filter((arrear: any) => {
      if (!arrear.month) return false;
      const arrearYear = arrear.year;
      const arrearMonth = parseMonth(arrear.month);
      return arrearYear === previousYear && arrearMonth === previousMonth;
    });
    
    previousMonthArrearsForBalance.forEach((arrear: any) => {
      previousMonthTotalPayable += Number(arrear.amount) || 0;
    });
    
    // Get all payments and discounts made in previous month
    let previousMonthPaid = 0;
    let previousMonthDiscount = 0;
    allStudents.forEach((student: any) => {
      const previousMonthKey = `${student.id}_${previousYear}_${previousMonth}`;
      const monthPayments = paymentsByMonth.get(previousMonthKey) || { paid: 0, discount: 0 };
      previousMonthPaid += monthPayments.paid;
      previousMonthDiscount += monthPayments.discount;
    });
    
    currentMonthData.balance = previousMonthTotalPayable - previousMonthPaid - previousMonthDiscount;
    
    // Next months row: balance from current month (e.g., December)
    const currentMonthChallansForBalance = challans.filter((ch: any) => {
      if (ch.month === 'one-time' || ch.month === 'one time') {
        if (ch.created_at) {
          const createdDate = new Date(ch.created_at);
          return createdDate <= currentMonthEnd;
        }
        return true;
      }
      const challanYear = ch.year;
      const challanMonth = parseMonth(ch.month);
      return challanYear === currentYear && challanMonth === currentMonth;
    });
    
    // Calculate total payable for current month (balance for next months row)
    let currentMonthTotalPayable = 0;
    currentMonthChallansForBalance.forEach((challan: any) => {
      currentMonthTotalPayable += Number(challan.total_amount) || 0;
    });
    
    const currentMonthArrearsForBalance = arrears.filter((arrear: any) => {
      if (!arrear.month) return false;
      const arrearYear = arrear.year;
      const arrearMonth = parseMonth(arrear.month);
      return arrearYear === currentYear && arrearMonth === currentMonth;
    });
    
    currentMonthArrearsForBalance.forEach((arrear: any) => {
      currentMonthTotalPayable += Number(arrear.amount) || 0;
    });
    
    // Get all payments and discounts made in current month
    let currentMonthPaidForBalance = 0;
    let currentMonthDiscountForBalance = 0;
    allStudents.forEach((student: any) => {
      const currentMonthKey = `${student.id}_${currentYear}_${currentMonth}`;
      const monthPayments = paymentsByMonth.get(currentMonthKey) || { paid: 0, discount: 0 };
      currentMonthPaidForBalance += monthPayments.paid;
      currentMonthDiscountForBalance += monthPayments.discount;
    });
    
    nextMonths.balance = currentMonthTotalPayable - currentMonthPaidForBalance - currentMonthDiscountForBalance;

    // Add balance to totalPayable for each period
    previousArrears.totalPayable += previousArrears.balance;
    currentMonthData.totalPayable += currentMonthData.balance;
    nextMonths.totalPayable += nextMonths.balance;

    // Recalculate remaining after balance is added to totalPayable
    // Remaining = Total Payable - Paid - Discount
    previousArrears.remaining = previousArrears.totalPayable - previousArrears.paid - previousArrears.discount;
    currentMonthData.remaining = currentMonthData.totalPayable - currentMonthData.paid - currentMonthData.discount;
    nextMonths.remaining = nextMonths.totalPayable - nextMonths.paid - nextMonths.discount;

    const total = {
      oldStudents: previousArrears.oldStudents + currentMonthData.oldStudents + nextMonths.oldStudents,
      newAdmissions: previousArrears.newAdmissions + currentMonthData.newAdmissions + nextMonths.newAdmissions,
      totalPayable: previousArrears.totalPayable + currentMonthData.totalPayable + nextMonths.totalPayable,
      paid: previousArrears.paid + currentMonthData.paid + nextMonths.paid,
      discount: previousArrears.discount + currentMonthData.discount + nextMonths.discount,
      droppedOut: previousArrears.droppedOut + currentMonthData.droppedOut + nextMonths.droppedOut,
      remaining: previousArrears.remaining + currentMonthData.remaining + nextMonths.remaining,
      balance: previousArrears.balance + currentMonthData.balance + nextMonths.balance
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
  setDefaultersData: (data: Array<{
    studentId: number;
    studentName: string;
    fatherName: string | null;
    rollNumber: string | null;
    className: string;
    sectionName: string;
    outstandingAmount: number;
    challanCount: number;
    arrearCount: number;
    totalChallans: number;
    totalArrears: number;
    totalPaid: number;
    totalDiscount: number;
  }>) => void,
  setDefaultersLoading: (loading: boolean) => void
): Promise<void> => {
  if (!schoolId) return;

  setDefaultersLoading(true);
  try {
    if (USE_DUMMY_DATA) {
      await new Promise(resolve => setTimeout(resolve, 100));
      // Generate dummy student defaulter data
      const dummyData = Array.from({ length: 10 }, (_, i) => ({
        studentId: i + 1,
        studentName: `Student ${i + 1}`,
        fatherName: `Father ${i + 1}`,
        rollNumber: String(i + 1),
        className: `Class ${(i % 5) + 1}`,
        sectionName: String.fromCharCode(65 + (i % 3)),
        outstandingAmount: Math.floor(Math.random() * 5000) + 1000,
        challanCount: Math.floor(Math.random() * 5) + 1,
        arrearCount: Math.floor(Math.random() * 2),
        totalChallans: Math.floor(Math.random() * 10000) + 5000,
        totalArrears: Math.floor(Math.random() * 2000),
        totalPaid: Math.floor(Math.random() * 5000),
        totalDiscount: Math.floor(Math.random() * 500)
      }));
      setDefaultersData(dummyData);
      setDefaultersLoading(false);
      return;
    }

    const dashboardDateObj = new Date(dashboardDate);
    dashboardDateObj.setHours(23, 59, 59, 999);
    
    // Get active session
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('id')
      .eq('is_active', true)
      .eq('school_id', schoolId)
      .maybeSingle();

    if (!sessionData) {
      setDefaultersLoading(false);
      return;
    }

    // Fetch all active students in the session
    const students = await fetchAllRows(async (from, to) => {
      const result = await supabase
        .from('students')
        .select('id, name, father_name, roll_number, class_id, section_id')
        .eq('school_id', schoolId)
        .eq('session_id', sessionData.id)
        .eq('status', 'active')
        .range(from, to);
      return { data: result.data, error: result.error };
    });

    // Fetch classes and sections
    const classes = await fetchAllRows(async (from, to) => {
      const result = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', schoolId)
        .range(from, to);
      return { data: result.data, error: result.error };
    });

    const sections = await fetchAllRows(async (from, to) => {
      const result = await supabase
        .from('sections')
        .select('id, name')
        .eq('school_id', schoolId)
        .range(from, to);
      return { data: result.data, error: result.error };
    });

    // Fetch all challans for these students
    const studentIds = students.map((s: any) => s.id);
    let allChallans: any[] = [];
    if (studentIds.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < studentIds.length; i += chunkSize) {
        const chunk = studentIds.slice(i, i + chunkSize);
        const chunkChallans = await fetchAllRows(async (from, to) => {
          const result = await supabase
            .from('fee_challans')
            .select('id, student_id, total_amount')
            .eq('school_id', schoolId)
            .eq('session_id', sessionData.id)
            .in('student_id', chunk)
            .range(from, to);
          return { data: result.data, error: result.error };
        });
        allChallans = allChallans.concat(chunkChallans);
      }
    }

    // Fetch all arrears for these students
    let allArrears: any[] = [];
    if (studentIds.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < studentIds.length; i += chunkSize) {
        const chunk = studentIds.slice(i, i + chunkSize);
        const chunkArrears = await fetchAllRows(async (from, to) => {
          const result = await supabase
            .from('fee_arrears')
            .select('id, student_id, amount')
            .eq('school_id', schoolId)
            .eq('session_id', sessionData.id)
            .in('status', ['unpaid', 'partial'])
            .in('student_id', chunk)
            .range(from, to);
          return { data: result.data, error: result.error };
        });
        allArrears = allArrears.concat(chunkArrears);
      }
    }

    // Fetch all payments up to dashboardDate (using created_at)
    const allPayments = await fetchAllRows(async (from, to) => {
      const result = await supabase
        .from('fee_payments')
        .select(`
          id,
          student_id,
          amount,
          discount_amount,
          fee_payment_items (
            id,
            fee_challan_item_id,
            fee_arrear_id,
            paid_amount
          )
        `)
        .eq('school_id', schoolId)
        .lte('created_at', dashboardDateObj.toISOString())
        .range(from, to);
      return { data: result.data, error: result.error };
    });

    // Fetch challan items to map payment items to challans
    const challanIds = allChallans.map((ch: any) => ch.id);
    let challanItems: any[] = [];
    if (challanIds.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < challanIds.length; i += chunkSize) {
        const chunk = challanIds.slice(i, i + chunkSize);
        const chunkItems = await fetchAllRows(async (from, to) => {
          const result = await supabase
            .from('fee_challans_items')
            .select('id, challan_id')
            .eq('school_id', schoolId)
            .in('challan_id', chunk)
            .range(from, to);
          return { data: result.data, error: result.error };
        });
        challanItems = challanItems.concat(chunkItems);
      }
    }
    const challanItemToChallanMap = new Map<number, number>();
    challanItems.forEach((item: any) => {
      challanItemToChallanMap.set(item.id, item.challan_id);
    });

    // Build maps for payments by challan/arrear
    const paymentsByChallan = new Map<number, number>();
    const paymentsByArrear = new Map<number, number>();

    allPayments.forEach((payment: any) => {
      if (payment.fee_payment_items) {
        payment.fee_payment_items.forEach((item: any) => {
          const paidAmount = Number(item.paid_amount || item.amount || 0);
          
          if (item.fee_challan_item_id) {
            const challanId = challanItemToChallanMap.get(item.fee_challan_item_id);
            if (challanId) {
              paymentsByChallan.set(challanId, (paymentsByChallan.get(challanId) || 0) + paidAmount);
            }
          } else if (item.fee_arrear_id) {
            paymentsByArrear.set(item.fee_arrear_id, (paymentsByArrear.get(item.fee_arrear_id) || 0) + paidAmount);
          }
        });
      }
    });

    // Calculate defaulter data for each student
    const defaultersMap = new Map<number, {
      studentId: number;
      studentName: string;
      fatherName: string | null;
      rollNumber: string | null;
      className: string;
      sectionName: string;
      outstandingAmount: number;
      challanCount: number;
      arrearCount: number;
      totalChallans: number;
      totalArrears: number;
      totalPaid: number;
      totalDiscount: number;
    }>();

    students.forEach((student: any) => {
      const studentChallans = allChallans.filter((ch: any) => ch.student_id === student.id);
      const studentArrears = allArrears.filter((ar: any) => ar.student_id === student.id);
      const studentPayments = allPayments.filter((pay: any) => pay.student_id === student.id);

      // Calculate total challan amount
      const totalChallans = studentChallans.reduce((sum: number, ch: any) => sum + Number(ch.total_amount || 0), 0);
      
      // Calculate total arrear amount
      const totalArrears = studentArrears.reduce((sum: number, ar: any) => sum + Number(ar.amount || 0), 0);

      // Calculate paid amount from challans
      let challanPaid = 0;
      let challanCount = 0;
      studentChallans.forEach((challan: any) => {
        const paid = paymentsByChallan.get(challan.id) || 0;
        const remaining = Number(challan.total_amount || 0) - paid;
        if (remaining > 0) {
          challanCount++;
        }
        challanPaid += paid;
      });

      // Calculate paid amount from arrears
      let arrearPaid = 0;
      let arrearCount = 0;
      studentArrears.forEach((arrear: any) => {
        const paid = paymentsByArrear.get(arrear.id) || 0;
        const remaining = Number(arrear.amount || 0) - paid;
        if (remaining > 0) {
          arrearCount++;
        }
        arrearPaid += paid;
      });

      // Calculate total paid and discount
      const totalPaid = studentPayments.reduce((sum: number, pay: any) => sum + Number(pay.amount || 0), 0);
      const totalDiscount = studentPayments.reduce((sum: number, pay: any) => sum + Number(pay.discount_amount || 0), 0);

      // Calculate outstanding amount
      const outstandingAmount = totalChallans + totalArrears - totalPaid - totalDiscount;

      // Only include students with outstanding amount > 0
      if (outstandingAmount > 0) {
        const className = classes.find((c: any) => c.id === student.class_id)?.name || '-';
        const sectionName = sections.find((s: any) => s.id === student.section_id)?.name || '';

        defaultersMap.set(student.id, {
          studentId: student.id,
          studentName: student.name,
          fatherName: student.father_name || null,
          rollNumber: student.roll_number || null,
          className,
          sectionName,
          outstandingAmount,
          challanCount,
          arrearCount,
          totalChallans,
          totalArrears,
          totalPaid,
          totalDiscount
        });
      }
    });

    // Convert to array and sort by outstanding amount (highest first)
    const defaultersArray = Array.from(defaultersMap.values())
      .sort((a, b) => b.outstandingAmount - a.outstandingAmount)
      .slice(0, 50); // Limit to top 50 defaulters

    setDefaultersData(defaultersArray);
  } catch (error) {
    console.error('Error fetching defaulters data:', error);
  } finally {
    setDefaultersLoading(false);
  }
};

