const prisma = require('../config/db');
const { sendTemplateMessage } = require('./whatsappService');

/**
 * Format a Date object to DD/MM/YYYY format
 * @param {Date} date 
 * @returns {string} Formatted date
 */
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Format a Date object to "DD Month YYYY" format (e.g., 06 June 2026)
 * @param {Date} date 
 * @returns {string} Formatted date
 */
const formatCustomDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * Schedule the welcome registration WhatsApp template message
 * To run exactly 15 seconds after registration.
 */
const scheduleRegistrationReminder = async (patient) => {
  const scheduledAt = new Date(Date.now() + 15 * 1000); // exactly 15 seconds later
  const templateName = process.env.WHATSAPP_TEMPLATE_REGISTRATION || 'appointment_confirmation_1';
  const clinic = await prisma.clinic.findUnique({ where: { id: patient.clinicId } });
  const clinicName = clinic ? clinic.name : 'KiddosCare Clinic';
  const clinicPhone = clinic ? clinic.phone : '999XXXXXXXXXX';

  const doctor = await prisma.user.findFirst({ where: { role: 'doctor' } });
  const doctorName = doctor ? doctor.name : 'Dr. Shubha Sandeep Mahanty';
  const registrationDateStr = formatCustomDate(patient.createdAt || new Date());

  const templateParams = {
    parentName: patient.parentName,
    childName: patient.name,
    registrationDate: registrationDateStr,
    doctorName,
    clinicPhone
  };

  const messagePreview = `Welcome template scheduled for ${patient.parentName} (${patient.name}) at clinic ${clinicName}`;

  await prisma.reminder.create({
    data: {
      patientId: patient.id,
      type: 'registration',
      channel: 'whatsapp',
      status: 'scheduled',
      scheduledAt,
      message: messagePreview,
      templateName,
      templateParams: JSON.stringify(templateParams)
    }
  });

  console.log(`[Scheduler] Scheduled registration welcome template for Patient ID ${patient.id} at ${scheduledAt.toISOString()}`);
};

/**
 * Schedule vaccination reminders for all 'not_given' vaccinations of a patient.
 * Reminders are scheduled at:
 * - 14 days before due date
 * - 7 days before due date
 * - 1 day before due date
 */
const scheduleVaccinationReminders = async (patient, vaccinations) => {
  const now = new Date();
  const templateName = process.env.WHATSAPP_TEMPLATE_REMINDER || 'vaccination_reminder_1';
  const clinic = await prisma.clinic.findUnique({ where: { id: patient.clinicId } });
  const clinicPhone = clinic ? clinic.phone : '999XXXXXXXXXX';
  const clinicName = clinic ? clinic.name : 'KiddosCare Clinic';
  
  const frontendUrl = process.env.WHATSAPP_FRONTEND_URL || 'http://localhost:5173';
  const uniqueLink = `${frontendUrl}/patient/${patient.id}/uuid=${patient.uuid || ''}`;

  const doctor = await prisma.user.findFirst({ where: { role: 'doctor' } });
  const doctorName = doctor ? doctor.name : 'Dr. Shubha Sandeep Mahanty';

  for (const v of vaccinations) {
    if (v.status !== 'not_given') continue;

    // We need to fetch vaccine master details to get the vaccine name if not included
    let vaccineName = v.vaccineName;
    if (!vaccineName && v.vaccineMasterId) {
      const vm = await prisma.vaccineMaster.findUnique({ where: { id: v.vaccineMasterId } });
      vaccineName = vm ? vm.vaccineName : 'Vaccine';
    }

    const dueDate = new Date(v.dueDate);
    
    // Define the reminder offsets
    const reminderOffsets = [
      { days: 14, type: '14_days_before' },
      { days: 7, type: '7_days_before' },
      { days: 1, type: '1_day_before' }
    ];

    for (const offset of reminderOffsets) {
      // Calculate scheduled date (offset days before due date)
      const scheduledAt = new Date(dueDate);
      scheduledAt.setDate(scheduledAt.getDate() - offset.days);
      
      // Set to 9:00 AM local time for sending reminder
      scheduledAt.setHours(9, 0, 0, 0);

      // Only schedule if the date is in the future
      if (scheduledAt > now) {
        const templateParams = {
          parentName: patient.parentName,
          childName: patient.name,
          vaccineName,
          dueDate: formatCustomDate(dueDate),
          doctorName,
          clinicName,
          uniqueLink,
          clinicPhone
        };

        const messagePreview = `Vaccine reminder (${offset.type}): ${vaccineName} due on ${formatCustomDate(dueDate)}`;

        // Check if reminder of this type for this vaccination already exists to prevent duplicate scheduling
        const existing = await prisma.reminder.findFirst({
          where: {
            patientId: patient.id,
            vaccinationId: v.id,
            type: offset.type
          }
        });

        if (!existing) {
          await prisma.reminder.create({
            data: {
              patientId: patient.id,
              vaccinationId: v.id,
              type: offset.type,
              channel: 'whatsapp',
              status: 'scheduled',
              scheduledAt,
              message: messagePreview,
              templateName,
              templateParams: JSON.stringify(templateParams)
            }
          });
        }
      }
    }
  }
  console.log(`[Scheduler] Scheduled reminders for Patient ID ${patient.id}`);
};

