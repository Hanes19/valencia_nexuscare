import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'nexuscare-secret-key';
const adapter = new PrismaPg({ 
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });
const app = express();
const server = createServer(app);
const allowedOrigins = [
  'http://localhost:3000',
  'https://valencia-nexuscare.vercel.app',
  'https://valencia-nexuscare-fnpnm6zt5-hanes19s-projects.vercel.app',
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  }
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

// ─── Health Check ───────────────────────────────────────────────
app.get('/', (req, res) => {
    res.send('NexusCare API is online');
});

// ─── GET all patients (sorted by priority) ──────────────────────
app.get('/api/patients', async (req, res) => {
    const priorityOrder = { 'red': 0, 'yellow': 1, 'green': 2 };
    const patients = await prisma.patient.findMany({
        orderBy: { createdAt: 'asc' }
    });
    const sorted = patients.sort((a, b) => 
        (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 9) - 
        (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 9)
    );
    res.json(sorted);
});

// ─── GET single patient ──────────────────────────────────────────
app.get('/api/patients/:id', async (req, res) => {
    const patient = await prisma.patient.findUnique({
        where: { id: req.params.id }
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
});

// ─── POST create patient ─────────────────────────────────────────
app.post('/api/patients', async (req, res) => {
    const { name, priority, status } = req.body;

    if (!name || !priority || !status) {
        return res.status(400).json({ error: 'name, priority, and status are required' });
    }

    const validPriorities = ['red', 'yellow', 'green'];
    const validStatuses = ['waiting', 'in-triage', 'in-diagnostics', 'in-treatment', 'in-discharge'];

    if (!validPriorities.includes(priority)) {
        return res.status(400).json({ error: `priority must be one of: ${validPriorities.join(', ')}` });
    }
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }

    const patient = await prisma.patient.create({
        data: { name, priority, status }
    });

    // Broadcast new patient to all connected dashboards
    io.emit('queue:updated', { action: 'created', patient });

    res.status(201).json(patient);
});

// ─── PATCH update patient (status or priority) ───────────────────
app.patch('/api/patients/:id', async (req, res) => {
    const { status, priority } = req.body;

    const existing = await prisma.patient.findUnique({
        where: { id: req.params.id }
    });
    if (!existing) return res.status(404).json({ error: 'Patient not found' });

    const patient = await prisma.patient.update({
        where: { id: req.params.id },
        data: {
            ...(status && { status }),
            ...(priority && { priority }),
        }
    });

    // If a Code Red arrives, broadcast emergency override
    if (priority === 'red' && existing.priority !== 'red') {
        io.emit('queue:emergency', { patient, message: 'Code Red — queue recalculated' });
    }

    io.emit('queue:updated', { action: 'updated', patient });
    res.json(patient);
});

// ─── DELETE discharge/remove patient ────────────────────────────
app.delete('/api/patients/:id', async (req, res) => {
    const existing = await prisma.patient.findUnique({
        where: { id: req.params.id }
    });
    if (!existing) return res.status(404).json({ error: 'Patient not found' });

    // Clear any room assigned to this patient
    const assignedRoom = await prisma.room.findFirst({
        where: { currentPatientId: req.params.id }
    });
    if (assignedRoom) {
        await prisma.room.update({
            where: { id: assignedRoom.id },
            data: { status: 'cleaning', currentPatientId: null }
        });
        await prisma.auditLog.create({ data: { action: 'UPDATED', entity: 'Room', entityId: assignedRoom.id, details: `${assignedRoom.name} set to cleaning after discharge` } });
    }

    try {
        await prisma.patient.delete({ where: { id: req.params.id } });
    } catch {
        return res.status(404).json({ error: 'Patient already deleted' });
    }

    io.emit('queue:updated', { action: 'deleted', patientId: req.params.id });
    if (assignedRoom) io.emit('rooms:updated', { id: assignedRoom.id, status: 'cleaning' });
    res.json({ message: 'Patient discharged and room set to cleaning' });
});

// ─── GET queue stats (for the heatmap dashboard) ─────────────────
app.get('/api/stats', async (req, res) => {
    const patients = await prisma.patient.findMany();

    const stats = {
        total: patients.length,
        byPriority: {
            red: patients.filter(p => p.priority === 'red').length,
            yellow: patients.filter(p => p.priority === 'yellow').length,
            green: patients.filter(p => p.priority === 'green').length,
        },
        byStatus: {
            waiting: patients.filter(p => p.status === 'waiting').length,
            inTriage: patients.filter(p => p.status === 'in-triage').length,
            inDiagnostics: patients.filter(p => p.status === 'in-diagnostics').length,
            inTreatment: patients.filter(p => p.status === 'in-treatment').length,
            inDischarge: patients.filter(p => p.status === 'in-discharge').length,
        }
    };

    res.json(stats);

    
});

// ─── ROOM ROUTES ─────────────────────────────────────────────────

app.get('/api/rooms', async (req, res) => {
    const rooms = await prisma.room.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(rooms);
});

app.post('/api/rooms', async (req, res) => {
    const { name, type, department } = req.body;
    if (!name || !type || !department) {
        return res.status(400).json({ error: 'name, type, and department are required' });
    }
    const room = await prisma.room.create({ data: { name, type, department } });
    await prisma.auditLog.create({ data: { action: 'CREATED', entity: 'Room', entityId: room.id, details: `${name} added to ${department}` } });
    io.emit('rooms:updated', room);
    res.status(201).json(room);
});

app.patch('/api/rooms/:id', async (req, res) => {
    const { status, currentPatientId } = req.body;
    const room = await prisma.room.update({
        where: { id: req.params.id },
        data: {
            ...(status && { status }),
            ...(currentPatientId !== undefined && { currentPatientId }),
        }
    });
    await prisma.auditLog.create({ data: { action: 'UPDATED', entity: 'Room', entityId: room.id, details: `${room.name} status → ${room.status}` } });
    io.emit('rooms:updated', room);
    res.json(room);
});

app.delete('/api/rooms/:id', async (req, res) => {
    const room = await prisma.room.findUnique({ where: { id: req.params.id } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    await prisma.room.delete({ where: { id: req.params.id } });
    await prisma.auditLog.create({ data: { action: 'DELETED', entity: 'Room', entityId: req.params.id, details: `${room.name} removed` } });
    io.emit('rooms:updated', { id: req.params.id, deleted: true });
    res.json({ message: 'Room removed' });
});

// ─── AUTH ROUTES ─────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, role, department } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'name, email and password are required' });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: { name, email, password: hashed, role: role || 'nurse', department }
    });
    await prisma.auditLog.create({ data: { action: 'CREATED', entity: 'User', entityId: user.id, details: `${name} registered as ${role}` } });
    const token = jwt.sign({ id: user.id, role: user.role, department: user.department }, JWT_SECRET, { expiresIn: '8h' });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department } });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    await prisma.auditLog.create({ data: { action: 'UPDATED', entity: 'User', entityId: user.id, details: `${user.name} logged in` } });
    const token = jwt.sign({ id: user.id, role: user.role, department: user.department }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department } });
});

