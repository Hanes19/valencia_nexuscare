"use client";
import React, { useState, useEffect } from 'react';
import { Users, Building2, ScrollText, BarChart3, Plus, Trash2, Edit2, X, Check, Moon, Sun, ArrowLeft, BedDouble } from 'lucide-react';

type Staff = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: string;
  createdAt: string;
};

type Department = {
  id: string;
  name: string;
  capacity: number;
  status: string;
};

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
};

type Room = {
  id: string;
  name: string;
  type: string;
  status: string;
  department: string;
  currentPatientId: string | null;
};

type Analytics = {
  totalPatients: number;
  totalStaff: number;
  totalDepartments: number;
  patientsByPriority: { red: number; yellow: number; green: number };
  patientsByStatus: {
    waiting: number;
    inTriage: number;
    inDiagnostics: number;
    inTreatment: number;
    inDischarge: number;
  };
  recentActivity: AuditLog[];
};

const API = 'http://localhost:4000';

const tabs = [
  { id: 'analytics',   label: 'Overview',    icon: BarChart3 },
  { id: 'staff',       label: 'Staff',        icon: Users },
  { id: 'departments', label: 'Departments',  icon: Building2 },
  { id: 'rooms',       label: 'Rooms',        icon: BedDouble },
  { id: 'logs',        label: 'Audit Log',    icon: ScrollText },
];

const roleColors: Record<string, string> = {
  doctor:   'bg-blue-100 text-blue-700',
  nurse:    'bg-purple-100 text-purple-700',
  lab_tech: 'bg-orange-100 text-orange-700',
  admin:    'bg-slate-100 text-slate-700',
};

const actionColors: Record<string, string> = {
  CREATED: 'bg-emerald-100 text-emerald-700',
  UPDATED: 'bg-blue-100 text-blue-700',
  DELETED: 'bg-red-100 text-red-700',
};

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [staff, setStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', role: 'nurse', department: 'Triage' });
  const [deptForm, setDeptForm] = useState({ name: '', capacity: 5 });
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomForm, setRoomForm] = useState({ name: '', type: 'triage', department: 'Triage' });
  const [dark, setDark] = useState(false);


useEffect(() => {
  const token = localStorage.getItem('token');
  const raw = localStorage.getItem('user');
  if (!token || !raw) {
    window.location.href = '/login';
    return;
  }
  try {
    const user = JSON.parse(raw);
    if (user.role !== 'admin') {
      window.location.href = '/';
    }
  } catch {
    window.location.href = '/login';
  }
}, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const fetchAll = () => {
    fetch(`${API}/api/staff`)
      .then(r => { if (!r.ok) throw new Error(`staff: ${r.status}`); return r.json(); })
      .then(setStaff).catch(console.error);
    fetch(`${API}/api/departments`)
      .then(r => { if (!r.ok) throw new Error(`departments: ${r.status}`); return r.json(); })
      .then(setDepartments).catch(console.error);
    fetch(`${API}/api/logs`)
      .then(r => { if (!r.ok) throw new Error(`logs: ${r.status}`); return r.json(); })
      .then(setLogs).catch(console.error);
    fetch(`${API}/api/analytics`)
      .then(r => { if (!r.ok) throw new Error(`analytics: ${r.status}`); return r.json(); })
      .then(setAnalytics).catch(console.error);
    fetch(`${API}/api/rooms`)
      .then(r => { if (!r.ok) throw new Error(`rooms: ${r.status}`); return r.json(); })
      .then(setRooms).catch(console.error);
  };
    useEffect(() => { fetchAll(); }, []);

  const addStaff = async () => {
    if (!staffForm.name || !staffForm.email) return;
    await fetch(`${API}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(staffForm),
    });
    setStaffForm({ name: '', email: '', role: 'nurse', department: 'Triage' });
    setShowStaffForm(false);
    fetchAll();
  };

  const deleteStaff = async (id: string) => {
    await fetch(`${API}/api/staff/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  const updateStaff = async () => {
    if (!editingStaff) return;
    await fetch(`${API}/api/staff/${editingStaff.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingStaff),
    });
    setEditingStaff(null);
    fetchAll();
  };

  const addDept = async () => {
    if (!deptForm.name) return;
    await fetch(`${API}/api/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deptForm),
    });
    setDeptForm({ name: '', capacity: 5 });
    setShowDeptForm(false);
    fetchAll();
  };

  const deleteDept = async (id: string) => {
    await fetch(`${API}/api/departments/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  const addRoom = async () => {
  if (!roomForm.name) return;
  await fetch(`${API}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(roomForm),
  });
  setRoomForm({ name: '', type: 'triage', department: 'Triage' });
  setShowRoomForm(false);
  fetchAll();
};

