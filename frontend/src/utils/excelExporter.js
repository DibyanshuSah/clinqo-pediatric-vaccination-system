import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { calculateAgeYMD } from './ageCalculator';

/**
 * Exports list of patient objects to an Excel (.xlsx) file.
 */
export const exportPatientsToExcel = (patients, filename) => {
  if (!patients || patients.length === 0) {
    throw new Error('No patient records available to export.');
  }

  const exportFilename = filename || `Registered_Patients_${dayjs().format('YYYY-MM-DD_HHmm')}.xlsx`;

  const data = patients.map((p, index) => ({
    'Sl No.': index + 1,
    'UHID': p.uhid || '',
    'Patient Name': `${p.namePrefix ? p.namePrefix + ' ' : ''}${p.name || ''}`,
    'Gender': (p.gender || '').toUpperCase(),
    'Date of Birth': p.dateOfBirth ? dayjs(p.dateOfBirth).format('DD-MMM-YYYY') : '',
    'Age': calculateAgeYMD(p.dateOfBirth),
    'Father / Guardian Name': p.parentName || '',
    'Mother Name': p.motherName || '--',
    'Mobile Number': p.mobile || '',
    'Email': p.email || '--',
    'Address': p.address || '',
    'Birth Weight (kg)': p.birthWeight ?? '',
    'Current Weight (kg)': p.currentWeight ?? '',
    'Blood Group': p.bloodGroup || '--',
    'Visit Type': p.visitType || 'Normal OPD visit',
    'Clinic Name': p.clinicName || p.clinic?.name || '',
    'Registration Date': p.createdAt ? dayjs(p.createdAt).format('DD-MMM-YYYY HH:mm') : ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set optimized column widths
  worksheet['!cols'] = [
    { wch: 8 },  // Sl No
    { wch: 16 }, // UHID
    { wch: 25 }, // Patient Name
    { wch: 10 }, // Gender
    { wch: 15 }, // Date of Birth
    { wch: 28 }, // Age
    { wch: 22 }, // Father / Guardian Name
    { wch: 22 }, // Mother Name
    { wch: 15 }, // Mobile Number
    { wch: 25 }, // Email
    { wch: 32 }, // Address
    { wch: 16 }, // Birth Weight
    { wch: 16 }, // Current Weight
    { wch: 12 }, // Blood Group
    { wch: 20 }, // Visit Type
    { wch: 24 }, // Clinic Name
    { wch: 22 }  // Registration Date
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registered Patients');
  XLSX.writeFile(workbook, exportFilename);
};
