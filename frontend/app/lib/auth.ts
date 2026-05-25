export type UserRole = 'admin' | 'doctor' | 'nurse' | 'lab_tech' | 'cleaning';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
};

export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

// What columns each role can see
export const getRoleColumns = (role: UserRole) => {
  switch (role) {
    case 'admin':
    case 'doctor':
      return ['waiting', 'in-triage', 'in-diagnostics', 'in-treatment', 'in-discharge'];
    case 'nurse':
      return ['waiting', 'in-triage'];
    case 'lab_tech':
      return ['in-diagnostics'];
    case 'cleaning':
      return ['in-discharge'];
    default:
      return ['waiting', 'in-triage', 'in-diagnostics', 'in-treatment', 'in-discharge'];
  }
};

// Role display label
export const getRoleLabel = (role: UserRole) => {
  switch (role) {
    case 'admin':    return 'Administrator';
    case 'doctor':   return 'Doctor';
    case 'nurse':    return 'Nurse';
    case 'lab_tech': return 'Lab Technician';
    case 'cleaning': return 'Cleaning Staff';
    default:         return role;
  }
};