const updateRoomStatus = async (id: string, status: string) => {
  await fetch(`${API}/api/rooms/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  fetchAll();
};

const deleteRoom = async (id: string) => {
  await fetch(`${API}/api/rooms/${id}`, { method: 'DELETE' });
  fetchAll();
};



  return (
    <div className="min-h-screen transition-colors" style={{ background: 'var(--background)' }}>

      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between"
  style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
  <div className="flex items-center gap-4">
    <a href="/" className="flex items-center gap-1.5 text-sm hover:opacity-70 transition"
      style={{ color: 'var(--muted)' }}>
      <ArrowLeft size={16} /> Dashboard
    </a>
    <div className="w-px h-5" style={{ background: 'var(--border)' }} />
    <div>
      <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>NexusCare Admin</h1>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>System Management Panel</p>
    </div>
  </div>
  <div className="flex items-center gap-2">
    <button onClick={() => setDark(!dark)}
      className="p-2 rounded-lg border hover:opacity-80 transition"
      style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
    <button
      onClick={() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }}
      className="text-xs px-3 py-1.5 rounded-lg border hover:opacity-80 transition"
      style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
      Logout
    </button>
  </div>
</header>
      

      {/* Tabs */}
      <div className="border-b px-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent hover:opacity-80'
                }`}
                style={{ color: activeTab === tab.id ? undefined : 'var(--muted)' }}>
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6">

        {/* ── ANALYTICS TAB ── */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6 animate-fade-in">

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Total Patients',   value: analytics.totalPatients,    color: 'bg-blue-500',   sub: 'currently in system' },
                { label: 'Total Staff',       value: analytics.totalStaff,       color: 'bg-purple-500', sub: 'registered members' },
                { label: 'Departments',       value: analytics.totalDepartments, color: 'bg-orange-500', sub: 'active departments' },
              ].map(stat => (
                <div key={stat.label} className="rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow"
                  style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                  <div className={`w-10 h-10 ${stat.color} rounded-xl mb-4 flex items-center justify-center`}>
                    <span className="text-white text-lg font-bold">{stat.value}</span>
                  </div>
                  <p className="text-3xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>{stat.value}</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{stat.label}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Priority + Status side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Priority */}
              <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <h2 className="font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Patients by Priority</h2>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Code Red', value: analytics.patientsByPriority.red,    color: 'bg-red-500' },
                    { label: 'Urgent',   value: analytics.patientsByPriority.yellow, color: 'bg-amber-400' },
                    { label: 'Stable',   value: analytics.patientsByPriority.green,  color: 'bg-emerald-500' },
                  ].map(p => (
                    <div key={p.label} className="text-center">
                      <div className={`${p.color} text-white rounded-xl py-5 text-3xl font-bold mb-2`}>{p.value}</div>
                      <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{p.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <h2 className="font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Patients by Status</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Waiting',     value: analytics.patientsByStatus.waiting },
                    { label: 'Triage',      value: analytics.patientsByStatus.inTriage },
                    { label: 'Diagnostics', value: analytics.patientsByStatus.inDiagnostics },
                    { label: 'Treatment',   value: analytics.patientsByStatus.inTreatment },
                    { label: 'Discharge',   value: analytics.patientsByStatus.inDischarge },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-3">
                      <span className="text-xs w-24" style={{ color: 'var(--muted)' }}>{s.label}</span>
                      <div className="flex-1 rounded-full h-2" style={{ background: 'var(--border)' }}>
                        <div className="bg-blue-500 h-2 rounded-full transition-all duration-700"
                          style={{ width: analytics.totalPatients ? `${(s.value / analytics.totalPatients) * 100}%` : '0%' }} />
                      </div>
                      <span className="text-sm font-bold w-5 text-right" style={{ color: 'var(--foreground)' }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-xl border p-6 shadow-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <h2 className="font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Recent Activity</h2>
              <div className="space-y-2">
                {analytics.recentActivity.slice(0, 10).map(log => (
                  <div key={log.id} className="flex items-center gap-3 text-sm py-1.5 border-b last:border-0"
                    style={{ borderColor: 'var(--border)' }}>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${actionColors[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                      {log.action}
                    </span>
                    <span style={{ color: 'var(--foreground)' }}>{log.details}</span>
                    <span className="text-xs ml-auto" style={{ color: 'var(--muted)' }}>
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                {analytics.recentActivity.length === 0 && (
                  <p className="text-sm italic text-center py-4" style={{ color: 'var(--muted)' }}>No activity yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STAFF TAB ── */}
        {activeTab === 'staff' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                Staff Members <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>({staff.length})</span>
              </h2>
              <button onClick={() => setShowStaffForm(!showStaffForm)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
                <Plus size={15} /> Add Staff
              </button>
            </div>

            {showStaffForm && (
              <div className="rounded-xl border p-4 shadow-sm animate-slide-in grid grid-cols-2 md:grid-cols-4 gap-4"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                {[
                  { label: 'Name', key: 'name', type: 'text', placeholder: 'Full name' },
                  { label: 'Email', key: 'email', type: 'email', placeholder: 'email@hospital.com' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder}
                      className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                      value={staffForm[f.key as keyof typeof staffForm]}
                      onChange={e => setStaffForm({ ...staffForm, [f.key]: e.target.value })} />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Role</label>
                  <select className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}>
                    <option value="nurse">Nurse</option>
                    <option value="doctor">Doctor</option>
                    <option value="lab_tech">Lab Tech</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Department</label>
                  <select className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    value={staffForm.department} onChange={e => setStaffForm({ ...staffForm, department: e.target.value })}>
                    <option>Triage</option>
                    <option>Diagnostics</option>
                    <option>Treatment</option>
                    <option>Discharge</option>
                  </select>
                </div>
                <div className="col-span-2 md:col-span-4 flex gap-2">
                  <button onClick={addStaff} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition">Add</button>
                  <button onClick={() => setShowStaffForm(false)} className="text-sm px-4 py-2 rounded-lg hover:opacity-70 transition" style={{ color: 'var(--muted)' }}>Cancel</button>
                </div>
              </div>
            )}

            <div className="rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-sm">
                <thead className="border-b" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                  <tr>
                    {['Name', 'Email', 'Role', 'Department', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{ color: 'var(--muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ background: 'var(--card)' }}>
                  {staff.map(s => (
                    <tr key={s.id} className="border-b hover:opacity-90 transition" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--foreground)' }}>
                        {editingStaff?.id === s.id
                          ? <input className="border rounded px-2 py-1 text-sm w-full"
                              style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                              value={editingStaff.name}
                              onChange={e => setEditingStaff({ ...editingStaff, name: e.target.value })} />
                          : s.name}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{s.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${roleColors[s.role] ?? 'bg-gray-100 text-gray-600'}`}>
                          {s.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--foreground)' }}>{s.department}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {editingStaff?.id === s.id ? (
                            <>
                              <button onClick={updateStaff} className="text-emerald-600 hover:text-emerald-800 transition"><Check size={15} /></button>
                              <button onClick={() => setEditingStaff(null)} className="hover:opacity-70 transition" style={{ color: 'var(--muted)' }}><X size={15} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setEditingStaff(s)} className="text-blue-500 hover:text-blue-700 transition"><Edit2 size={15} /></button>
                              <button onClick={() => deleteStaff(s.id)} className="text-red-400 hover:text-red-600 transition"><Trash2 size={15} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {staff.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-sm italic" style={{ color: 'var(--muted)' }}>No staff added yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── DEPARTMENTS TAB ── */}
        {activeTab === 'departments' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                Departments <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>({departments.length})</span>
              </h2>
              <button onClick={() => setShowDeptForm(!showDeptForm)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
                <Plus size={15} /> Add Department
              </button>
            </div>

            {showDeptForm && (
              <div className="rounded-xl border p-4 shadow-sm animate-slide-in flex gap-4 items-end flex-wrap"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="flex-1 min-w-40">
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Department Name</label>
                  <input className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    placeholder="e.g. Radiology"
                    value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Capacity</label>
                  <input type="number" min={1}
                    className="w-24 mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    value={deptForm.capacity} onChange={e => setDeptForm({ ...deptForm, capacity: parseInt(e.target.value) })} />
                </div>
                <button onClick={addDept} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition">Add</button>
                <button onClick={() => setShowDeptForm(false)} className="text-sm px-3 py-2 rounded-lg hover:opacity-70 transition" style={{ color: 'var(--muted)' }}>Cancel</button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map(dept => (
                <div key={dept.id} className="rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow animate-slide-in"
                  style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold" style={{ color: 'var(--foreground)' }}>{dept.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dept.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {dept.status}
                      </span>
                    </div>
                    <button onClick={() => deleteDept(dept.id)} className="text-red-400 hover:text-red-600 transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                    <Building2 size={13} />
                    <span>Capacity: <strong style={{ color: 'var(--foreground)' }}>{dept.capacity}</strong> patients</span>
                  </div>
                </div>
              ))}
              {departments.length === 0 && (
                <div className="col-span-3 text-center py-10 text-sm italic" style={{ color: 'var(--muted)' }}>No departments added yet</div>
              )}
            </div>
          </div>
        )}

        {/* ── ROOMS TAB ── */}
{activeTab === 'rooms' && (
  <div className="space-y-4 animate-fade-in">
    <div className="flex justify-between items-center">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
        Flow Rooms <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>({rooms.length})</span>
      </h2>
      <button onClick={() => setShowRoomForm(!showRoomForm)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
        <Plus size={15} /> Add Room
      </button>
    </div>

    {showRoomForm && (
      <div className="rounded-xl border p-4 shadow-sm animate-slide-in flex gap-4 items-end flex-wrap"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex-1 min-w-40">
          <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Room Name</label>
          <input className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            placeholder="e.g. Triage Room 1"
            value={roomForm.name} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Type</label>
          <select className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            value={roomForm.type} onChange={e => setRoomForm({ ...roomForm, type: e.target.value })}>
            <option value="triage">Triage Hub</option>
            <option value="diagnostic">Diagnostic Node</option>
            <option value="treatment">Treatment Zone</option>
            <option value="discharge">Discharge Lounge</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Department</label>
          <select className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            value={roomForm.department} onChange={e => setRoomForm({ ...roomForm, department: e.target.value })}>
            <option>Triage</option>
            <option>Diagnostics</option>
            <option>Treatment</option>
            <option>Discharge</option>
          </select>
        </div>
        <button onClick={addRoom} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition">Add</button>
        <button onClick={() => setShowRoomForm(false)} className="text-sm px-3 py-2 rounded-lg hover:opacity-70 transition" style={{ color: 'var(--muted)' }}>Cancel</button>
      </div>
    )}

    {/* Room status summary */}
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Open',     color: 'bg-emerald-500', count: rooms.filter(r => r.status === 'open').length },
        { label: 'Occupied', color: 'bg-red-500',     count: rooms.filter(r => r.status === 'occupied').length },
        { label: 'Cleaning', color: 'bg-amber-400',   count: rooms.filter(r => r.status === 'cleaning').length },
      ].map(s => (
        <div key={s.label} className="rounded-xl border p-4 shadow-sm text-center"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className={`${s.color} text-white text-2xl font-bold rounded-lg py-3 mb-2`}>{s.count}</div>
          <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>{s.label}</p>
        </div>
      ))}
    </div>

    {/* Rooms grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {rooms.map(room => {
        const statusConfig = {
          open:     { color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
          occupied: { color: 'bg-red-100 text-red-700',         dot: 'bg-red-500' },
          cleaning: { color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
        };
        const s = statusConfig[room.status as keyof typeof statusConfig] ?? statusConfig.open;
        return (
          <div key={room.id} className="rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow animate-slide-in"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--foreground)' }}>{room.name}</h3>
                <p className="text-xs capitalize" style={{ color: 'var(--muted)' }}>{room.type.replace('_', ' ')} · {room.department}</p>
              </div>
              <button onClick={() => deleteRoom(room.id)} className="text-red-400 hover:text-red-600 transition">
                <Trash2 size={15} />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {room.status}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['open', 'occupied', 'cleaning'].map(st => (
                <button key={st} onClick={() => updateRoomStatus(room.id, st)}
                  disabled={room.status === st}
                  className={`text-xs px-2 py-1 rounded-lg border transition capitalize font-medium
                    ${room.status === st
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:opacity-80'
                    }`}
                  style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: 'var(--background)' }}>
                  {st}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {rooms.length === 0 && (
        <div className="col-span-3 text-center py-10 text-sm italic" style={{ color: 'var(--muted)' }}>
          No rooms added yet
        </div>
      )}
    </div>
  </div>
)}

        {/* ── AUDIT LOG TAB ── */}
        {activeTab === 'logs' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Audit Log <span className="text-sm font-normal" style={{ color: 'var(--muted)' }}>({logs.length} entries)</span>
            </h2>
            <div className="rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-sm">
                <thead className="border-b" style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
                  <tr>
                    {['Action', 'Entity', 'Details', 'Time'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{ color: 'var(--muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ background: 'var(--card)' }}>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b hover:opacity-90 transition" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded font-bold ${actionColors[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{log.entity}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--foreground)' }}>{log.details}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-sm italic" style={{ color: 'var(--muted)' }}>No logs yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}