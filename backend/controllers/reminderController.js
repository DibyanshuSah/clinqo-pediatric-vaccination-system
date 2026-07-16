const prisma = require('../config/db');
const { formatCustomDate } = require('../services/whatsappScheduler');

const getReminders = async (req, res) => {
  const { patientId } = req.query;

  if (!patientId) {
    return res.status(400).json({ error: 'patientId is required' });
  }

  try {
    const reminders = await prisma.reminder.findMany({
      where: { patientId: parseInt(patientId) },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(reminders);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error fetching reminders' });
  }
};

const getDueReminders = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all not_given vaccinations due in the future
    const pendingVaccinations = await prisma.vaccination.findMany({
      where: {
        status: 'not_given',
        dueDate: {
          gte: today
        }
      },
      include: {
        vaccineMaster: true,
        patient: {
          include: {
            clinic: true
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    // Group vaccinations by patient and due date
    const groups = {};
    for (const v of pendingVaccinations) {
      const dueDateKey = v.dueDate.toISOString().split('T')[0];
      const key = `${v.patientId}_${dueDateKey}`;
      if (!groups[key]) {
        groups[key] = {
          patient: v.patient,
          dueDate: v.dueDate,
          vaccinations: [],
          vaccineNames: []
        };
      }
      groups[key].vaccinations.push(v);
      groups[key].vaccineNames.push(v.vaccineMaster.vaccineName);
    }

    const dueReminders = [];

    const doctor = await prisma.user.findFirst({ where: { role: 'doctor' } });
    const doctorName = doctor ? doctor.name : 'Dr. Shubha Sandeep Mahanty';

    for (const key in groups) {
      const group = groups[key];
      const patient = group.patient;
      const dueDateStr = group.dueDate.toISOString().split('T')[0];
      const vaccineListStr = group.vaccineNames.join(', ');

      const vDueDate = new Date(group.dueDate);
      vDueDate.setHours(0, 0, 0, 0);

      let reminderType = null;
      let diffDays = Math.ceil((vDueDate - today) / (1000 * 60 * 60 * 24));

      if (diffDays === 7) {
        reminderType = '7_days_before';
      } else if (diffDays === 3) {
        reminderType = '3_days_before';
      } else if (diffDays === 0) {
        reminderType = 'due_today';
      } else if (diffDays > 0 && diffDays < 7) {
        reminderType = 'upcoming';
      }

      if (reminderType) {
        const vIds = group.vaccinations.map(v => v.id);
        
        // Check if a reminder of this type already exists for this patient and vaccination set
        let reminder = await prisma.reminder.findFirst({
          where: {
            patientId: patient.id,
            type: reminderType,
            vaccinationId: { in: vIds }
          }
        });

        const clinicPhone = patient.clinic.phone;
        const clinicName = patient.clinic.name;
        const frontendUrl = process.env.WHATSAPP_FRONTEND_URL || 'http://localhost:5173';
        const uniqueLink = `${frontendUrl}/patient/${patient.id}/uuid=${patient.uuid || ''}`;

        const formattedDueDate = formatCustomDate(vDueDate);
        const templateName = process.env.WHATSAPP_TEMPLATE_REMINDER || 'vaccination_reminder_1';

        const templateParams = {
          parentName: patient.parentName,
          childName: patient.name,
          vaccineName: vaccineListStr,
          dueDate: formattedDueDate,
          doctorName,
          clinicName,
          uniqueLink,
          clinicPhone
        };

        const message = `🩺 *KIDDOSCARE Vaccination Reminder*\nDear ${patient.parentName},\n\nThis is a reminder from *${doctorName}* that ${patient.name} is scheduled for the following vaccination.\n\n💉 Vaccine: ${vaccineListStr}\n📅 Vaccination Date: ${formattedDueDate}\n🏥 Clinic: *${clinicName}*\n\nCertificate Link: ${uniqueLink}\n\nPlease visit the clinic on the scheduled date to keep your child's immunisation on track.\nFor appointments or assistance, contact us at ${clinicPhone}.\n\nThank you.\n– KIDDOSCARE`;

        if (!reminder) {
          // Create reminder record in the database, associate it with the first vaccination in the group
          reminder = await prisma.reminder.create({
            data: {
              patientId: patient.id,
              vaccinationId: vIds[0],
              type: reminderType,
              channel: 'whatsapp',
              status: 'scheduled',
              scheduledAt: new Date(),
              message,
              templateName,
              templateParams: JSON.stringify(templateParams)
            }
          });
        }

        dueReminders.push({
          id: reminder.id,
          patientId: patient.id,
          vaccinationId: vIds[0],
          type: reminderType,
          status: reminder.status,
          patientName: patient.name,
          parentName: patient.parentName,
          vaccineName: vaccineListStr,
          dueDate: dueDateStr,
          mobile: patient.mobile,
          message: reminder.message,
          scheduledAt: reminder.scheduledAt,
          sentAt: reminder.sentAt
        });
      }
    }

    return res.json(dueReminders);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error fetching due reminders' });
  }
};

const sendReminder = async (req, res) => {
  const { id } = req.params;

  try {
    // Find the reminder and include patient details to get the mobile number
    const reminder = await prisma.reminder.findUnique({
      where: { id: parseInt(id) },
      include: { patient: { include: { clinic: true } } }
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    // Attempt to send via WhatsApp Service
    const { sendTemplateMessage, sendTextMessage } = require('../services/whatsappService');
    let status = 'sent';
    let errorMessage = null;

    try {
      if (reminder.templateName) {
        // Parse template parameters
        let params = {};
        try {
          params = typeof reminder.templateParams === 'string'
            ? JSON.parse(reminder.templateParams)
            : (reminder.templateParams || {});
        } catch (e) {
          console.error(`Failed to parse templateParams JSON for reminder ID ${reminder.id}:`, e.message);
        }

        // Format parameters into standard Meta Cloud API components
        const components = [];
        
        if (Object.keys(params).length > 0) {
          const bodyParameters = [];
          
          if (reminder.templateName === 'appointment_confirmation_1') {
            bodyParameters.push({ type: 'text', text: params.parentName || '' });
            bodyParameters.push({ type: 'text', text: params.childName || '' });
            bodyParameters.push({ type: 'text', text: params.registrationDate || '' });
            bodyParameters.push({ type: 'text', text: params.doctorName || '' });
            bodyParameters.push({ type: 'text', text: params.clinicPhone || '' });
          } else if (reminder.templateName === 'vaccination_reminder_1') {
            bodyParameters.push({ type: 'text', text: params.parentName || '' });
            bodyParameters.push({ type: 'text', text: params.childName || '' });
            bodyParameters.push({ type: 'text', text: params.vaccineName || '' });
            bodyParameters.push({ type: 'text', text: params.dueDate || '' });
            bodyParameters.push({ type: 'text', text: params.doctorName || '' });
            bodyParameters.push({ type: 'text', text: params.clinicName || '' });
            bodyParameters.push({ type: 'text', text: params.uniqueLink || '' });
            bodyParameters.push({ type: 'text', text: params.clinicPhone || '' });
          } else if (reminder.templateName === 'vaccination_successful_1') {
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

        const langCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US';
        await sendTemplateMessage(
          reminder.patient.mobile,
          reminder.templateName,
          langCode,
          components
        );
      } else {
        // Fallback to text message
        await sendTextMessage(reminder.patient.mobile, reminder.message);
      }
    } catch (wsErr) {
      console.error(`WhatsApp send failed for reminder ID ${id}:`, wsErr.message);
      status = 'failed';
      errorMessage = wsErr.message;
    }

    const updatedReminder = await prisma.reminder.update({
      where: { id: parseInt(id) },
      data: {
        status,
        sentAt: status === 'sent' ? new Date() : null,
        lastError: errorMessage
      }
    });

    if (status === 'failed') {
      return res.status(500).json({ error: 'Failed to send WhatsApp message', reminder: updatedReminder });
    }

    return res.json({ success: true, reminder: updatedReminder });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error sending reminder' });
  }
};

const createManualReminder = async (req, res) => {
  const { patientId, vaccinationId, type, message, templateName, templateParams } = req.body;

  if (!patientId || !type) {
    return res.status(400).json({ error: 'patientId and type are required' });
  }

  try {
    // Fetch patient details to get their phone number
    const patient = await prisma.patient.findUnique({
      where: { id: parseInt(patientId) },
      include: { clinic: true }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Attempt to send via WhatsApp Service
    const { sendTemplateMessage, sendTextMessage } = require('../services/whatsappService');
    let status = 'sent';
    let errorMessage = null;

    try {
      if (templateName) {
        // Parse components
        const components = [];
        let params = {};
        if (typeof templateParams === 'object') {
          params = templateParams;
        } else if (typeof templateParams === 'string') {
          try {
            params = JSON.parse(templateParams);
          } catch (e) {
            console.error('Failed to parse templateParams JSON:', e.message);
          }
        }

        if (Object.keys(params).length > 0) {
          const bodyParameters = [];
          
          if (templateName === 'appointment_confirmation_1') {
            bodyParameters.push({ type: 'text', text: params.parentName || '' });
            bodyParameters.push({ type: 'text', text: params.childName || '' });
            bodyParameters.push({ type: 'text', text: params.registrationDate || '' });
            bodyParameters.push({ type: 'text', text: params.doctorName || '' });
            bodyParameters.push({ type: 'text', text: params.clinicPhone || '' });
          } else if (templateName === 'vaccination_reminder_1') {
            bodyParameters.push({ type: 'text', text: params.parentName || '' });
            bodyParameters.push({ type: 'text', text: params.childName || '' });
            bodyParameters.push({ type: 'text', text: params.vaccineName || '' });
            bodyParameters.push({ type: 'text', text: params.dueDate || '' });
            bodyParameters.push({ type: 'text', text: params.doctorName || '' });
            bodyParameters.push({ type: 'text', text: params.clinicName || '' });
            bodyParameters.push({ type: 'text', text: params.uniqueLink || '' });
            bodyParameters.push({ type: 'text', text: params.clinicPhone || '' });
          } else if (templateName === 'vaccination_successful_1') {
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

        const langCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US';
        await sendTemplateMessage(
          patient.mobile,
          templateName,
          langCode,
          components
        );
      } else {
        // Fallback to text message
        await sendTextMessage(patient.mobile, message);
      }
    } catch (wsErr) {
      console.error(`WhatsApp send failed for manual template reminder:`, wsErr.message);
      status = 'failed';
      errorMessage = wsErr.message;
    }

    const reminder = await prisma.reminder.create({
      data: {
        patientId: parseInt(patientId),
        vaccinationId: vaccinationId ? parseInt(vaccinationId) : null,
        type,
        channel: 'whatsapp',
        status,
        scheduledAt: new Date(),
        sentAt: status === 'sent' ? new Date() : null,
        message: message || `Sent template: ${templateName}`,
        templateName,
        templateParams: templateParams ? (typeof templateParams === 'object' ? templateParams : JSON.parse(templateParams)) : null,
        lastError: errorMessage
      }
    });

    if (status === 'failed') {
      return res.status(500).json({ error: 'Failed to send WhatsApp message', reminder });
    }

    return res.status(201).json(reminder);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error creating reminder' });
  }
};

module.exports = {
  getReminders,
  getDueReminders,
  sendReminder,
  createManualReminder
};