/**
 * Schedule or update the Vaccination Completed Reminder
 * To run exactly 30 seconds after vaccination status is updated to COMPLETED (given).
 * If multiple vaccinations are completed within the 30-second window, they are grouped.
 */
const scheduleVaccinationCompletedReminder = async (patientId, vaccinationId) => {
  const now = new Date();
  const scheduledAt = new Date(now.getTime() + 30 * 1000); // exactly 30 seconds later
  const templateName = process.env.WHATSAPP_TEMPLATE_COMPLETED || 'vaccination_successful_1';

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { clinic: true }
  });
  if (!patient) return;

  const vaccination = await prisma.vaccination.findUnique({
    where: { id: vaccinationId },
    include: { vaccineMaster: true }
  });
  if (!vaccination) return;

  // Retrieve all vaccines of that particular age group
  const ageLabel = vaccination.vaccineMaster.ageLabel;
  const sameAgeVaccines = await prisma.vaccineMaster.findMany({
    where: { ageLabel },
    orderBy: { displayOrder: 'asc' }
  });
  const vaccineName = sameAgeVaccines.map(vm => vm.vaccineName).join(', ');

  const clinicPhone = patient.clinic ? patient.clinic.phone : '999XXXXXXXXXX';
  const clinicName = patient.clinic ? patient.clinic.name : 'KiddosCare Clinic';
  const frontendUrl = process.env.WHATSAPP_FRONTEND_URL || 'http://localhost:5173';
  const uniqueLink = `${frontendUrl}/patient/${patient.id}/uuid=${patient.uuid || ''}`;
  const dateStr = formatCustomDate(vaccination.dateGiven || now);

  const doctor = await prisma.user.findFirst({ where: { role: 'doctor' } });
  const doctorName = doctor ? doctor.name : 'Dr. Shubha Sandeep Mahanty';

  // Look for an existing scheduled 'administered' reminder for this patient in the next 45 seconds
  const existingReminder = await prisma.reminder.findFirst({
    where: {
      patientId,
      type: 'administered',
      status: 'scheduled',
      scheduledAt: {
        gte: now,
        lte: new Date(now.getTime() + 45 * 1000) // look slightly ahead to be safe
      }
    }
  });

  if (existingReminder) {
    // If it exists, group them! Parse the template params, consolidate unique vaccine names
    try {
      const params = JSON.parse(existingReminder.templateParams);
      
      const currentVaccines = params.vaccineName.split(', ').map(v => v.trim());
      const newVaccines = vaccineName.split(', ').map(v => v.trim());
      
      // Merge unique names
      const consolidatedList = Array.from(new Set([...currentVaccines, ...newVaccines])).join(', ');
      params.vaccineName = consolidatedList;
      
      // Update message preview
      const updatedPreview = `Consolidated vaccine completed message for: ${params.vaccineName}`;

      await prisma.reminder.update({
        where: { id: existingReminder.id },
        data: {
          message: updatedPreview,
          templateParams: JSON.stringify(params)
        }
      });
      console.log(`[Scheduler] Grouped vaccines ${vaccineName} into existing scheduled reminder ID ${existingReminder.id}`);
    } catch (err) {
      console.error('[Scheduler] Error grouping completed reminder params:', err);
    }
  } else {
    // Create new scheduled completed reminder with the full age group list
    const templateParams = {
      parentName: patient.parentName,
      childName: patient.name,
      vaccineName,
      dateGiven: dateStr,
      doctorName,
      clinicName,
      uniqueLink,
      clinicPhone
    };

    const messagePreview = `Vaccine completed message for: ${vaccineName}`;

    await prisma.reminder.create({
      data: {
        patientId,
        vaccinationId,
        type: 'administered',
        channel: 'whatsapp',
        status: 'scheduled',
        scheduledAt,
        message: messagePreview,
        templateName,
        templateParams: JSON.stringify(templateParams)
      }
    });
    console.log(`[Scheduler] Scheduled completed reminder for Patient ID ${patientId} vaccination ID ${vaccinationId} at ${scheduledAt.toISOString()}`);
  }
};

