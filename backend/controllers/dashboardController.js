const prisma = require('../config/db');

const getDashboardStats = async (req, res) => {
  const clinicId = req.query.clinicId ? parseInt(req.query.clinicId) : undefined;

  try {
    const patientWhere = clinicId ? { clinicId } : {};
    
    // 1. Total Patients
    const totalPatients = await prisma.patient.count({
      where: patientWhere
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    sevenDaysLater.setHours(23, 59, 59, 999);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999);

    // Filter patients by clinic first if clinicId is provided
    const patientFilter = clinicId ? { patient: { clinicId } } : {};

    // 2. Vaccines Today (not_given and due today)
    const vaccinesToday = await prisma.vaccination.count({
      where: {
        status: 'not_given',
        dueDate: {
          gte: todayStart,
          lte: todayEnd
        },
        ...patientFilter
      }
    });

    // 3. Upcoming Vaccines (not_given and due in next 7 days, excluding today)
    const upcomingVaccines = await prisma.vaccination.count({
      where: {
        status: 'not_given',
        dueDate: {
          gt: todayEnd,
          lte: sevenDaysLater
        },
        ...patientFilter
      }
    });

    // 4. Overdue Vaccines (completely removed overdue logic, return 0)
    const overdueVaccines = 0;

    // 5. Vaccinated This Month (given and given this month)
    const vaccinatedThisMonth = await prisma.vaccination.count({
      where: {
        status: 'given',
        dateGiven: {
          gte: startOfMonth,
          lte: endOfMonth
        },
        ...patientFilter
      }
    });

    // 6. Next Vaccine Due
    // Find the earliest not_given vaccination
    const earliestPending = await prisma.vaccination.findFirst({
      where: {
        status: 'not_given',
        ...patientFilter
      },
      orderBy: {
        dueDate: 'asc'
      },
      include: {
        patient: true,
        vaccineMaster: true
      }
    });

    let nextVaccineDue = null;
    if (earliestPending) {
      nextVaccineDue = {
        vaccinationId: earliestPending.id,
        patientId: earliestPending.patientId,
        vaccineName: earliestPending.vaccineMaster.vaccineName,
        dueDate: earliestPending.dueDate.toISOString().split('T')[0],
        status: earliestPending.status,
        ageLabel: earliestPending.vaccineMaster.ageLabel,
        patientName: earliestPending.patient.name,
        uhid: earliestPending.patient.uhid,
        mobile: earliestPending.patient.mobile
      };
    }

    return res.json({
      totalPatients,
      vaccinesToday,
      upcomingVaccines,
      overdueVaccines,
      vaccinatedThisMonth,
      nextVaccineDue
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error fetching dashboard stats' });
  }
};

const getUpcomingVaccines = async (req, res) => {
  const days = req.query.days ? parseInt(req.query.days) : 7;
  const clinicId = req.query.clinicId ? parseInt(req.query.clinicId) : undefined;

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const futureEnd = new Date();
    futureEnd.setDate(futureEnd.getDate() + days);
    futureEnd.setHours(23, 59, 59, 999);

    const patientFilter = clinicId ? { patient: { clinicId } } : {};

    const vaccinations = await prisma.vaccination.findMany({
      where: {
        status: 'not_given',
        dueDate: {
          gte: todayStart,
          lte: futureEnd
        },
        ...patientFilter
      },
      orderBy: {
        dueDate: 'asc'
      },
      include: {
        patient: true,
        vaccineMaster: true
      }
    });

    const result = vaccinations.map((v) => ({
      vaccinationId: v.id,
      patientId: v.patientId,
      patientName: v.patient.name,
      uhid: v.patient.uhid,
      vaccineName: v.vaccineMaster.vaccineName,
      dueDate: v.dueDate.toISOString().split('T')[0],
      status: v.status,
      ageLabel: v.vaccineMaster.ageLabel,
      mobile: v.patient.mobile
    }));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error fetching upcoming vaccines' });
  }
};

module.exports = {
  getDashboardStats,
  getUpcomingVaccines
};
