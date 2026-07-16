import dayjs from 'dayjs';

const defaultVaccines = [
  // Birth
  { ageLabel: "Birth", vaccineName: "BCG", category: "mandatory", recommendedAgeDays: 0 },
  { ageLabel: "Birth", vaccineName: "OPV", category: "mandatory", recommendedAgeDays: 0 },
  { ageLabel: "Birth", vaccineName: "Hep B-1", category: "mandatory", recommendedAgeDays: 0 },
  
  // 6 weeks
  { ageLabel: "6 weeks", vaccineName: "DTaP/DTwP-1", category: "mandatory", recommendedAgeDays: 42 },
  { ageLabel: "6 weeks", vaccineName: "IPV-1", category: "mandatory", recommendedAgeDays: 42 },
  { ageLabel: "6 weeks", vaccineName: "Hib-1", category: "mandatory", recommendedAgeDays: 42 },
  { ageLabel: "6 weeks", vaccineName: "Hep B-2", category: "mandatory", recommendedAgeDays: 42 },
  { ageLabel: "6 weeks", vaccineName: "Rota-1", category: "mandatory", recommendedAgeDays: 42 },
  { ageLabel: "6 weeks", vaccineName: "PCV-1", category: "mandatory", recommendedAgeDays: 42 },
  
  // 10 weeks
  { ageLabel: "10 weeks", vaccineName: "DTaP/DTwP-2", category: "mandatory", recommendedAgeDays: 70 },
  { ageLabel: "10 weeks", vaccineName: "IPV-2", category: "mandatory", recommendedAgeDays: 70 },
  { ageLabel: "10 weeks", vaccineName: "Hib-2", category: "mandatory", recommendedAgeDays: 70 },
  { ageLabel: "10 weeks", vaccineName: "Hep B-3", category: "mandatory", recommendedAgeDays: 70 },
  { ageLabel: "10 weeks", vaccineName: "Rota-2", category: "mandatory", recommendedAgeDays: 70 },
  { ageLabel: "10 weeks", vaccineName: "PCV-2", category: "mandatory", recommendedAgeDays: 70 },
  
  // 14 weeks
  { ageLabel: "14 weeks", vaccineName: "DTaP/DTwP-3", category: "mandatory", recommendedAgeDays: 98 },
  { ageLabel: "14 weeks", vaccineName: "IPV-3", category: "mandatory", recommendedAgeDays: 98 },
  { ageLabel: "14 weeks", vaccineName: "Hib-3", category: "mandatory", recommendedAgeDays: 98 },
  { ageLabel: "14 weeks", vaccineName: "Hep B-4", category: "mandatory", recommendedAgeDays: 98 },
  { ageLabel: "14 weeks", vaccineName: "Rota-3", category: "mandatory", recommendedAgeDays: 98 },
  { ageLabel: "14 weeks", vaccineName: "PCV-3", category: "mandatory", recommendedAgeDays: 98 },
  
  // 6 months
  { ageLabel: "6 months", vaccineName: "Influenza Vaccine-1", category: "mandatory", recommendedAgeDays: 183 },
  { ageLabel: "6 months", vaccineName: "Typhoid conjugate vaccine", category: "mandatory", recommendedAgeDays: 183 },
  
  // 7 months
  { ageLabel: "7 months", vaccineName: "Influenza Vaccine-2", category: "mandatory", recommendedAgeDays: 213 },
  
  // 9 months
  { ageLabel: "9 months", vaccineName: "MMR-1", category: "mandatory", recommendedAgeDays: 274 },
  { ageLabel: "9 months", vaccineName: "MCV-1", category: "mandatory", recommendedAgeDays: 274 },
  { ageLabel: "9 months", vaccineName: "Yellow Fever Vaccine", category: "mandatory", recommendedAgeDays: 274 },
  
  // 12 months
  { ageLabel: "12 months", vaccineName: "Hep A", category: "mandatory", recommendedAgeDays: 365 },
  { ageLabel: "12 months", vaccineName: "MCV-2", category: "mandatory", recommendedAgeDays: 365 },
  { ageLabel: "12 months", vaccineName: "JE-1", category: "mandatory", recommendedAgeDays: 365 },
  { ageLabel: "12 months", vaccineName: "Cholera Vaccine-1", category: "mandatory", recommendedAgeDays: 365 },
  
  // 13 months
  { ageLabel: "13 months", vaccineName: "JE-2", category: "mandatory", recommendedAgeDays: 396 },
  { ageLabel: "13 months", vaccineName: "Cholera Vaccine-2", category: "mandatory", recommendedAgeDays: 396 },
  
  // 15 months
  { ageLabel: "15 months", vaccineName: "MMR-2", category: "mandatory", recommendedAgeDays: 457 },
  { ageLabel: "15 months", vaccineName: "Varicella-1", category: "mandatory", recommendedAgeDays: 457 },
  { ageLabel: "15 months", vaccineName: "PCV booster", category: "mandatory", recommendedAgeDays: 457 },
  
  // 16–18 months
  { ageLabel: "16–18 months", vaccineName: "DTaP/DTwP-B1", category: "mandatory", recommendedAgeDays: 487 },
  { ageLabel: "16–18 months", vaccineName: "Hib-B1", category: "mandatory", recommendedAgeDays: 487 },
  { ageLabel: "16–18 months", vaccineName: "IPV-B1", category: "mandatory", recommendedAgeDays: 487 },
  
  // 18–19 months
  { ageLabel: "18–19 months", vaccineName: "Hep A-2", category: "mandatory", recommendedAgeDays: 548 },
  { ageLabel: "18–19 months", vaccineName: "Varicella-2", category: "mandatory", recommendedAgeDays: 548 },
  
  // 2–3 years
  { ageLabel: "2–3 years", vaccineName: "MCV", category: "mandatory", recommendedAgeDays: 730 },
  { ageLabel: "2–3 years", vaccineName: "Influenza Vaccine", category: "mandatory", recommendedAgeDays: 730 },
  { ageLabel: "2–3 years", vaccineName: "PPSV23", category: "mandatory", recommendedAgeDays: 730 },
  
  // 3 years
  { ageLabel: "3 years", vaccineName: "Influenza vaccine", category: "mandatory", recommendedAgeDays: 1095 },
  
  // 4 years
  { ageLabel: "4 years", vaccineName: "Influenza vaccine", category: "mandatory", recommendedAgeDays: 1460 },
  
  // 4–6 years
  { ageLabel: "4–6 years", vaccineName: "DTaP/DTwP-B2", category: "mandatory", recommendedAgeDays: 1460 },
  { ageLabel: "4–6 years", vaccineName: "IPV-B2", category: "mandatory", recommendedAgeDays: 1460 },
  { ageLabel: "4–6 years", vaccineName: "MMR-3", category: "mandatory", recommendedAgeDays: 1460 },
  
  // 5 years
  { ageLabel: "5 years", vaccineName: "Influenza vaccine", category: "mandatory", recommendedAgeDays: 1825 },
  
  // 6 years
  { ageLabel: "6 years", vaccineName: "Influenza vaccine", category: "mandatory", recommendedAgeDays: 2190 },
  
  // 7 years
  { ageLabel: "7 years", vaccineName: "Influenza vaccine", category: "mandatory", recommendedAgeDays: 2555 },
  
  // 8 years
  { ageLabel: "8 years", vaccineName: "Influenza vaccine", category: "mandatory", recommendedAgeDays: 2920 },
  
  // 9–14 years
  { ageLabel: "9–14 years", vaccineName: "HPV-1", category: "mandatory", recommendedAgeDays: 3285 },
  { ageLabel: "9–14 years", vaccineName: "HPV-2", category: "mandatory", recommendedAgeDays: 3285 },
  
  // 10–12 years
  { ageLabel: "10–12 years", vaccineName: "Tdap/Td", category: "mandatory", recommendedAgeDays: 3650 },
  
  // 15–18 years
  { ageLabel: "15–18 years", vaccineName: "HPV-1", category: "mandatory", recommendedAgeDays: 5475 },
  { ageLabel: "15–18 years", vaccineName: "HPV-2", category: "mandatory", recommendedAgeDays: 5475 },
  { ageLabel: "15–18 years", vaccineName: "HPV-3", category: "mandatory", recommendedAgeDays: 5475 }
];

export const getVaccList = (vaccinations, dob) => {
  if (vaccinations && vaccinations.length > 0) {
    return vaccinations;
  }
  
  const patientDob = dob ? dayjs(dob) : dayjs();
  return defaultVaccines.map((v, index) => {
    const recommendedAgeDays = v.recommendedAgeDays || 0;
    const dueDate = patientDob.add(recommendedAgeDays, 'day').format('YYYY-MM-DD');
    return {
      id: `temp-${index}`,
      vaccineName: v.vaccineName,
      ageLabel: v.ageLabel,
      category: v.category,
      vaccineMasterCategory: v.category,
      recommendedAgeDays: recommendedAgeDays,
      displayOrder: index + 1,
      dueDate: dueDate,
      dateGiven: null,
      status: 'not_given',
      brand: '',
      batchNumber: '',
      notes: ''
    };
  });
};
