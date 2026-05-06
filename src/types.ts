export type LeaveType = 
  | 'Annual' 
  | 'Sick' 
  | 'Menstrual' 
  | 'Casual' 
  | 'Maternity' 
  | 'Paternity' 
  | 'Compassionate' 
  | 'Marriage';

export interface Holiday {
  date: string; // ISO string YYYY-MM-DD
  name: string;
  day: string;
}

export interface LeaveRequest {
  id?: string; // Optional for new rows
  employee_id: string; // uuid
  type: LeaveType;
  start_date: string; // date
  end_date: string; // date
  status: 'Pending' | 'Approved' | 'Rejected';
  reason?: string;
  applied_at?: string; // timestamp
}

export interface Employee {
  id: string; // uuid
  name: string;
  email: string;
  joining_date: string; // date
  role: string;
  password?: string;
}

export interface LeaveBalance {
  type: LeaveType;
  entitlement: number;
  taken: number;
  pending: number;
  remaining: number;
}
