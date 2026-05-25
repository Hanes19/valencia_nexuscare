import * as dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import cors from 'cors';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
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

    await prisma.patient.delete({ where: { id: req.params.id } });

    io.emit('queue:updated', { action: 'deleted', patientId: req.params.id });
    res.json({ message: 'Patient removed from queue' });
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