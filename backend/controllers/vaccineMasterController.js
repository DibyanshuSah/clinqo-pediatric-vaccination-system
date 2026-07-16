const prisma = require('../config/db');

const getVaccines = async (req, res) => {
  try {
    const vaccines = await prisma.vaccineMaster.findMany({
      orderBy: { displayOrder: 'asc' }
    });
    return res.json(vaccines);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error fetching vaccine master list' });
  }
};

const createVaccine = async (req, res) => {
  const { vaccineName, ageLabel, category, recommendedAgeDays, displayOrder } = req.body;

  if (!vaccineName || !ageLabel || !category || recommendedAgeDays === undefined) {
    return res.status(400).json({ error: 'Required fields missing: vaccineName, ageLabel, category, recommendedAgeDays' });
  }

  try {
    // If displayOrder not specified, set it to max + 1
    let order = displayOrder;
    if (order === undefined) {
      const maxOrderObj = await prisma.vaccineMaster.findFirst({
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true }
      });
      order = maxOrderObj ? maxOrderObj.displayOrder + 1 : 1;
    }

    const newVaccine = await prisma.vaccineMaster.create({
      data: {
        vaccineName,
        ageLabel,
        category,
        recommendedAgeDays: parseInt(recommendedAgeDays),
        displayOrder: parseInt(order)
      }
    });

    return res.status(201).json(newVaccine);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error creating vaccine master record' });
  }
};

const updateVaccine = async (req, res) => {
  const { id } = req.params;
  const { vaccineName, ageLabel, category, recommendedAgeDays, displayOrder } = req.body;

  try {
    const dataToUpdate = {};
    if (vaccineName !== undefined) dataToUpdate.vaccineName = vaccineName;
    if (ageLabel !== undefined) dataToUpdate.ageLabel = ageLabel;
    if (category !== undefined) dataToUpdate.category = category;
    if (recommendedAgeDays !== undefined) dataToUpdate.recommendedAgeDays = parseInt(recommendedAgeDays);
    if (displayOrder !== undefined) dataToUpdate.displayOrder = parseInt(displayOrder);

    const updated = await prisma.vaccineMaster.update({
      where: { id: parseInt(id) },
      data: dataToUpdate
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error updating vaccine master record' });
  }
};

const deleteVaccine = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.vaccineMaster.delete({
      where: { id: parseInt(id) }
    });
    return res.json({ success: true, message: 'Vaccine master record deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error deleting vaccine master record' });
  }
};

module.exports = {
  getVaccines,
  createVaccine,
  updateVaccine,
  deleteVaccine
};
