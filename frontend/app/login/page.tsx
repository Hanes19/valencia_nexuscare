"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = 'http://localhost:4000';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'nurse', department: 'Triage' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = mode === 'login'
      ? { email: form.email, password: form.password }
      : form;

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      // Save token and user to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect based on role
      if (data.user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch {
      setError('Cannot connect to server');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>NexusCare</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Hospital Flow Management System</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border p-8 shadow-lg"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>

          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: 'var(--background)' }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition capitalize ${
                  mode === m ? 'bg-blue-600 text-white shadow-sm' : 'hover:opacity-70'
                }`}
                style={{ color: mode === m ? undefined : 'var(--muted)' }}>
                {m}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Full Name</label>
                <input
                  className="w-full mt-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  placeholder="Your full name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Email</label>
              <input
                type="email"
                className="w-full mt-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                placeholder="email@hospital.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Password</label>
              <input
                type="password"
                className="w-full mt-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Role</label>
                  <select
                    className="w-full mt-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="nurse">Nurse</option>
                    <option value="doctor">Doctor</option>
                    <option value="lab_tech">Lab Tech</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Department</label>
                  <select
                    className="w-full mt-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                  >
                    <option>Triage</option>
                    <option>Diagnostics</option>
                    <option>Treatment</option>
                    <option>Discharge</option>
                  </select>
                </div>
              </>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition mt-2"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs mt-6" style={{ color: 'var(--muted)' }}>
            NexusCare · Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
}