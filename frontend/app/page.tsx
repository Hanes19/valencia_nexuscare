"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Users, Activity, Stethoscope, CheckCircle2, AlertTriangle, Clock, Moon, Sun, Settings } from 'lucide-react';
import { io } from 'socket.io-client';
import { getUser, getToken, logout, getRoleColumns, getRoleLabel } from './lib/auth';

const socket = io('http://localhost:4000');

type Priority = 'red' | 'yellow' | 'green';
type Status = 'waiting' | 'in-triage' | 'in-diagnostics' | 'in-treatment' | 'in-discharge';

type Patient = {
  id: string;
  name: string;
  priority: Priority;
  status: Status;
  createdAt: string;
};

type Stats = {
  total: number;
  byPriority: { red: number; yellow: number; green: number };
  byStatus: {
    waiting: number;
    inTriage: number;
    inDiagnostics: number;
    inTreatment: number;
    inDischarge: number;
  };
};

type Room = {
  id: string;
  name: string;
  type: string;
  status: string;
  department: string;
};

const columns = [
  { id: 'waiting',        title: 'Waiting Room', color: 'bg-slate-500',   icon: Clock },
  { id: 'in-triage',      title: 'Triage',       color: 'bg-blue-500',    icon: Users },
  { id: 'in-diagnostics', title: 'Diagnostics',  color: 'bg-orange-500',  icon: Activity },
  { id: 'in-treatment',   title: 'Treatment',    color: 'bg-rose-500',    icon: Stethoscope },
  { id: 'in-discharge',   title: 'Discharge',    color: 'bg-emerald-500', icon: CheckCircle2 },
];

