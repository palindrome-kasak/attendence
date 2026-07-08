const express = require('express');
const path = require('path');
const prisma = require('../db');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');
const { registerFace } = require('../services/aiService');
const {
  validateEmployeeInput,
  sanitizeEmployeePayload,
} = require('../utils/employee');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (_req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        employeeId: true,
        name: true,
        department: true,
        phone: true,
        photoPath: true,
        faceEmbedding: true,
        createdAt: true,
      },
    });

    res.json(
      employees.map((emp) => ({
        ...emp,
        hasFaceRegistered: Boolean(emp.faceEmbedding),
        faceEmbedding: undefined,
      }))
    );
  } catch (err) {
    console.error('logName=listEmployeesFailed, error=', err.message);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({
      ...employee,
      hasFaceRegistered: Boolean(employee.faceEmbedding),
      faceEmbedding: undefined,
    });
  } catch (err) {
    console.error('logName=getEmployeeFailed, error=', err.message);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

router.post('/', async (req, res) => {
  try {
    const errors = validateEmployeeInput(req.body, { requireCore: true });
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('. ') });
    }

    const data = sanitizeEmployeePayload(req.body);

    const employee = await prisma.employee.create({
      data: {
        employeeId: data.employeeId,
        name: data.name,
        department: data.department,
        phone: data.phone,
      },
    });

    res.status(201).json({
      ...employee,
      hasFaceRegistered: false,
      faceEmbedding: undefined,
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Employee ID already exists' });
    }
    console.error('logName=createEmployeeFailed, error=', err.message);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const errors = validateEmployeeInput(req.body, { requireCore: true });
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('. ') });
    }

    const data = sanitizeEmployeePayload(req.body);

    const employee = await prisma.employee.update({
      where: { id: Number(req.params.id) },
      data: {
        employeeId: data.employeeId,
        name: data.name,
        department: data.department,
        phone: data.phone,
      },
    });
    res.json({
      ...employee,
      hasFaceRegistered: Boolean(employee.faceEmbedding),
      faceEmbedding: undefined,
    });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Employee not found' });
    }
    console.error('logName=updateEmployeeFailed, error=', err.message);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.employee.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Employee not found' });
    }
    console.error('logName=deleteEmployeeFailed, error=', err.message);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

router.post('/:id/register-face', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const result = await registerFace(req.file.path);
    if (!result.success || !result.embedding || result.embedding.length === 0) {
      return res.status(422).json({
        error: result.message || 'No face detected in image',
      });
    }

    const photoPath = `/uploads/${path.basename(req.file.path)}`;
    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        faceEmbedding: JSON.stringify(result.embedding),
        photoPath,
      },
    });

    res.json({
      message: 'Face registered successfully',
      employee: {
        id: updated.id,
        name: updated.name,
        photoPath: updated.photoPath,
        hasFaceRegistered: true,
      },
    });
  } catch (err) {
    console.error('logName=registerFaceFailed, error=', err.message);
    res.status(500).json({ error: err.message || 'Face registration failed' });
  }
});

module.exports = router;
