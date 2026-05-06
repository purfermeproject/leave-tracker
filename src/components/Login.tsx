import React, { useState } from 'react';
import { api } from '../services/api';
import type { Employee } from '../types';

interface LoginProps {
  onLogin: (user: Employee) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Employee');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isRegistering) {
        const user = await api.employees.create({
          name,
          email,
          role,
          joining_date: joiningDate,
          password,
        });
        onLogin(user);
      } else {
        const user = await api.auth.login({ email, password });
        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message || (isRegistering ? 'Registration failed' : 'Invalid email or password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-card animate-in" style={{ maxWidth: '440px', width: '100%', padding: '3rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', background: 'linear-gradient(90deg, #fff, var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Leave Tracker
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {isRegistering ? 'Create your account to get started' : 'Welcome back! Please login.'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'hsla(0, 100%, 50%, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem', border: '1px solid hsla(0, 100%, 50%, 0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegistering && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="field-label">Full Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="e.g. Raj Patel" 
                required 
              />
            </div>
          )}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="field-label">Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="e.g. raj@purfermeproject.com" 
              required 
            />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="field-label">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••" 
              required 
            />
          </div>
          {isRegistering && (
            <>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="field-label">Role</label>
                <select value={role} onChange={e => setRole(e.target.value)}>
                  <option value="Employee">Employee</option>
                  <option value="Admin">Admin / HR</option>
                </select>
              </div>
              <div style={{ marginBottom: '2rem' }}>
                <label className="field-label">Date of Joining</label>
                <input 
                  type="date" 
                  value={joiningDate} 
                  onChange={e => setJoiningDate(e.target.value)} 
                  required 
                />
              </div>
            </>
          )}
          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', padding: '1rem' }} 
            disabled={loading}
          >
            {loading ? 'Processing...' : (isRegistering ? 'Register' : 'Login')}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(null); }} 
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
          >
            {isRegistering ? 'Already have an account? Login' : 'New here? Create an account'}
          </button>
        </div>

        {!isRegistering && (
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Default Admin: abhinav@purfermeproject.com
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
