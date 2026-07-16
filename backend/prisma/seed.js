const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const vaccineList = [
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

async function main() {
  console.log("Seeding databases...");

  // Seed Admin User
  const adminPasswordHash = await bcrypt.hash("Kiddos@2024", 10);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: adminPasswordHash,
      name: "Dr. Shubha Sandeep Mahanty",
      role: "doctor"
    }
  });
  console.log(`Admin user seeded: ${admin.name}`);

  // Seed Clinics
  const clinics = [
    { name: "ANSHI MEDICINE STORE", address: "INFRONT OF NEW BUSTAND, near KARNATAKA BANK LTD, Tamrit Colony, Angul, Odisha 759122", phone: "8249029355", city: "ANGUL" },
    { name: "BBSR GLOBAL CLINIC MEDS", address: "BBSR, 159357, Odisha", phone: "7899877899", email: "clinic_bbsr@gmail.com", city: "Bhubaneswar" },
    { name: "KIDDOSCARE", address: "12, MG Road, Koramangala", phone: "8984255702", city: "Bengaluru" },
    { name: "SAMAL CARE", address: "R6RG+HCG National Highway, 42, Nuahata, Odisha 759128", phone: "6371163857", city: "BANARPAL" }
  ];

  for (const clinic of clinics) {
    const existing = await prisma.clinic.findFirst({ where: { name: clinic.name } });
    if (!existing) {
      const c = await prisma.clinic.create({
        data: clinic
      });
      console.log(`Clinic seeded: ${c.name}`);
    } else {
      console.log(`Clinic already exists: ${clinic.name}`);
    }
  }

  // Seed Vaccine Master Data
  await prisma.vaccineMaster.deleteMany({});
  for (let i = 0; i < vaccineList.length; i++) {
    const item = vaccineList[i];
    await prisma.vaccineMaster.create({
      data: {
        vaccineName: item.vaccineName,
        ageLabel: item.ageLabel,
        category: item.category,
        recommendedAgeDays: item.recommendedAgeDays,
        displayOrder: i + 1
      }
    });
  }
  console.log("Vaccine master data seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
