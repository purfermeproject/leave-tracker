import type { LeaveRequest, LeaveType, LeaveBalance, Employee } from '../types';
import { HOLIDAYS_2026 } from '../constants/holidays';

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
};

export const isHoliday = (date: Date): boolean => {
  const dateStr = date.toISOString().split('T')[0];
  return HOLIDAYS_2026.some(h => h.date === dateStr);
};

export const calculateLeaveDuration = (startDate: string, endDate: string): number => {
  let count = 0;
  const current = new Date(startDate);
  const last = new Date(endDate);

  while (current <= last) {
    if (!isWeekend(current) && !isHoliday(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

export const getEntitlements = (employee: Employee): Record<LeaveType, number> => {
  const joinDate = new Date(employee.joining_date);
  const startOfYear = new Date('2026-01-01');
  const endOfYear = new Date('2026-12-31');
  
  // Calculate prorated factor (0 to 1)
  let factor = 1;
  if (joinDate > startOfYear && joinDate <= endOfYear) {
    const totalDays = 365;
    const remainingDays = (endOfYear.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24);
    factor = remainingDays / totalDays;
  } else if (joinDate > endOfYear) {
    factor = 0;
  }

  return {
    Annual: Math.round(16 * factor),
    Sick: Math.round(8 * factor),
    Menstrual: 12,
    Casual: Math.round(9 * factor),
    Maternity: 182,
    Paternity: 5,
    Compassionate: 3,
    Marriage: 3,
  };
};

export const calculateBalances = (
  employee: Employee,
  requests: LeaveRequest[]
): LeaveBalance[] => {
  const entitlements = getEntitlements(employee);
  const approved = requests.filter(r => r.employee_id === employee.id && r.status === 'Approved');
  const pending = requests.filter(r => r.employee_id === employee.id && r.status === 'Pending');

  const leaveTypes: LeaveType[] = [
    'Annual', 'Sick', 'Menstrual', 'Casual', 
    'Maternity', 'Paternity', 'Compassionate', 'Marriage'
  ];

  return leaveTypes.map(type => {
    const taken = approved
      .filter(r => r.type === type)
      .reduce((acc, r) => acc + calculateLeaveDuration(r.start_date, r.end_date), 0);
    
    const pend = pending
      .filter(r => r.type === type)
      .reduce((acc, r) => acc + calculateLeaveDuration(r.start_date, r.end_date), 0);

    const entitlement = entitlements[type];

    return {
      type,
      entitlement,
      taken,
      pending: pend,
      remaining: entitlement - taken,
    };
  });
};
