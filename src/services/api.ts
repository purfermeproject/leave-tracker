import type { Employee, LeaveRequest } from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data as T;
}

export const api = {
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<Employee>('/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
  },

  employees: {
    list: () =>
      request<Employee[]>('/employees'),

    create: (emp: Omit<Employee, 'id'>) =>
      request<Employee>('/employees', {
        method: 'POST',
        body: JSON.stringify(emp),
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
