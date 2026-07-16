const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_kiddos_token_key_2026');
    
    // Check if session exists in DB
    const session = await prisma.session.findUnique({
      where: { token }
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    req.token = token;
    
    if (decoded.role === 'doctor') {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      req.user = { ...user, role: 'doctor' };
      return next();
    } else if (decoded.role === 'parent') {
      const patient = await prisma.patient.findUnique({
        where: { id: decoded.patientId }
      });
      if (!patient) {
        return res.status(401).json({ error: 'Patient not found' });
      }
      req.user = { role: 'parent', patientId: decoded.patientId, patientName: patient.name, name: patient.parentName };
      return next();
    }

    return res.status(403).json({ error: 'Forbidden' });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireDoctor = (req, res, next) => {
  if (!req.user || req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Doctor access required' });
  }
  next();
};

const requireAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.user.role === 'doctor') {
    return next();
  }
  // For parents, check if they are trying to access their own patientId
  const reqPatientId = parseInt(req.params.id || req.params.patientId || req.query.patientId);
  if (req.user.role === 'parent' && req.user.patientId === reqPatientId) {
    return next();
  }
  return res.status(403).json({ error: 'Access denied to this patient profile' });
};

module.exports = {
  authenticate,
  requireDoctor,
  requireAccess
};
