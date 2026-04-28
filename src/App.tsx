import React, { useState, useEffect } from 'react';
import type { Employee, LeaveRequest } from './types';
import { calculateBalances, calculateLeaveDuration } from './utils/leaveCalculations';
import { HOLIDAYS_2026 } from './constants/holidays';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

const MOCK_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Dixit Sharma', email: 'dixit@purferme.com', joining_date: '2024-06-15', role: 'Product Lead' },
  { id: '2', name: 'Sarah Chen', email: 'sarah@purferme.com', joining_date: '2025-01-10', role: 'UI Designer' },
];

const MOCK_REQUESTS: LeaveRequest[] = [
  { id: 'r1', employee_id: '1', type: 'Annual', start_date: '2026-04-10', end_date: '2026-04-12', status: 'Approved', reason: 'Family trip' },
  { id: 'r2', employee_id: '2', type: 'Sick', start_date: '2026-03-05', end_date: '2026-03-05', status: 'Approved', reason: 'Flu' },
];

const App: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setEmployees(MOCK_EMPLOYEES);
      setSelectedEmployeeId(MOCK_EMPLOYEES[0].id);
      setRequests(MOCK_REQUESTS);
      setLoading(false);
      console.info('Using mock data. Configure Supabase in .env for real-time storage.');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*');
      
      if (empError) throw empError;
      setEmployees(empData || []);
      if (empData && empData.length > 0) setSelectedEmployeeId(empData[0].id);

      const { data: reqData, error: reqError } = await supabase
        .from('leave_requests')
        .select('*');
      
      if (reqError) throw reqError;
      setRequests(reqData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const balances = selectedEmployee ? calculateBalances(selectedEmployee, requests) : [];

  const addRequest = async (req: Omit<LeaveRequest, 'id' | 'status' | 'applied_at'>) => {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .insert([{
          ...req,
          status: 'Approved', // Auto-approving for this demo
        }])
        .select();

      if (error) throw error;
      setRequests([...requests, data[0]]);
      setShowForm(false);
    } catch (err) {
      console.error('Error adding request:', err);
      alert('Failed to submit request. Check console for details.');
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>Loading Portal...</h2>
          <div style={{ height: '4px', width: '200px', background: 'var(--surface-border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '50%', background: 'var(--primary)', animation: 'progress 1s infinite alternate' }} />
          </div>
        </div>
        <style>{`
          @keyframes progress {
            from { transform: translateX(-100%); }
            to { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', background: 'linear-gradient(90deg, #fff, var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Leave Tracker</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>PurFerme Project • Team Portal</p>
            <select 
              value={selectedEmployeeId} 
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.8rem', background: 'var(--surface)' }}
            >
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
            </select>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Request Leave</button>
      </header>

      {selectedEmployee && (
        <main>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            {balances.map(b => (
              <div key={b.type} className="glass-card animate-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem' }}>{b.type}</h3>
                  <span className={`badge badge-${b.type.split(' ')[0].toLowerCase()}`}>{b.type === 'Annual' ? 'Paid' : 'Standard'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: '800' }}>{b.remaining}</span>
                  <span style={{ color: 'var(--text-muted)' }}>/ {b.entitlement} days</span>
                </div>
                <div style={{ height: '8px', background: 'hsla(222, 47%, 5%, 0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${Math.max(0, Math.min(100, (b.taken / b.entitlement) * 100))}%`, 
                    background: 'var(--primary)',
                    transition: 'var(--transition)'
                  }} />
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {b.taken} taken • {b.pending} pending
                </div>
              </div>
            ))}
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
            <section className="glass-card">
              <h2 style={{ marginBottom: '1.5rem' }}>Recent Requests</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--surface-border)' }}>
                      <th style={{ padding: '1rem 0', color: 'var(--text-muted)' }}>Type</th>
                      <th style={{ padding: '1rem 0', color: 'var(--text-muted)' }}>Dates</th>
                      <th style={{ padding: '1rem 0', color: 'var(--text-muted)' }}>Days</th>
                      <th style={{ padding: '1rem 0', color: 'var(--text-muted)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.filter(r => r.employee_id === selectedEmployeeId).map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid hsla(222, 47%, 25%, 0.2)' }}>
                        <td style={{ padding: '1rem 0', fontWeight: '600' }}>{r.type}</td>
                        <td style={{ padding: '1rem 0' }}>{new Date(r.start_date).toLocaleDateString()} - {new Date(r.end_date).toLocaleDateString()}</td>
                        <td style={{ padding: '1rem 0' }}>{calculateLeaveDuration(r.start_date, r.end_date)}</td>
                        <td style={{ padding: '1rem 0' }}>
                          <span style={{ 
                            color: r.status === 'Approved' ? 'var(--success)' : 'var(--warning)',
                            fontWeight: '700'
                          }}>{r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="glass-card">
              <h2 style={{ marginBottom: '1.5rem' }}>Upcoming Holidays</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {HOLIDAYS_2026.filter(h => new Date(h.date) >= new Date()).slice(0, 5).map(h => (
                  <div key={h.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'hsla(222, 47%, 5%, 0.3)', padding: '1rem', borderRadius: '12px', border: '1px solid hsla(222, 47%, 25%, 0.3)' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem' }}>{h.name}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{h.day}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary)' }}>{new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card animate-in" style={{ maxWidth: '500px', width: '100%', padding: '2.5rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>New Leave Request</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              await addRequest({
                employee_id: selectedEmployeeId,
                type: formData.get('type') as any,
                start_date: formData.get('start_date') as string,
                end_date: formData.get('end_date') as string,
                reason: formData.get('reason') as string,
              });
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Leave Type</label>
                <select name="type" required>
                  <option value="Annual">Annual / Privilege Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Casual">Casual Leave</option>
                  <option value="Menstrual">Menstrual Leave</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Start Date</label>
                  <input type="date" name="start_date" required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>End Date</label>
                  <input type="date" name="end_date" required />
                </div>
              </div>
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Reason (Optional)</label>
                <textarea name="reason" rows={3}></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn-ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
