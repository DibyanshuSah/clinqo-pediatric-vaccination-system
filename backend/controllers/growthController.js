const prisma = require('../config/db');

const getGrowthRecords = async (req, res) => {
  const { id } = req.params;

  try {
    const records = await prisma.growthRecord.findMany({
      where: { patientId: parseInt(id) },
      orderBy: { recordDate: 'asc' }
    });

    const formatted = records.map(r => ({
      id: r.id,
      patientId: r.patientId,
      recordDate: r.recordDate.toISOString().split('T')[0],
      weight: r.weight,
      height: r.height,
      headCircumference: r.headCircumference,
      bmi: r.bmi,
      notes: r.notes,
      createdAt: r.createdAt
    }));

    return res.json(formatted);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error fetching growth records' });
  }
};

const addGrowthRecord = async (req, res) => {
  const { id } = req.params;
  const { recordDate, date, weight, height, headCircumference, notes } = req.body;

  // Supports both 'recordDate' and 'date'
  const dateStr = recordDate || date;
  if (!dateStr || weight === undefined) {
    return res.status(400).json({ error: 'Date and weight are required' });
  }

  try {
    const w = parseFloat(weight);
    const h = height ? parseFloat(height) : null;
    const hc = headCircumference ? parseFloat(headCircumference) : null;
    
    // Calculate BMI if height and weight are provided
    let bmi = null;
    if (w > 0 && h > 0) {
      const heightInMeters = h / 100;
      bmi = parseFloat((w / (heightInMeters * heightInMeters)).toFixed(1));
    }

    const record = await prisma.growthRecord.create({
      data: {
        patientId: parseInt(id),
        recordDate: new Date(dateStr),
        weight: w,
        height: h,
        headCircumference: hc,
        bmi,
        notes: notes || null
      }
    });

    // Automatically update the patient's currentWeight
    await prisma.patient.update({
      where: { id: parseInt(id) },
      data: { currentWeight: w }
    });

    return res.status(201).json({
      id: record.id,
      patientId: record.patientId,
      recordDate: record.recordDate.toISOString().split('T')[0],
      weight: record.weight,
      height: record.height,
      headCircumference: record.headCircumference,
      bmi: record.bmi,
      notes: record.notes,
      createdAt: record.createdAt
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error adding growth record' });
  }
};

module.exports = {
  getGrowthRecords,
  addGrowthRecord
};
