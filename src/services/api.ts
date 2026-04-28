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
  },
};
