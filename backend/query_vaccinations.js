const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const patients = await prisma.patient.findMany({
    take: 1
  });
  console.log('Patients count:', await prisma.patient.count());
  console.log('Sample Patient:', patients[0]);
  
  if (patients[0]) {
    const vaccinations = await prisma.vaccination.findMany({
      where: { patientId: patients[0].id },
      include: { vaccineMaster: true }
    });
    console.log('Vaccinations count for first patient:', vaccinations.length);
    console.log('Sample Vaccination:', vaccinations[0]);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