const priorityConfig = {
  red:    { label: 'Code Red', bg: 'bg-red-50',     border: 'border-red-400',    text: 'text-red-700',    dot: 'bg-red-500' },
  yellow: { label: 'Urgent',   bg: 'bg-amber-50',   border: 'border-amber-400',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  green:  { label: 'Stable',   bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

function PatientCard({ patient, onMove, onDischarge, userRole, rooms }: {
  patient: Patient;
  onMove: (id: string, status: Status, roomId?: string) => void;
  onDischarge: (id: string) => void;
  userRole: string;
  rooms: Room[];
}) {
  const p = priorityConfig[patient.priority];
  const waitMins = Math.floor((Date.now() - new Date(patient.createdAt).getTime()) / 60000);
  const [showRoomPicker, setShowRoomPicker] = useState<Status | null>(null);

  const departmentForStatus: Record<string, string> = {
    'in-triage': 'Triage',
    'in-diagnostics': 'Diagnostics',
    'in-treatment': 'Treatment',
    'in-discharge': 'Discharge',
  };

  const handleMove = (nextStatus: Status) => {
    const dept = departmentForStatus[nextStatus];
    const availableRooms = rooms.filter(r => r.department === dept && r.status === 'open');
    if (availableRooms.length > 0) {
      setShowRoomPicker(nextStatus);
    } else {
      onMove(patient.id, nextStatus);
    }
  };

  return (
    <div className={`animate-slide-in rounded-xl border-l-4 ${p.border} ${p.bg} p-3 mb-3 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{patient.name}</span>
        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${p.border} ${p.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
          {p.label}
        </span>
      </div>
      <div className={`flex items-center gap-1 text-xs mb-3 ${waitMins > 30 ? 'text-red-500' : 'text-slate-400'}`}>
        <Clock size={10} />
        <span>{waitMins}m waiting{waitMins > 30 ? ' ⚠️' : ''}</span>
      </div>

      {/* Room Picker */}
      {showRoomPicker && (
        <div className="mb-3 p-2 rounded-lg border animate-slide-in"
          style={{ background: 'var(--background)', borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>
            Assign Room ({departmentForStatus[showRoomPicker]}):
          </p>
          <div className="flex flex-wrap gap-1 mb-2">
            {rooms
              .filter(r => r.department === departmentForStatus[showRoomPicker] && r.status === 'open')
              .map(room => (
                <button key={room.id}
                  onClick={() => { onMove(patient.id, showRoomPicker, room.id); setShowRoomPicker(null); }}
                  className="text-xs px-2 py-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition">
                  {room.name}
                </button>
              ))}
            <button
              onClick={() => { onMove(patient.id, showRoomPicker); setShowRoomPicker(null); }}
              className="text-xs px-2 py-1 rounded-lg border hover:opacity-70 transition"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
              Skip
            </button>
          </div>
          <button onClick={() => setShowRoomPicker(null)}
            className="text-xs" style={{ color: 'var(--muted)' }}>Cancel</button>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {patient.status === 'waiting' && (userRole === 'nurse' || userRole === 'admin' || userRole === 'doctor') && (
          <button onClick={() => handleMove('in-triage')}
            className="text-xs bg-blue-500 text-white rounded-lg px-2 py-1 hover:bg-blue-600 transition font-medium">
            → Send to Triage
          </button>
        )}
        {patient.status === 'in-triage' && (userRole === 'nurse' || userRole === 'admin' || userRole === 'doctor') && (
          <>
            <button onClick={() => handleMove('in-diagnostics')}
              className="text-xs bg-orange-500 text-white rounded-lg px-2 py-1 hover:bg-orange-600 transition font-medium">
              🔬 Send to Lab
            </button>
            <button onClick={() => handleMove('in-treatment')}
              className="text-xs bg-rose-500 text-white rounded-lg px-2 py-1 hover:bg-rose-600 transition font-medium">
              💊 Send to Treatment
            </button>
          </>
        )}
        {patient.status === 'in-diagnostics' && (userRole === 'lab_tech' || userRole === 'admin' || userRole === 'doctor') && (
          <button onClick={() => handleMove('in-treatment')}
            className="text-xs bg-rose-500 text-white rounded-lg px-2 py-1 hover:bg-rose-600 transition font-medium">
            ✅ Lab Done → Send to Treatment
          </button>
        )}
        {patient.status === 'in-treatment' && (userRole === 'doctor' || userRole === 'admin') && (
          <button onClick={() => handleMove('in-discharge')}
            className="text-xs bg-emerald-500 text-white rounded-lg px-2 py-1 hover:bg-emerald-600 transition font-medium">
            → Send to Discharge
          </button>
        )}
        {patient.status === 'in-discharge' && (userRole === 'nurse' || userRole === 'admin' || userRole === 'doctor') && (
          <button onClick={() => onDischarge(patient.id)}
            className="text-xs bg-emerald-500 text-white rounded-lg px-2 py-1 hover:bg-emerald-600 transition font-medium">
            ✓ Complete & Discharge
          </button>
        )}
      </div>
    </div>
  );
}

export default function NexusDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [statsData, setStatsData] = useState<Stats>({
    total: 0,
    byPriority: { red: 0, yellow: 0, green: 0 },
    byStatus: { waiting: 0, inTriage: 0, inDiagnostics: 0, inTreatment: 0, inDischarge: 0 },
  });
  const [codeRed, setCodeRed] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', priority: 'green', status: 'waiting' });
  const [dark, setDark] = useState(false);
  const [connected, setConnected] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string; department: string } | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (!token || !user) {
      window.location.href = '/login';
      return;
    }
    setCurrentUser(user);
  }, []);

  const fetchPatients = useCallback(() => {
    fetch('http://localhost:4000/api/patients')
      .then(res => res.json())
      .then(data => { setPatients(data); setDataLoaded(true); })
      .catch(err => console.error('Failed to fetch patients:', err));
  }, []);

  const fetchStats = useCallback(() => {
    fetch('http://localhost:4000/api/stats')
      .then(res => res.json())
      .then(setStatsData)
      .catch(err => console.error('Failed to fetch stats:', err));
  }, []);

  const fetchRooms = useCallback(() => {
  fetch('http://localhost:4000/api/rooms')
    .then(res => res.json())
    .then(setRooms)
    .catch(err => console.error('Failed to fetch rooms:', err));
}, []);

  useEffect(() => {
    fetchPatients();
    fetchStats();
    fetchRooms();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('queue:updated', () => { fetchPatients(); fetchStats(); });
    socket.on('queue:emergency', ({ patient, message }: { patient: Patient; message: string }) => {
      setCodeRed(`🚨 ${message}: ${patient.name}`);
      setTimeout(() => setCodeRed(null), 6000);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('queue:updated');
      socket.off('queue:emergency');
    };
  }, [fetchPatients, fetchStats]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const movePatient = async (id: string, status: Status, roomId?: string) => {
  await fetch(`http://localhost:4000/api/patients/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (roomId) {
    await fetch(`http://localhost:4000/api/rooms/${roomId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'occupied', currentPatientId: id }),
    });
    fetchRooms();
  }
};

  const dischargePatient = async (id: string) => {
    await fetch(`http://localhost:4000/api/patients/${id}`, { method: 'DELETE' });
  };

  const admitPatient = async () => {
    if (!form.name.trim()) return;
    await fetch('http://localhost:4000/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ name: '', priority: 'green', status: 'waiting' });
    setShowForm(false);
  };

  const visibleColumns = columns.filter(col =>
    currentUser ? getRoleColumns(currentUser.role as any).includes(col.id) : true
  );

  const allHeatmapDepts = [
    { label: 'Waiting',     count: statsData.byStatus.waiting,       threshold: 5, id: 'waiting' },
    { label: 'Triage',      count: statsData.byStatus.inTriage,      threshold: 4, id: 'in-triage' },
    { label: 'Diagnostics', count: statsData.byStatus.inDiagnostics, threshold: 3, id: 'in-diagnostics' },
    { label: 'Treatment',   count: statsData.byStatus.inTreatment,   threshold: 3, id: 'in-treatment' },
    { label: 'Discharge',   count: statsData.byStatus.inDischarge,   threshold: 4, id: 'in-discharge' },
  ];

  const heatmapDepts = allHeatmapDepts.filter(d =>
    currentUser ? getRoleColumns(currentUser.role as any).includes(d.id) : true
  );

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'doctor';

  return (
    <div className="min-h-screen p-4 md:p-6 transition-colors" style={{ background: 'var(--background)' }}>

      {/* Code Red Banner */}
      {codeRed && (
        <div className="fixed top-0 left-0 right-0 z-50 animate-pulse-red text-white text-center py-3 font-bold text-base shadow-lg">
          {codeRed}
        </div>
      )}

      {/* Header */}
      <header className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
              NexusCare
            </h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              connected || dataLoaded ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
            }`}>
              {connected || dataLoaded ? '● Live' : '○ Offline'}
            </span>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Hospital Flow Command Center</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {currentUser && (
            <div className="text-xs px-3 py-1.5 rounded-lg border font-medium"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
              👤 {currentUser.name} · {getRoleLabel(currentUser.role as any)}
            </div>
          )}
          {statsData.byPriority.red > 0 && (
            <div className="flex items-center gap-1.5 bg-red-100 border border-red-300 text-red-700 px-3 py-1.5 rounded-lg text-sm font-semibold animate-pulse">
              <AlertTriangle size={14} />
              {statsData.byPriority.red} Code Red
            </div>
          )}
          <div className="text-xs px-3 py-1.5 rounded-lg border font-medium"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
            {statsData.total} patients
          </div>
          {isAdmin && (
            <a href="/admin" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium hover:opacity-80 transition"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
              <Settings size={14} /> Admin
            </a>
          )}
          <button onClick={() => logout()}
            className="text-xs px-3 py-1.5 rounded-lg border hover:opacity-80 transition"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
            Logout
          </button>
          <button onClick={() => setDark(!dark)}
            className="p-2 rounded-lg border hover:opacity-80 transition"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {isAdmin && (
            <button onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition shadow-sm">
              + Admit Patient
            </button>
          )}
        </div>
      </header>

      {/* Heatmap Stats Bar */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {heatmapDepts.map((dept) => {
          const load = Math.min((dept.count / dept.threshold) * 100, 100);
          const heat = load >= 100 ? 'bg-red-500' : load >= 60 ? 'bg-amber-400' : 'bg-emerald-400';
          const textHeat = load >= 100 ? 'text-red-500' : load >= 60 ? 'text-amber-500' : 'text-emerald-500';
          const status = load >= 100 ? '🔴 Full' : load >= 60 ? '🟡 Busy' : '🟢 Clear';
          return (
            <div key={dept.label} className="rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>{dept.label}</span>
                <span className={`text-xs font-bold ${textHeat}`}>{status}</span>
              </div>
              <div className="w-full rounded-full h-1.5 mb-3" style={{ background: 'var(--border)' }}>
                <div className={`h-1.5 rounded-full transition-all duration-700 ${heat}`} style={{ width: `${load}%` }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                {dept.count}
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--muted)' }}>/ {dept.threshold}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Admit Form */}
      {showForm && isAdmin && (
        <div className="mb-6 rounded-xl border p-4 shadow-sm animate-slide-in flex gap-4 items-end flex-wrap"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex-1 min-w-40">
            <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Patient Name</label>
            <input
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              placeholder="Full name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && admitPatient()}
            />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Priority</label>
            <select
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
            >
              <option value="green">🟢 Stable</option>
              <option value="yellow">🟡 Urgent</option>
              <option value="red">🔴 Code Red</option>
            </select>
          </div>
          <button onClick={admitPatient}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition">
            Admit
          </button>
          <button onClick={() => setShowForm(false)}
            className="text-sm px-3 py-2 rounded-lg hover:opacity-70 transition" style={{ color: 'var(--muted)' }}>
            Cancel
          </button>
        </div>
      )}

      {/* Role banner for non-admin */}
      {currentUser && !isAdmin && (
        <div className="mb-4 px-4 py-3 rounded-xl border text-sm font-medium"
          style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
          👁 Viewing as <strong style={{ color: 'var(--foreground)' }}>{getRoleLabel(currentUser.role as any)}</strong>
          {currentUser.department && ` — ${currentUser.department} Department`}
        </div>
      )}

      {/* Kanban Board */}
      <div className={`grid grid-cols-1 gap-4 ${
        visibleColumns.length === 1 ? 'md:grid-cols-1 lg:grid-cols-1' :
        visibleColumns.length === 2 ? 'md:grid-cols-2 lg:grid-cols-2' :
        visibleColumns.length === 3 ? 'md:grid-cols-3 lg:grid-cols-3' :
        'md:grid-cols-2 lg:grid-cols-5'
      }`}>
        {visibleColumns.map((col) => {
          const Icon = col.icon;
          const colPatients = patients.filter(p => p.status === col.id);
          const isBusy = colPatients.length >= 3;
          return (
            <div key={col.id} className="flex flex-col rounded-xl border shadow-sm h-[62vh]"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className={`p-3 ${col.color} text-white rounded-t-xl flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <Icon size={16} />
                  <h2 className="font-semibold text-sm">{col.title}</h2>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isBusy ? 'bg-red-500/30' : 'bg-white/20'}`}>
                  {colPatients.length}
                </span>
              </div>
              <div className="p-3 flex-1 overflow-y-auto">
                {colPatients.length === 0 ? (
                  <div className="text-center mt-10">
                    <p className="text-xs italic" style={{ color: 'var(--muted)' }}>No patients</p>
                  </div>
                ) : (
                  colPatients.map(patient => (
                    <PatientCard
                      key={patient.id}
                      patient={patient}
                      onMove={movePatient}
                      onDischarge={dischargePatient}
                      userRole={currentUser?.role || 'admin'}
                      rooms={rooms}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}