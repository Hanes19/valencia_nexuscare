"use client";
import React, { useState, useEffect } from 'react';
import { Users, Building2, ScrollText, BarChart3, Plus, Trash2, Edit2, X, Check } from 'lucide-react';

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
  { id: 'logs',        label: 'Audit Log',    icon: ScrollText },
];

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

  const fetchAll = () => {
    fetch(`${API}/api/staff`).then(r => r.json()).then(setStaff);
    fetch(`${API}/api/departments`).then(r => r.json()).then(setDepartments);
    fetch(`${API}/api/logs`).then(r => r.json()).then(setLogs);
    fetch(`${API}/api/analytics`).then(r => r.json()).then(setAnalytics);
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

  const actionColor = (action: string) => {
    if (action === 'CREATED') return 'text-green-600 bg-green-50';
    if (action === 'DELETED') return 'text-red-600 bg-red-50';
    return 'text-blue-600 bg-blue-50';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NexusCare Admin</h1>
          <p className="text-sm text-gray-500">System Management Panel</p>
        </div>
        <a href="/" className="text-sm text-blue-600 hover:underline">← Back to Dashboard</a>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b px-6">
        <div className="flex gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6">

        {/* ── ANALYTICS TAB ── */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Total Patients',    value: analytics.totalPatients,    color: 'bg-blue-500' },
                { label: 'Total Staff',        value: analytics.totalStaff,       color: 'bg-purple-500' },
                { label: 'Total Departments',  value: analytics.totalDepartments, color: 'bg-orange-500' },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-xl border p-6 shadow-sm">
                  <div className={`w-10 h-10 ${stat.color} rounded-lg mb-3`} />
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Priority Breakdown */}
            <div className="bg-white rounded-xl border p-6 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4">Patients by Priority</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Code Red', value: analytics.patientsByPriority.red,    color: 'bg-red-500' },
                  { label: 'Urgent',   value: analytics.patientsByPriority.yellow, color: 'bg-yellow-400' },
                  { label: 'Stable',   value: analytics.patientsByPriority.green,  color: 'bg-green-500' },
                ].map(p => (
                  <div key={p.label} className="text-center">
                    <div className={`${p.color} text-white rounded-lg py-4 text-3xl font-bold mb-2`}>
                      {p.value}
                    </div>
                    <p className="text-sm text-gray-600">{p.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="bg-white rounded-xl border p-6 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4">Patients by Status</h2>
              <div className="space-y-3">
                {[
                  { label: 'Waiting',     value: analytics.patientsByStatus.waiting,       total: analytics.totalPatients },
                  { label: 'Triage',      value: analytics.patientsByStatus.inTriage,      total: analytics.totalPatients },
                  { label: 'Diagnostics', value: analytics.patientsByStatus.inDiagnostics, total: analytics.totalPatients },
                  { label: 'Treatment',   value: analytics.patientsByStatus.inTreatment,   total: analytics.totalPatients },
                  { label: 'Discharge',   value: analytics.patientsByStatus.inDischarge,   total: analytics.totalPatients },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 w-24">{s.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div
                        className="bg-blue-500 h-3 rounded-full transition-all"
                        style={{ width: s.total ? `${(s.value / s.total) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-800 w-6">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl border p-6 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4">Recent Activity</h2>
              <div className="space-y-2">
                {analytics.recentActivity.slice(0, 10).map(log => (
                  <div key={log.id} className="flex items-center gap-3 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${actionColor(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="text-gray-600">{log.details}</span>
                    <span className="text-gray-400 text-xs ml-auto">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                {analytics.recentActivity.length === 0 && (
                  <p className="text-gray-400 text-sm italic">No activity yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STAFF TAB ── */}
        {activeTab === 'staff' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Staff Members ({staff.length})</h2>
              <button
                onClick={() => setShowStaffForm(!showStaffForm)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
              >
                <Plus size={16} /> Add Staff
              </button>
            </div>

            {/* Add Staff Form */}
            {showStaffForm && (
              <div className="bg-white border rounded-xl p-4 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Name</label>
                  <input className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" placeholder="Full name"
                    value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Email</label>
                  <input className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" placeholder="email@hospital.com"
                    value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Role</label>
                  <select className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
                    value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}>
                    <option value="nurse">Nurse</option>
                    <option value="doctor">Doctor</option>
                    <option value="lab_tech">Lab Tech</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Department</label>
                  <select className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
                    value={staffForm.department} onChange={e => setStaffForm({ ...staffForm, department: e.target.value })}>
                    <option>Triage</option>
                    <option>Diagnostics</option>
                    <option>Treatment</option>
                    <option>Discharge</option>
                  </select>
                </div>
                <div className="col-span-2 md:col-span-4 flex gap-2">
                  <button onClick={addStaff} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Add</button>
                  <button onClick={() => setShowStaffForm(false)} className="text-gray-400 px-4 py-2 text-sm hover:text-gray-600">Cancel</button>
                </div>
              </div>
            )}

            {/* Staff Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Name', 'Email', 'Role', 'Department', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {staff.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {editingStaff?.id === s.id
                          ? <input className="border rounded px-2 py-1 text-sm w-full" value={editingStaff.name}
                              onChange={e => setEditingStaff({ ...editingStaff, name: e.target.value })} />
                          : s.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.email}</td>
                      <td className="px-4 py-3">
                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium capitalize">
                          {s.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.department}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {editingStaff?.id === s.id ? (
                            <>
                              <button onClick={updateStaff} className="text-green-600 hover:text-green-800"><Check size={16} /></button>
                              <button onClick={() => setEditingStaff(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setEditingStaff(s)} className="text-blue-500 hover:text-blue-700"><Edit2 size={16} /></button>
                              <button onClick={() => deleteStaff(s.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {staff.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">No staff added yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── DEPARTMENTS TAB ── */}
        {activeTab === 'departments' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Departments ({departments.length})</h2>
              <button
                onClick={() => setShowDeptForm(!showDeptForm)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
              >
                <Plus size={16} /> Add Department
              </button>
            </div>

            {/* Add Dept Form */}
            {showDeptForm && (
              <div className="bg-white border rounded-xl p-4 shadow-sm flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-xs text-gray-500">Department Name</label>
                  <input className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Radiology"
                    value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Capacity</label>
                  <input type="number" className="w-24 mt-1 border rounded-lg px-3 py-2 text-sm"
                    value={deptForm.capacity} onChange={e => setDeptForm({ ...deptForm, capacity: parseInt(e.target.value) })} />
                </div>
                <button onClick={addDept} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Add</button>
                <button onClick={() => setShowDeptForm(false)} className="text-gray-400 px-3 py-2 text-sm hover:text-gray-600">Cancel</button>
              </div>
            )}

            {/* Departments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map(dept => (
                <div key={dept.id} className="bg-white rounded-xl border p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">{dept.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        dept.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>{dept.status}</span>
                    </div>
                    <button onClick={() => deleteDept(dept.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 size={14} />
                    <span>Capacity: <strong>{dept.capacity}</strong> patients</span>
                  </div>
                </div>
              ))}
              {departments.length === 0 && (
                <div className="col-span-3 text-center text-gray-400 italic py-8">No departments added yet</div>
              )}
            </div>
          </div>
        )}

        {/* ── AUDIT LOG TAB ── */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Audit Log ({logs.length} entries)</h2>
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Action', 'Entity', 'Details', 'Time'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded font-bold ${actionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{log.entity}</td>
                      <td className="px-4 py-3 text-gray-800">{log.details}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">No logs yet</td></tr>
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