/**
 * Background worker to run and process pending scheduled reminders.
 */
const runPendingReminders = async () => {
  try {
    const now = new Date();
    // 1. Fetch pending scheduled reminders
    const reminders = await prisma.reminder.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: now },
        retryCount: { lt: 3 }
      },
      include: {
        patient: true
      },
      take: 10 // process small chunks at a time
    });

    if (reminders.length === 0) return;

    console.log(`[Scheduler Worker] Found ${reminders.length} pending reminders to process.`);

    // 2. Lock them to 'processing' to prevent duplicate sending in concurrent contexts
    const idsToLock = reminders.map(r => r.id);
    await prisma.reminder.updateMany({
      where: { id: { in: idsToLock } },
      data: { status: 'processing' }
    });

    // 3. Process each reminder
    for (const reminder of reminders) {
      try {
        // Validation check:
        // For vaccination reminders, do not send if the vaccination is completed or cancelled
        if (['14_days_before', '7_days_before', '1_day_before', '3_days_before', 'due_today', 'upcoming'].includes(reminder.type) && reminder.vaccinationId) {
          const vacc = await prisma.vaccination.findUnique({
            where: { id: reminder.vaccinationId }
          });
          
          // Do not send reminders for completed or cancelled vaccinations
          if (!vacc || vacc.status !== 'not_given') {
            console.log(`[Scheduler Worker] Cancelling reminder ID ${reminder.id} because vaccination ID ${reminder.vaccinationId} is either completed, deleted, or cancelled (Status: ${vacc ? vacc.status : 'deleted'}).`);
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: { status: 'cancelled' }
            });
            continue;
          }
        }

        // Parse template parameters
        let params = {};
        try {
          params = JSON.parse(reminder.templateParams || '{}');
        } catch (e) {
          console.error(`[Scheduler Worker] Failed to parse templateParams JSON for reminder ID ${reminder.id}:`, e.message);
        }

        // Format parameters into standard Meta Cloud API components
        const components = [];
        
        // Add body params if we have any
        if (Object.keys(params).length > 0) {
          const bodyParameters = [];
          
          if (reminder.type === 'registration') {
            bodyParameters.push({ type: 'text', text: params.parentName || '' });
            bodyParameters.push({ type: 'text', text: params.childName || '' });
            bodyParameters.push({ type: 'text', text: params.registrationDate || '' });
            bodyParameters.push({ type: 'text', text: params.doctorName || '' });
            bodyParameters.push({ type: 'text', text: params.clinicPhone || '' });
          } else if (['14_days_before', '7_days_before', '1_day_before', '3_days_before', 'due_today', 'upcoming'].includes(reminder.type)) {
            bodyParameters.push({ type: 'text', text: params.parentName || '' });
            bodyParameters.push({ type: 'text', text: params.childName || '' });
            bodyParameters.push({ type: 'text', text: params.vaccineName || '' });
            bodyParameters.push({ type: 'text', text: params.dueDate || '' });
            bodyParameters.push({ type: 'text', text: params.doctorName || '' });
            bodyParameters.push({ type: 'text', text: params.clinicName || '' });
            bodyParameters.push({ type: 'text', text: params.uniqueLink || '' });
            bodyParameters.push({ type: 'text', text: params.clinicPhone || '' });
          } else if (reminder.type === 'administered') {
            bodyParameters.push({ type: 'text', text: params.parentName || '' });
            bodyParameters.push({ type: 'text', text: params.childName || '' });
            bodyParameters.push({ type: 'text', text: params.vaccineName || '' });
            bodyParameters.push({ type: 'text', text: params.dateGiven || '' });
            bodyParameters.push({ type: 'text', text: params.doctorName || '' });
            bodyParameters.push({ type: 'text', text: params.clinicName || '' });
            bodyParameters.push({ type: 'text', text: params.uniqueLink || '' });
            bodyParameters.push({ type: 'text', text: params.clinicPhone || '' });
          }

          components.push({
            type: 'body',
            parameters: bodyParameters
          });
        }

        console.log(`[Scheduler Worker] Sending template '${reminder.templateName}' to ${reminder.patient.mobile}...`);
        
        // Send using Meta Cloud API
        const langCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US';
        await sendTemplateMessage(
          reminder.patient.mobile,
          reminder.templateName,
          langCode,
          components
        );

        // Success: mark as sent
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: {
            status: 'sent',
            sentAt: new Date()
          }
        });
        console.log(`[Scheduler Worker] Successfully sent reminder ID ${reminder.id}`);

      } catch (sendErr) {
        console.error(`[Scheduler Worker] Error sending WhatsApp reminder ID ${reminder.id}:`, sendErr.message);
        
        const nextRetryCount = reminder.retryCount + 1;
        const willRetry = nextRetryCount < 3;
        
        // Reschedule for a retry in 5 minutes or mark failed
        const updatedStatus = willRetry ? 'scheduled' : 'failed';
        const nextScheduledAt = willRetry ? new Date(Date.now() + 5 * 60 * 1000) : reminder.scheduledAt;

        await prisma.reminder.update({
          where: { id: reminder.id },
          data: {
            status: updatedStatus,
            retryCount: nextRetryCount,
            scheduledAt: nextScheduledAt,
            lastError: sendErr.message
          }
        });
        console.log(`[Scheduler Worker] Reminder ID ${reminder.id} updated status to ${updatedStatus} (Retry: ${nextRetryCount}/3)`);
      }
    }
  } catch (err) {
    console.error('[Scheduler Worker] Critical failure in runPendingReminders:', err.message);
  }
};

