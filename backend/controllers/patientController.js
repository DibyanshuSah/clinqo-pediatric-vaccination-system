const prisma = require('../config/db');

// Helper to generate a unique UHID
// Format: KC + Last 2 digits of current year (e.g. 26) + 6 random digits
const generateUHID = async () => {
  const year2 = new Date().getFullYear().toString().slice(-2);
  let isUnique = false;
  let uhid = '';
  
  while (!isUnique) {
    const random6 = Math.floor(100000 + Math.random() * 900000).toString();
    uhid = `KC${year2}${random6}`;
    
    const existing = await prisma.patient.findUnique({
      where: { uhid }
    });
    if (!existing) {
      isUnique = true;
    }
  }
  return uhid;
};

const getPatients = async (req, res) => {
  const { search, clinicId, page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  try {
    let where = {};

    if (clinicId) {
      where.clinicId = parseInt(clinicId);
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { uhid: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [patients, total] = await prisma.$transaction([
      prisma.patient.findMany({
        where,
        include: { clinic: true },
        orderBy: { name: 'asc' },
        skip,
        take
      }),
      prisma.patient.count({ where })
    ]);

    // Format output
    const formatted = patients.map(p => ({
      id: p.id,
      uhid: p.uhid,
      namePrefix: p.namePrefix,
      name: p.name,
      dateOfBirth: p.dateOfBirth.toISOString().split('T')[0],
      gender: p.gender,
      parentName: p.parentName,
      motherName: p.motherName,
      mobile: p.mobile,
      email: p.email,
      address: p.address,
      birthWeight: p.birthWeight,
      currentWeight: p.currentWeight,
      bloodGroup: p.bloodGroup,
      photoUrl: p.photoUrl,
      clinicId: p.clinicId,
      clinicName: p.clinic.name,
      clinic: p.clinic,
      visitType: p.visitType,
      nicuDetails: p.nicuDetails,
      createdAt: p.createdAt
    }));

    return res.json({
      patients: formatted,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / take)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error fetching patients' });
  }
};

const getPatient = async (req, res) => {
  const { id } = req.params;
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: parseInt(id) },
      include: { clinic: true }
    });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    return res.json({
      id: patient.id,
      uhid: patient.uhid,
      namePrefix: patient.namePrefix,
      name: patient.name,
      dateOfBirth: patient.dateOfBirth.toISOString().split('T')[0],
      gender: patient.gender,
      parentName: patient.parentName,
      motherName: patient.motherName,
      mobile: patient.mobile,
      email: patient.email,
      address: patient.address,
      birthWeight: patient.birthWeight,
      currentWeight: patient.currentWeight,
      bloodGroup: patient.bloodGroup,
      photoUrl: patient.photoUrl,
      clinicId: patient.clinicId,
      clinicName: patient.clinic.name,
      clinic: patient.clinic,
      visitType: patient.visitType,
      nicuDetails: patient.nicuDetails,
      createdAt: patient.createdAt
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error fetching patient' });
  }
};

const registerPatient = async (req, res) => {
  const {
    namePrefix,
    name,
    dateOfBirth,
    gender,
    parentName,
    motherName,
    mobile,
    email,
    address,
    birthWeight,
    currentWeight,
    bloodGroup,
    clinicId,
    visitType
  } = req.body;

  if (!name || !dateOfBirth || !gender || !parentName || !mobile || !clinicId) {
    return res.status(400).json({ error: 'Required fields missing: name, dateOfBirth, gender, parentName, mobile, clinicId' });
  }

  try {
    const dobDate = new Date(dateOfBirth);
    if (dobDate > new Date()) {
      return res.status(400).json({ error: 'Date of birth cannot be in the future' });
    }

    const crypto = require('crypto');
    const patientUuid = crypto.randomUUID();
    const uhid = await generateUHID();
    const registrationDate = new Date();

    // Create patient
    const patient = await prisma.patient.create({
      data: {
        uhid,
        uuid: patientUuid,
        namePrefix: namePrefix || '',
        name,
        dateOfBirth: dobDate,
        gender,
        parentName,
        motherName: motherName || '',
        mobile,
        email: email || null,
        address: address || '',
        birthWeight: parseFloat(birthWeight) || 0,
        currentWeight: parseFloat(currentWeight) || 0,
        bloodGroup: bloodGroup || null,
        clinicId: parseInt(clinicId),
        visitType: visitType || 'Normal OPD visit',
        nicuDetails: null
      }
    });

    // Generate complete vaccine schedule based on vaccine_master
    const vaccineMasters = await prisma.vaccineMaster.findMany({
      orderBy: { displayOrder: 'asc' }
    });

    const vaccinationsData = vaccineMasters.map((vm) => {
      // Calculate due date
      const dueDate = new Date(dobDate);
      dueDate.setDate(dueDate.getDate() + vm.recommendedAgeDays);

      // Determine if it falls before the registration date (today)
      const isPast = dueDate < registrationDate;

      return {
        patientId: patient.id,
        vaccineMasterId: vm.id,
        category: vm.category,
        dueDate,
        status: isPast ? 'given' : 'not_given',
        autoCompleted: isPast,
        dateGiven: isPast ? registrationDate : null,
        notes: isPast ? 'Auto completed because patient registered late.' : null
      };
    });

    await prisma.vaccination.createMany({
      data: vaccinationsData
    });

    // Seed initial growth record
    await prisma.growthRecord.create({
      data: {
        patientId: patient.id,
        recordDate: dobDate,
        weight: parseFloat(birthWeight) || 0,
        notes: 'Birth weight'
      }
    });

    // Schedule WhatsApp Registration welcome message (waiting exactly 15 seconds)
    // and schedule vaccination reminders (14 days, 7 days, 1 day before due date)
    const { scheduleRegistrationReminder, scheduleVaccinationReminders } = require('../services/whatsappScheduler');
    
    // Run the scheduler asynchronously to avoid blocking the API response
    scheduleRegistrationReminder(patient)
      .catch(err => console.error('[Registration] Failed to schedule welcome reminder:', err.message));

    // Get the complete schedule we just created to schedule reminders
    prisma.vaccination.findMany({
      where: { patientId: patient.id }
    })
    .then((vaccinations) => {
      return scheduleVaccinationReminders(patient, vaccinations);
    })
    .catch((err) => {
      console.error('[Registration] Failed to schedule vaccination reminders:', err.message);
    });

    return res.status(201).json({
      id: patient.id,
      uhid: patient.uhid,
      uuid: patient.uuid,
      namePrefix: patient.namePrefix,
      name: patient.name,
      dateOfBirth: patient.dateOfBirth.toISOString().split('T')[0],
      gender: patient.gender,
      parentName: patient.parentName,
      motherName: patient.motherName,
      mobile: patient.mobile,
      email: patient.email,
      address: patient.address,
      birthWeight: patient.birthWeight,
      currentWeight: patient.currentWeight,
      bloodGroup: patient.bloodGroup,
      clinicId: patient.clinicId,
      visitType: patient.visitType,
      nicuDetails: patient.nicuDetails,
      createdAt: patient.createdAt
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error registering patient' });
  }
};

const updatePatient = async (req, res) => {
  const { id } = req.params;
  const {
    namePrefix,
    name,
    parentName,
    motherName,
    mobile,
    email,
    address,
    bloodGroup,
    currentWeight,
    visitType,
    nicuDetails
  } = req.body;

  try {
    const updated = await prisma.patient.update({
      where: { id: parseInt(id) },
      data: {
        namePrefix,
        name,
        parentName,
        motherName,
        mobile,
        email: email || null,
        address,
        bloodGroup: bloodGroup !== undefined ? (bloodGroup || null) : undefined,
        currentWeight: currentWeight ? parseFloat(currentWeight) : undefined,
        visitType,
        nicuDetails
      },
      include: {
        clinic: true
      }
    });

    return res.json({
      id: updated.id,
      uhid: updated.uhid,
      namePrefix: updated.namePrefix,
      name: updated.name,
      dateOfBirth: updated.dateOfBirth.toISOString().split('T')[0],
      gender: updated.gender,
      parentName: updated.parentName,
      motherName: updated.motherName,
      mobile: updated.mobile,
      email: updated.email,
      address: updated.address,
      birthWeight: updated.birthWeight,
      currentWeight: updated.currentWeight,
      bloodGroup: updated.bloodGroup,
      clinicId: updated.clinicId,
      clinicName: updated.clinic.name,
      clinic: updated.clinic,
      visitType: updated.visitType,
      nicuDetails: updated.nicuDetails,
      createdAt: updated.createdAt
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error updating patient' });
  }
};

const deletePatient = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.patient.delete({
      where: { id: parseInt(id) }
    });
    return res.json({ success: true, message: 'Patient deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error deleting patient' });
  }
};

const getPatientByUUID = async (req, res) => {
  const { uuid } = req.params;

  try {
    const patient = await prisma.patient.findUnique({
      where: { uuid },
      include: { clinic: true }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Get vaccinations
    const vaccinations = await prisma.vaccination.findMany({
      where: { patientId: patient.id },
      include: { vaccineMaster: true },
      orderBy: [
        { vaccineMaster: { displayOrder: 'asc' } },
        { dueDate: 'asc' },
        { id: 'asc' }
      ]
    });

    const formattedVaccinations = vaccinations.map(v => ({
      id: v.id,
      patientId: v.patientId,
      vaccineMasterId: v.vaccineMasterId,
      vaccineName: v.vaccineMaster.vaccineName,
      ageLabel: v.vaccineMaster.ageLabel,
      recommendedAgeDays: v.vaccineMaster.recommendedAgeDays,
      displayOrder: v.vaccineMaster.displayOrder,
      category: v.category,
      vaccineMasterCategory: v.vaccineMaster.category,
      dueDate: v.dueDate.toISOString().split('T')[0],
      dateGiven: v.dateGiven ? v.dateGiven.toISOString().split('T')[0] : null,
      brand: v.brand,
      batchNumber: v.batchNumber,
      notes: v.notes,
      status: v.status,
      autoCompleted: v.autoCompleted,
      createdAt: v.createdAt
    }));

    // Calculate vaccination summary
    const completed = vaccinations.filter(v => v.status === 'given').length;
    const pending = vaccinations.filter(v => v.status === 'not_given').length;
    const nextDueVaccine = vaccinations
      .filter(v => v.status === 'not_given')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

    const summary = {
      completed,
      pending,
      nextDue: nextDueVaccine ? nextDueVaccine.dueDate : null,
      nextVaccineName: nextDueVaccine ? nextDueVaccine.vaccineMaster.vaccineName : null
    };

    // Format patient
    const formattedPatient = {
      id: patient.id,
      uhid: patient.uhid,
      namePrefix: patient.namePrefix,
      name: patient.name,
      dateOfBirth: patient.dateOfBirth.toISOString().split('T')[0],
      gender: patient.gender,
      parentName: patient.parentName,
      motherName: patient.motherName,
      mobile: patient.mobile,
      email: patient.email,
      address: patient.address,
      birthWeight: patient.birthWeight,
      currentWeight: patient.currentWeight,
      bloodGroup: patient.bloodGroup,
      photoUrl: patient.photoUrl,
      clinicId: patient.clinicId,
      clinicName: patient.clinic.name,
      clinic: patient.clinic,
      visitType: patient.visitType,
      nicuDetails: patient.nicuDetails,
      createdAt: patient.createdAt,
      uuid: patient.uuid
    };

    return res.json({
      patient: formattedPatient,
      vaccinations: formattedVaccinations,
      summary
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error fetching public records' });
  }
};

module.exports = {
  getPatients,
  getPatient,
  registerPatient,
  updatePatient,
  deletePatient,
  getPatientByUUID
};
