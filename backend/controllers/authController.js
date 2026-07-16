const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const login = async (req, res) => {
  const { type, username, password, uhid, mobile } = req.body;

  try {
    if (type === 'doctor') {
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const user = await prisma.user.findUnique({
        where: { username }
      });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: 'doctor' },
        process.env.JWT_SECRET || 'super_secret_kiddos_token_key_2026',
        { expiresIn: '30d' }
      );

      // Save session in DB
      await prisma.session.create({
        data: {
          token,
          role: 'doctor',
          userId: user.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      });

      return res.json({
        role: 'doctor',
        name: user.name,
        token
      });
    } else if (type === 'parent') {
      if (!uhid || !mobile) {
        return res.status(400).json({ error: 'UHID and mobile number required' });
      }

      const patient = await prisma.patient.findFirst({
        where: {
          uhid,
          mobile
        }
      });

      if (!patient) {
        return res.status(401).json({ error: 'Invalid credentials. Patient not found with these details.' });
      }

      const token = jwt.sign(
        { patientId: patient.id, role: 'parent' },
        process.env.JWT_SECRET || 'super_secret_kiddos_token_key_2026',
        { expiresIn: '30d' }
      );

      // Save session in DB
      await prisma.session.create({
        data: {
          token,
          role: 'parent',
          patientId: patient.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      return res.json({
        role: 'parent',
        patientId: patient.id,
        patientName: patient.name,
        name: patient.parentName,
        token
      });
    }

    return res.status(400).json({ error: 'Invalid login type' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error during login' });
  }
};

const me = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return res.json(req.user);
};

const logout = async (req, res) => {
  try {
    const token = req.token;
    if (token) {
      await prisma.session.delete({
        where: { token }
      }).catch(() => {});
    }
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error during logout' });
  }
};

module.exports = {
  login,
  me,
  logout
};