app.get('/api/auth/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ id: user.id, name: user.name, email: user.email, role: user.role, department: user.department });
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// ─── STAFF ROUTES ────────────────────────────────────────────────
app.get('/api/staff', async (req, res) => {
    const staff = await prisma.staff.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(staff);
});

app.post('/api/staff', async (req, res) => {
    const { name, email, role, department } = req.body;
    if (!name || !email || !role || !department) {
        return res.status(400).json({ error: 'name, email, role, and department are required' });
    }
    const staff = await prisma.staff.create({ data: { name, email, role, department } });
    await prisma.auditLog.create({ data: { action: 'CREATED', entity: 'Staff', entityId: staff.id, details: `${name} added as ${role}` } });
    res.status(201).json(staff);
});

app.patch('/api/staff/:id', async (req, res) => {
    const { name, email, role, department, status } = req.body;
    const staff = await prisma.staff.update({
        where: { id: req.params.id },
        data: { ...(name && { name }), ...(email && { email }), ...(role && { role }), ...(department && { department }), ...(status && { status }) }
    });
    await prisma.auditLog.create({ data: { action: 'UPDATED', entity: 'Staff', entityId: staff.id, details: `${staff.name} updated` } });
    res.json(staff);
});

app.delete('/api/staff/:id', async (req, res) => {
    const staff = await prisma.staff.findUnique({ where: { id: req.params.id } });
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    await prisma.staff.delete({ where: { id: req.params.id } });
    await prisma.auditLog.create({ data: { action: 'DELETED', entity: 'Staff', entityId: req.params.id, details: `${staff.name} removed` } });
    res.json({ message: 'Staff removed' });
});

// ─── DEPARTMENT ROUTES ───────────────────────────────────────────
app.get('/api/departments', async (req, res) => {
    const departments = await prisma.department.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(departments);
});

app.post('/api/departments', async (req, res) => {
    const { name, capacity } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const department = await prisma.department.create({ data: { name, capacity: capacity ?? 5 } });
    await prisma.auditLog.create({ data: { action: 'CREATED', entity: 'Department', entityId: department.id, details: `${name} created with capacity ${capacity ?? 5}` } });
    res.status(201).json(department);
});

app.patch('/api/departments/:id', async (req, res) => {
    const { name, capacity, status } = req.body;
    const department = await prisma.department.update({
        where: { id: req.params.id },
        data: { ...(name && { name }), ...(capacity && { capacity }), ...(status && { status }) }
    });
    await prisma.auditLog.create({ data: { action: 'UPDATED', entity: 'Department', entityId: department.id, details: `${department.name} updated` } });
    res.json(department);
});

app.delete('/api/departments/:id', async (req, res) => {
    const dept = await prisma.department.findUnique({ where: { id: req.params.id } });
    if (!dept) return res.status(404).json({ error: 'Department not found' });
    await prisma.department.delete({ where: { id: req.params.id } });
    await prisma.auditLog.create({ data: { action: 'DELETED', entity: 'Department', entityId: req.params.id, details: `${dept.name} removed` } });
    res.json({ message: 'Department removed' });
});

// ─── AUDIT LOG ROUTES ────────────────────────────────────────────
app.get('/api/logs', async (req, res) => {
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    res.json(logs);
});

// ─── ANALYTICS ROUTES ────────────────────────────────────────────
app.get('/api/analytics', async (req, res) => {
    const [patients, staff, departments, logs] = await Promise.all([
        prisma.patient.findMany(),
        prisma.staff.findMany(),
        prisma.department.findMany(),
        prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);
    res.json({
        totalPatients: patients.length,
        totalStaff: staff.length,
        totalDepartments: departments.length,
        patientsByPriority: {
            red: patients.filter((p: { priority: string }) => p.priority === 'red').length,
            yellow: patients.filter((p: { priority: string }) => p.priority === 'yellow').length,
            green: patients.filter((p: { priority: string }) => p.priority === 'green').length,
        },
        patientsByStatus: {
            waiting: patients.filter((p: { status: string }) => p.status === 'waiting').length,
            inTriage: patients.filter((p: { status: string }) => p.status === 'in-triage').length,
            inDiagnostics: patients.filter((p: { status: string }) => p.status === 'in-diagnostics').length,
            inTreatment: patients.filter((p: { status: string }) => p.status === 'in-treatment').length,
            inDischarge: patients.filter((p: { status: string }) => p.status === 'in-discharge').length,
        },
        recentActivity: logs,
    });
});

// ─── USER MANAGEMENT ROUTES ──────────────────────────────────────
app.get('/api/users', async (req, res) => {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, department: true, createdAt: true }
    });
    res.json(users);
});

