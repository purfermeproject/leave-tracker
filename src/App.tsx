import React, { useState, useEffect } from 'react';
import type { Employee, LeaveRequest } from './types';
import { calculateBalances, calculateLeaveDuration } from './utils/leaveCalculations';
import { HOLIDAYS_2026 } from './constants/holidays';
import { api } from './services/api';
import Login from './components/Login';

type View = 'dashboard' | 'team';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
    const saved = localStorage.getItem('leave_tracker_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('dashboard');

  useEffect(() => {
    if (currentUser) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [emps, reqs] = await Promise.all([
        api.employees.list(),
        api.leaveRequests.list(),
      ]);
      setEmployees(emps);
      
      // If Admin, default to first employee or keep selection
      // If Employee, force selection to self
      if (currentUser?.role === 'Admin') {
        if (!selectedEmployeeId && emps.length > 0) {
          setSelectedEmployeeId(emps[0].id);
        }
      } else if (currentUser) {
        setSelectedEmployeeId(currentUser.id);
      }
      
      setRequests(reqs);
    } catch (err: any) {
      setError(err.message || 'Cannot reach the server. Is it running?');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (user: Employee) => {
    setCurrentUser(user);
    localStorage.setItem('leave_tracker_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('leave_tracker_user');
    setEmployees([]);
    setRequests([]);
  };

  const addEmployee = async (emp: Omit<Employee, 'id'>) => {
    try {
      const newEmp = await api.employees.create(emp);
      setEmployees(prev => [...prev, newEmp]);
      setSelectedEmployeeId(newEmp.id);
      setShowMemberForm(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add member.');
    }
  };

  const addRequest = async (req: Omit<LeaveRequest, 'id' | 'applied_at'>) => {
    try {
      const newReq = await api.leaveRequests.create({
        ...req,
        status: 'Pending' // All new requests start as Pending
      });
      setRequests(prev => [...prev, newReq]);
      setShowLeaveForm(false);
    } catch (err: any) {
      alert(err.message || 'Failed to submit leave request.');
    }
  };

  const updateRequestStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      const updated = await api.leaveRequests.updateStatus(id, status);
      setRequests(prev => prev.map(r => r.id === id ? updated : r));
    } catch (err: any) {
      alert(err.message || 'Failed to update request status.');
    }
  };

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const balances = selectedEmployee ? calculateBalances(selectedEmployee, requests) : [];
  const employeeRequests = requests.filter(r => r.employee_id === selectedEmployeeId);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>Loading Portal...</h2>
          <div style={{ height: '4px', width: '200px', background: 'var(--surface-border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '50%', background: 'var(--primary)', animation: 'progress 1s infinite alternate' }} />
          </div>
        </div>
        <style>{`@keyframes progress { from { transform: translateX(-100%); } to { transform: translateX(100%); } }`}</style>
      </div>
    );
  }

  // ── DB / server error ─────────────────────────────────────────────────────
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', background: 'linear-gradient(90deg, #fff, var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Leave Tracker
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <p style={{ color: 'var(--text-muted)' }}>{currentUser.role} Portal • {currentUser.name}</p>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline', padding: 0 }}>Logout</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="tab-group">
            <button className={view === 'dashboard' ? 'tab-active' : 'tab'} onClick={() => setView('dashboard')}>Dashboard</button>
            {currentUser.role === 'Admin' && (
              <button className={view === 'team' ? 'tab-active' : 'tab'} onClick={() => setView('team')}>
                Team ({employees.length})
              </button>
            )}
          </div>
          {currentUser.role === 'Admin' && (
            <button className="btn-secondary" onClick={() => setShowMemberForm(true)}>+ Add Member</button>
          )}
          {view === 'dashboard' && selectedEmployeeId && (
            <button className="btn-primary" onClick={() => setShowLeaveForm(true)}>+ Request Leave</button>
          )}
        </div>
      </header>

      {error && (
        <div style={{ background: 'hsla(0, 100%, 50%, 0.1)', color: 'var(--danger)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid hsla(0, 100%, 50%, 0.2)' }}>
          {error}
          <button onClick={fetchData} style={{ marginLeft: '1rem', background: 'var(--danger)', color: '#fff', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {/* ── Dashboard View ───────────────────────────────────────────────── */}
      {view === 'dashboard' && (
        <>
          {employees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>No team members yet. Add your first member to get started.</p>
              <button className="btn-primary" onClick={() => setShowMemberForm(true)}>+ Add First Member</button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '2rem' }}>
                <label className="field-label">{currentUser.role === 'Admin' ? 'Viewing leave for' : 'My Leave Dashboard'}</label>
                {currentUser.role === 'Admin' ? (
                  <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} style={{ maxWidth: '320px' }}>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name} — {e.role}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{currentUser.name}</div>
                )}
              </div>

              {selectedEmployee && (
                <main>
                  {/* Balance cards */}
                  <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    {balances.map(b => (
                      <div key={b.type} className="glass-card animate-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <h3 style={{ fontSize: '1rem' }}>{b.type} Leave</h3>
                          <span className={`badge badge-${b.type.split(' ')[0].toLowerCase()}`}>{b.type === 'Annual' ? 'Paid' : 'Standard'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1rem' }}>
                          <span style={{ fontSize: '2.5rem', fontWeight: '800' }}>{b.remaining}</span>
                          <span style={{ color: 'var(--text-muted)' }}>/ {b.entitlement} days</span>
                        </div>
                        <div style={{ height: '8px', background: 'hsla(222, 47%, 5%, 0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, (b.taken / b.entitlement) * 100))}%`, background: 'var(--primary)', transition: 'var(--transition)' }} />
                        </div>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          {b.taken} taken • {b.pending} pending
                        </div>
                      </div>
                    ))}
                  </section>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    {/* Leave history */}
                    <section className="glass-card">
                      <h2 style={{ marginBottom: '1.5rem' }}>Leave History — {selectedEmployee.name}</h2>
                      {employeeRequests.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No leave requests yet.</p>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--surface-border)' }}>
                                {['Type', 'Dates', 'Days', 'Status'].map(h => (
                                  <th key={h} style={{ padding: '0.875rem 0', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {employeeRequests.map(r => (
                                <tr key={r.id} style={{ borderBottom: '1px solid hsla(222, 47%, 25%, 0.2)' }}>
                                  <td style={{ padding: '0.875rem 0', fontWeight: '600' }}>{r.type}</td>
                                  <td style={{ padding: '0.875rem 0', fontSize: '0.875rem' }}>
                                    {new Date(r.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    {' – '}
                                    {new Date(r.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </td>
                                  <td style={{ padding: '0.875rem 0' }}>{calculateLeaveDuration(r.start_date, r.end_date)}</td>
                                  <td style={{ padding: '0.875rem 0' }}>
                                    <span style={{ color: r.status === 'Approved' ? 'var(--success)' : r.status === 'Rejected' ? 'var(--danger)' : 'var(--warning)', fontWeight: '700', fontSize: '0.875rem' }}>
                                      {r.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>

                    {/* Upcoming holidays */}
                    <section className="glass-card">
                      <h2 style={{ marginBottom: '1.5rem' }}>Upcoming Holidays</h2>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {HOLIDAYS_2026.filter(h => new Date(h.date) >= new Date()).slice(0, 5).map(h => (
                          <div key={h.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'hsla(222, 47%, 5%, 0.3)', padding: '0.875rem 1rem', borderRadius: '12px', border: '1px solid hsla(222, 47%, 25%, 0.3)' }}>
                            <div>
                              <h4 style={{ fontSize: '0.875rem', marginBottom: '0.2rem' }}>{h.name}</h4>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h.day}</span>
                            </div>
                            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary)' }}>
                              {new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </main>
              )}
            </>
          )}
        </>
      )}

      {/* ── Team View ────────────────────────────────────────────────────── */}
      {view === 'team' && (
        <section>
          {/* Review Queue (Only for Admins) */}
          {currentUser.role === 'Admin' && (
            <div className="glass-card" style={{ marginBottom: '2.5rem', border: '1px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>📋 Leave Review Queue</h2>
                <span className="badge badge-pending">{requests.filter(r => r.status === 'Pending').length} Pending</span>
              </div>
              
              {requests.filter(r => r.status === 'Pending').length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>All clear! No pending leave requests.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {requests.filter(r => r.status === 'Pending').map(r => {
                    const emp = employees.find(e => e.id === r.employee_id);
                    return (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'hsla(222, 47%, 5%, 0.3)', padding: '1rem', borderRadius: '12px', border: '1px solid hsla(222, 47%, 25%, 0.3)' }}>
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                          <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '0.8rem' }}>{emp?.name[0]}</div>
                          <div>
                            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.2rem' }}>{emp?.name} — {r.type} Leave</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {new Date(r.start_date).toLocaleDateString()} to {new Date(r.end_date).toLocaleDateString()} 
                              ({calculateLeaveDuration(r.start_date, r.end_date)} days)
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--success)', borderColor: 'var(--success)' }}
                            onClick={() => r.id && updateRequestStatus(r.id, 'Approved')}
                          >
                            Approve
                          </button>
                          <button 
                            className="btn-ghost" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--danger)' }}
                            onClick={() => r.id && updateRequestStatus(r.id, 'Rejected')}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>Team Members</h2>
            <button className="btn-secondary" onClick={() => setShowMemberForm(true)}>+ Add Member</button>
          </div>

          {employees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>No team members yet.</p>
              <button className="btn-primary" onClick={() => setShowMemberForm(true)}>+ Add First Member</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {employees.map(e => {
                const empReqs = requests.filter(r => r.employee_id === e.id);
                const approved = empReqs.filter(r => r.status === 'Approved').length;
                const pending  = empReqs.filter(r => r.status === 'Pending').length;
                return (
                  <div key={e.id} className="glass-card member-card" onClick={() => { setSelectedEmployeeId(e.id); setView('dashboard'); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="avatar">{e.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
                      <div>
                        <h3 style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>{e.name}</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{e.role}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{e.email}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Joined: <strong style={{ color: 'var(--text)' }}>{new Date(e.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)' }}>
                      <span className="stat-pill stat-approved">{approved} approved</span>
                      {pending > 0 && <span className="stat-pill stat-pending">{pending} pending</span>}
                      {empReqs.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No requests yet</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Add Member Modal ─────────────────────────────────────────────── */}
      {showMemberForm && (
        <div className="modal-backdrop">
          <div className="glass-card animate-in modal-box">
            <h2 style={{ marginBottom: '0.5rem' }}>Add Team Member</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Their leave balance will be calculated from their joining date.</p>
            <form onSubmit={async e => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await addEmployee({
                name:         fd.get('name') as string,
                email:        fd.get('email') as string,
                role:         fd.get('role') as string,
                joining_date: fd.get('joining_date') as string,
                password:     fd.get('password') as string,
              });
            }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="field-label">Full Name</label>
                <input type="text" name="name" placeholder="e.g. Raj Patel" required />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="field-label">Email Address</label>
                <input type="email" name="email" placeholder="e.g. raj@purfermeproject.com" required />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="field-label">Role / Designation</label>
                <input type="text" name="role" placeholder="e.g. Software Engineer" required />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="field-label">Date of Joining</label>
                <input type="date" name="joining_date" required defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div style={{ marginBottom: '2rem' }}>
                <label className="field-label">Password</label>
                <input type="text" name="password" placeholder="e.g. secret123" defaultValue="password123" required />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn-ghost" onClick={() => setShowMemberForm(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Leave Request Modal ──────────────────────────────────────────── */}
      {showLeaveForm && selectedEmployee && (
        <div className="modal-backdrop">
          <div className="glass-card animate-in modal-box">
            <h2 style={{ marginBottom: '0.5rem' }}>New Leave Request</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              For: <strong style={{ color: 'var(--text)' }}>{selectedEmployee.name}</strong>
            </p>
            <form onSubmit={async e => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await addRequest({
                employee_id: selectedEmployeeId,
                type:        fd.get('type') as any,
                start_date:  fd.get('start_date') as string,
                end_date:    fd.get('end_date') as string,
                status:      'Approved',
                reason:      fd.get('reason') as string,
              });
            }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="field-label">Leave Type</label>
                <select name="type" required>
                  <option value="Annual">Annual / Privilege Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Casual">Casual Leave</option>
                  <option value="Menstrual">Menstrual Leave</option>
                  <option value="Maternity">Maternity Leave</option>
                  <option value="Paternity">Paternity Leave</option>
                  <option value="Compassionate">Compassionate Leave</option>
                  <option value="Marriage">Marriage Leave</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label className="field-label">Start Date</label>
                  <input type="date" name="start_date" required />
                </div>
                <div>
                  <label className="field-label">End Date</label>
                  <input type="date" name="end_date" required />
                </div>
              </div>
              <div style={{ marginBottom: '2rem' }}>
                <label className="field-label">Reason (Optional)</label>
                <textarea name="reason" rows={3} placeholder="Brief reason for the leave..." />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn-ghost" onClick={() => setShowLeaveForm(false)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
