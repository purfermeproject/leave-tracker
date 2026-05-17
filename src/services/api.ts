import type { Employee, LeaveRequest } from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('leave_tracker_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data as T;
}

export const api = {
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ user: Employee; token: string }>('/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
  },

  employees: {
    list: () =>
      request<Employee[]>('/employees'),

    create: (emp: Omit<Employee, 'id'>) =>
      request<{ user: Employee }>('/employees', {
        method: 'POST',
        body: JSON.stringify(emp),
      }),
      
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      request<{ success: true; message: string }>('/employees/password', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  leaveRequests: {
    list: () =>
      request<LeaveRequest[]>('/leave-requests'),

    create: (req: Omit<LeaveRequest, 'id' | 'applied_at'>) =>
      request<LeaveRequest>('/leave-requests', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    
    updateStatus: (id: string, status: 'Approved' | 'Rejected') =>
      request<LeaveRequest>(`/leave-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },
};
