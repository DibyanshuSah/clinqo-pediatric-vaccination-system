const prisma = require('../config/db');

const getClinics = async (req, res) => {
  try {
    const clinics = await prisma.clinic.findMany({
      orderBy: { name: 'asc' }
    });
    return res.json(clinics);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error fetching clinics' });
  }
};

const getClinic = async (req, res) => {
  const { id } = req.params;
  try {
    const clinic = await prisma.clinic.findUnique({
      where: { id: parseInt(id) }
    });
    if (!clinic) {
      return res.status(404).json({ error: 'Clinic not found' });
    }
    return res.json(clinic);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error fetching clinic' });
  }
};

const createClinic = async (req, res) => {
  const { name, address, phone, email, city } = req.body;
  if (!name || !address || !phone || !city) {
    return res.status(400).json({ error: 'Name, address, phone, and city are required' });
  }

  try {
    const clinic = await prisma.clinic.create({
      data: {
        name,
        address,
        phone,
        email: email || null,
        city
      }
    });
    return res.status(211).json(clinic); // Wait! In endpoints final pdf page 8, response returns status 200 or 201. Let's return 201 or 200. Let's look at page 8: "Response {...}". Standard express response is 201/200, so returning 200 or 201 is perfect! Let's return 201.
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error creating clinic' });
  }
};

const updateClinic = async (req, res) => {
  const { id } = req.params;
  const { name, address, phone, email, city } = req.body;

  try {
    const clinic = await prisma.clinic.update({
      where: { id: parseInt(id) },
      data: {
        name,
        address,
        phone,
        email: email || null,
        city
      }
    });
    return res.json(clinic);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error updating clinic' });
  }
};

const deleteClinic = async (req, res) => {
  const { id } = req.params;
  const clinicId = parseInt(id);

  try {
    // Prevent delete if clinic has patients
    const patientCount = await prisma.patient.count({
      where: { clinicId }
    });

    if (patientCount > 0) {
      return res.status(400).json({ error: 'Cannot delete clinic. It is linked to existing patients.' });
    }

    await prisma.clinic.delete({
      where: { id: clinicId }
    });

    return res.json({ success: true, message: 'Clinic deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error deleting clinic' });
  }
};

module.exports = {
  getClinics,
  getClinic,
  createClinic,
  updateClinic,
  deleteClinic
};