/**
 * Start the background worker loop
 */
const startScheduler = () => {
  console.log('----------------------------------------------------');
  console.log('🚀 WhatsApp Reminder System Scheduler Initialized');
  console.log('----------------------------------------------------');
  
  // Run once immediately on startup
  runPendingReminders();

  // Run periodically based on configuration
  const intervalMs = parseInt(process.env.WHATSAPP_SCHEDULER_INTERVAL_MS) || 10000; // default 10 seconds
  setInterval(runPendingReminders, intervalMs);
};

/**
 * Reschedule vaccination reminders for a single vaccination when its due date changes.
 * Deletes existing scheduled reminders for this vaccination and creates new ones.
 */
const rescheduleSingleVaccinationReminders = async (patientId, vaccinationId) => {
  try {
    // 1. Delete existing scheduled reminders for this vaccination
    await prisma.reminder.deleteMany({
      where: {
        patientId: parseInt(patientId),
        vaccinationId: parseInt(vaccinationId),
        status: 'scheduled'
      }
    });

    // 2. Fetch patient and vaccination details
    const patient = await prisma.patient.findUnique({
      where: { id: parseInt(patientId) }
    });
    if (!patient) return;

    const vaccination = await prisma.vaccination.findUnique({
      where: { id: parseInt(vaccinationId) },
      include: { vaccineMaster: true }
    });
    if (!vaccination || vaccination.status !== 'not_given') return;

    // 3. Schedule new reminders using the single vaccination
    await scheduleVaccinationReminders(patient, [vaccination]);
    console.log(`[Scheduler] Rescheduled reminders for Patient ID ${patientId}, Vaccination ID ${vaccinationId}`);
  } catch (err) {
    console.error(`[Scheduler] Failed to reschedule reminders for Vaccination ID ${vaccinationId}:`, err.message);
  }
};

module.exports = {
  scheduleRegistrationReminder,
  scheduleVaccinationReminders,
  scheduleVaccinationCompletedReminder,
  rescheduleSingleVaccinationReminders,
  startScheduler,
  formatCustomDate
};