app.patch('/api/users/:id', async (req, res) => {
    const { role, department } = req.body;
    const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { ...(role && { role }), ...(department && { department }) },
        select: { id: true, name: true, email: true, role: true, department: true, createdAt: true }
    });
    await prisma.auditLog.create({ data: { action: 'UPDATED', entity: 'User', entityId: user.id, details: `${user.name} role updated to ${role}` } });
    res.json(user);
});

app.delete('/api/users/:id', async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    await prisma.user.delete({ where: { id: req.params.id } });
    await prisma.auditLog.create({ data: { action: 'DELETED', entity: 'User', entityId: req.params.id, details: `${user.name} account deleted` } });
    res.json({ message: 'User deleted' });
});


// ─── SETTINGS ROUTES ─────────────────────────────────────────────
app.get('/api/settings', async (req, res) => {
    const settings = await prisma.setting.findMany();
    res.json(settings);
});

app.patch('/api/settings/:key', async (req, res) => {
    const { value } = req.body;
    if (!value) return res.status(400).json({ error: 'value is required' });
    const setting = await prisma.setting.update({
        where: { key: req.params.key },
        data: { value, updatedAt: new Date() }
    });
    await prisma.auditLog.create({ data: { action: 'UPDATED', entity: 'Setting', entityId: setting.id, details: `${req.params.key} changed to ${value}` } });
    io.emit('settings:updated', setting);
    res.json(setting);
});

