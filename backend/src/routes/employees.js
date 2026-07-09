const express = require('express');
const path = require('path');
const prisma = require('../db');
const authMiddleware = require('../middleware/auth');
const { uploadFaceFields } = require('../middleware/upload');
const {
  registerFace,
  registerFaceMulti,
  serializeEmbeddings,
  wakeAiService,
} = require('../services/aiService');
const { getFactoryId } = require('../utils/factory');
const {
  validateEmployeeInput,
  sanitizeEmployeePayload,
} = require('../utils/employee');

const router = express.Router();

router.use(authMiddleware);

function getUploadedImagePaths(req) {
  const multi = req.files?.images;
  if (multi?.length >= 2) {
    return multi.map((file) => file.path);
  }

  const single = req.files?.image?.[0] || req.file;
  return single ? [single.path] : [];
}

router.get('/', async (req, res) => {
  try {
    const factoryId = getFactoryId(req);
    const employees = await prisma.employee.findMany({
      where: { factoryId },
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
    const factoryId = getFactoryId(req);
    const employee = await prisma.employee.findFirst({
      where: { id: Number(req.params.id), factoryId },
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
    const factoryId = getFactoryId(req);
    const errors = validateEmployeeInput(req.body, { requireCore: true });
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('. ') });
    }

    const data = sanitizeEmployeePayload(req.body);

    const employee = await prisma.employee.create({
      data: {
        factoryId,
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
      return res.status(409).json({ error: 'Employee ID already exists in this factory' });
    }
    console.error('logName=createEmployeeFailed, error=', err.message);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const factoryId = getFactoryId(req);
    const errors = validateEmployeeInput(req.body, { requireCore: true });
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('. ') });
    }

    const existing = await prisma.employee.findFirst({
      where: { id: Number(req.params.id), factoryId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const data = sanitizeEmployeePayload(req.body);

    const employee = await prisma.employee.update({
      where: { id: existing.id },
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
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Employee ID already exists in this factory' });
    }
    console.error('logName=updateEmployeeFailed, error=', err.message);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const factoryId = getFactoryId(req);
    const existing = await prisma.employee.findFirst({
      where: { id: Number(req.params.id), factoryId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await prisma.employee.delete({ where: { id: existing.id } });
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Employee not found' });
    }
    console.error('logName=deleteEmployeeFailed, error=', err.message);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

router.post('/:id/register-face', uploadFaceFields, async (req, res) => {
  try {
    const factoryId = getFactoryId(req);
    const imagePaths = getUploadedImagePaths(req);
    if (imagePaths.length === 0) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const employee = await prisma.employee.findFirst({
      where: { id: Number(req.params.id), factoryId },
    });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const aiReady = await wakeAiService();
    if (!aiReady) {
      return res.status(503).json({
        error:
          'AI service is still waking up on Render. Wait 30 seconds and try again.',
      });
    }

    const result =
      imagePaths.length >= 2
        ? await registerFaceMulti(imagePaths)
        : await registerFace(imagePaths[0]);

    if (!result.success || !result.embedding || result.embedding.length === 0) {
      return res.status(422).json({
        error: result.message || 'No face detected in image',
      });
    }

    const photoFile = req.files?.images?.[0] || req.files?.image?.[0] || req.file;
    const photoPath = photoFile
      ? `/uploads/${path.basename(photoFile.path)}`
      : employee.photoPath;

    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        faceEmbedding: serializeEmbeddings(result.embeddings, result.embedding),
        photoPath,
      },
    });

    res.json({
      message:
        imagePaths.length >= 2
          ? 'Face registered from live captures'
          : 'Face registered successfully',
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
