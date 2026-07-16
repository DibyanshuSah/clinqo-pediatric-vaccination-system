const prisma = require('../config/db');

const getVaccinations = async (req, res) => {
  const { id } = req.params;
  const { search, category, status } = req.query;

  try {
    let where = {
      patientId: parseInt(id)
    };

    if (category && category !== 'all') {
      where.category = category;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.vaccineMaster = {
        vaccineName: {
          contains: search,
          mode: 'insensitive'
        }
      };
    }

    const vaccinations = await prisma.vaccination.findMany({
      where,
      include: {
        vaccineMaster: true
      },
      orderBy: [
        { vaccineMaster: { displayOrder: 'asc' } },
        { dueDate: 'asc' },
        { id: 'asc' }
      ]
    });

    const formatted = vaccinations.map(v => ({
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

    return res.json(formatted);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error fetching patient vaccinations' });
  }
};

const getVaccinationSummary = async (req, res) => {
  const { id } = req.params;

  try {
    const total = await prisma.vaccination.count({
      where: { patientId: parseInt(id) }
    });

    const completed = await prisma.vaccination.count({
      where: { patientId: parseInt(id), status: 'given' }
    });

    const pending = await prisma.vaccination.count({
      where: { patientId: parseInt(id), status: 'not_given' }
    });

    // Overdue is always 0
    const overdue = 0;

    const nextVaccine = await prisma.vaccination.findFirst({
      where: {
        patientId: parseInt(id),
        status: 'not_given'
      },
      orderBy: {
        dueDate: 'asc'
      },
      include: {
        vaccineMaster: true
      }
    });

    return res.json({
      total,
      completed,
      pending,
      overdue,
      nextDue: nextVaccine ? nextVaccine.dueDate.toISOString().split('T')[0] : null,
      nextVaccineName: nextVaccine ? nextVaccine.vaccineMaster.vaccineName : null
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error fetching vaccination summary' });
  }
};

const bulkMarkGiven = async (req, res) => {
  const { id } = req.params;
  const { dateGiven } = req.body;

  if (!dateGiven) {
    return res.status(400).json({ error: 'dateGiven is required' });
  }

  try {
    const givenDate = new Date(dateGiven);
    
    // Find all not_given vaccines first to get their names
    const pendingVaccines = await prisma.vaccination.findMany({
      where: {
        patientId: parseInt(id),
        status: 'not_given'
      },
      include: {
        vaccineMaster: true
      }
    });

    if (pendingVaccines.length > 0) {
      const vaccineNamesStr = pendingVaccines.map(v => v.vaccineMaster.vaccineName).join(', ');

      // Update all not_given vaccines for this patient to given
      const result = await prisma.vaccination.updateMany({
        where: {
          patientId: parseInt(id),
          status: 'not_given'
        },
        data: {
          status: 'given',
          dateGiven: givenDate,
          notes: 'Bulk marked as given'
        }
      });

      // Schedule Vaccination Completed Reminder (waiting exactly 1 hour, consolidated automatically)
      const { scheduleVaccinationCompletedReminder } = require('../services/whatsappScheduler');
      for (const v of pendingVaccines) {
        scheduleVaccinationCompletedReminder(parseInt(id), v.id)
          .catch(err => console.error('[BulkMarkGiven] Failed to schedule vaccination completed reminder:', err.message));
      }

      return res.json({
        updated: result.count
      });
    }

    return res.json({
      updated: 0
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error bulk updating vaccinations' });
  }
};

const updateVaccination = async (req, res) => {
  const { id, vaccinationId } = req.params;
  const { status, dueDate, dateGiven, brand, batchNumber, notes, category } = req.body;

  try {
    const dataToUpdate = {};
    if (status) dataToUpdate.status = status;
    if (dueDate) dataToUpdate.dueDate = new Date(dueDate);
    
    if (dateGiven !== undefined) {
      dataToUpdate.dateGiven = dateGiven ? new Date(dateGiven) : null;
    } else if (status === 'given') {
      dataToUpdate.dateGiven = new Date();
    } else if (status === 'not_given') {
      dataToUpdate.dateGiven = null;
    }

    if (brand !== undefined) dataToUpdate.brand = brand;
    if (batchNumber !== undefined) dataToUpdate.batchNumber = batchNumber;
    if (notes !== undefined) dataToUpdate.notes = notes;
    if (category !== undefined) dataToUpdate.category = category;

    const updated = await prisma.vaccination.update({
      where: {
        id: parseInt(vaccinationId),
        patientId: parseInt(id)
      },
      data: dataToUpdate,
      include: {
        vaccineMaster: true
      }
    });

    // Send the administered WhatsApp notification if status changed to 'given'
    if (status === 'given') {
      const { scheduleVaccinationCompletedReminder } = require('../services/whatsappScheduler');
      scheduleVaccinationCompletedReminder(parseInt(id), updated.id)
        .catch(err => console.error('[UpdateVaccination] Failed to schedule completed reminder:', err.message));
    }

    // Reschedule reminders if due date is changed and status is still not_given
    if (dueDate && updated.status === 'not_given') {
      const { rescheduleSingleVaccinationReminders } = require('../services/whatsappScheduler');
      rescheduleSingleVaccinationReminders(parseInt(id), updated.id)
        .catch(err => console.error('[UpdateVaccination] Failed to reschedule reminders:', err.message));
    }

    return res.json({
      id: updated.id,
      patientId: updated.patientId,
      vaccineMasterId: updated.vaccineMasterId,
      vaccineName: updated.vaccineMaster.vaccineName,
      ageLabel: updated.vaccineMaster.ageLabel,
      recommendedAgeDays: updated.vaccineMaster.recommendedAgeDays,
      displayOrder: updated.vaccineMaster.displayOrder,
      category: updated.category,
      dueDate: updated.dueDate.toISOString().split('T')[0],
      dateGiven: updated.dateGiven ? updated.dateGiven.toISOString().split('T')[0] : null,
      brand: updated.brand,
      batchNumber: updated.batchNumber,
      notes: updated.notes,
      status: updated.status,
      createdAt: updated.createdAt
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error updating vaccination' });
  }
};

module.exports = {
  getVaccinations,
  getVaccinationSummary,
  bulkMarkGiven,
  updateVaccination
};