// ─── AUTO-ESCALATION ENGINE ──────────────────────────────────────
const runEscalationEngine = async () => {
    try {
        // Get current settings
        const settings = await prisma.setting.findMany();
        const getSetting = (key: string, fallback: number) => {
            const s = settings.find(s => s.key === key);
            return s ? parseInt(s.value) : fallback;
        };

        const escalateYellowAfter = getSetting('auto_escalate_yellow', 30);
        const escalateRedAfter = getSetting('auto_escalate_red', 45);
        const maxWaitMinutes = getSetting('max_wait_minutes', 60);
        const codeRedOverride = settings.find(s => s.key === 'code_red_override')?.value === 'true';

        const patients = await prisma.patient.findMany();
        const now = Date.now();

        for (const patient of patients) {
            const waitMins = Math.floor((now - new Date(patient.createdAt).getTime()) / 60000);

            // Escalate green → yellow
            if (patient.priority === 'green' && waitMins >= escalateYellowAfter) {
                await prisma.patient.update({
                    where: { id: patient.id },
                    data: { priority: 'yellow' }
                });
                await prisma.auditLog.create({ data: { 
                    action: 'UPDATED', entity: 'Patient', entityId: patient.id, 
                    details: `${patient.name} auto-escalated to Urgent after ${waitMins}m wait` 
                }});
                io.emit('queue:updated', { action: 'escalated', patientId: patient.id, newPriority: 'yellow' });
                console.log(`⬆️ ${patient.name} escalated to Urgent (${waitMins}m wait)`);
            }

            // Escalate yellow → red
            else if (patient.priority === 'yellow' && waitMins >= escalateRedAfter) {
                await prisma.patient.update({
                    where: { id: patient.id },
                    data: { priority: 'red' }
                });
                await prisma.auditLog.create({ data: { 
                    action: 'UPDATED', entity: 'Patient', entityId: patient.id, 
                    details: `${patient.name} auto-escalated to Code Red after ${waitMins}m wait` 
                }});
                io.emit('queue:emergency', { 
                    patient: { ...patient, priority: 'red' }, 
                    message: 'Auto-escalated to Code Red' 
                });
                io.emit('queue:updated', { action: 'escalated', patientId: patient.id, newPriority: 'red' });
                console.log(`🚨 ${patient.name} escalated to Code Red (${waitMins}m wait)`);
            }

            // Code Red override — skip queue to triage
            else if (patient.priority === 'red' && patient.status === 'waiting' && codeRedOverride) {
                await prisma.patient.update({
                    where: { id: patient.id },
                    data: { status: 'in-triage' }
                });
                await prisma.auditLog.create({ data: { 
                    action: 'UPDATED', entity: 'Patient', entityId: patient.id, 
                    details: `${patient.name} auto-moved to Triage (Code Red override)` 
                }});
                io.emit('queue:updated', { action: 'override', patientId: patient.id });
                console.log(`🚨 ${patient.name} moved to Triage via Code Red override`);
            }

            // Max wait alert
            if (waitMins >= maxWaitMinutes) {
                io.emit('queue:alert', { 
                    patientId: patient.id, 
                    message: `${patient.name} has been waiting ${waitMins} minutes!` 
                });
            }
        }
    } catch (err) {
        console.error('Escalation engine error:', err);
    }
};

// Run every 60 seconds
setInterval(runEscalationEngine, 60000);
console.log('⚙️ Auto-escalation engine started');

// ─── Socket.io ───────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log('Dashboard connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Dashboard disconnected:', socket.id);
    });
});

// ─── Start ───────────────────────────────────────────────────────
server.listen(4000, () => {
    console.log('✅ NexusCare API running at http://localhost:4000');
});