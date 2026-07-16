import { Document, Page, View, Text, StyleSheet, Svg, Circle, Path, Rect, Image, Font } from '@react-pdf/renderer';
import dayjs from 'dayjs';

import uwinLogo from '../assets/uwin-logo.png';
import govtLogo from '../assets/govt-logo.png';
import nhmLogo from '../assets/nhm-logo.png';
import { getVaccList } from '../utils/vaccineDefaults';

// Register Unicode font supporting Odia/Oriya script for @react-pdf/renderer
Font.register({
  family: 'Noto Sans Oriya',
  src: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/master/hinted/ttf/NotoSansOriya/NotoSansOriya-Regular.ttf'
});

// Helper to group vaccines by age
const groupVaccinesByAge = (vaccList) => {
  const ageGroupsMap = {};
  vaccList.forEach((v) => {
    const age = v.ageLabel || 'Other';
    if (!ageGroupsMap[age]) {
      ageGroupsMap[age] = {
        ageLabel: age,
        recommendedAgeDays: v.recommendedAgeDays !== undefined ? v.recommendedAgeDays : 0,
        vaccines: []
      };
    }
    ageGroupsMap[age].vaccines.push(v);
  });

  // Sort vaccines within each group by displayOrder dynamically
  Object.values(ageGroupsMap).forEach((group) => {
    group.vaccines.sort((a, b) => {
      const aOrder = a.displayOrder !== undefined ? a.displayOrder : 0;
      const bOrder = b.displayOrder !== undefined ? b.displayOrder : 0;
      return aOrder - bOrder;
    });
  });

  // Sort the age groups by recommendedAgeDays dynamically
  return Object.values(ageGroupsMap).sort((a, b) => {
    const aDays = a.recommendedAgeDays || 0;
    const bDays = b.recommendedAgeDays || 0;
    return aDays - bDays;
  });
};

const styles = StyleSheet.create({
  page: {
    padding: 16,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    border: '3pt solid #0f766e',
  },
  clinicHeaderContainer: {
    borderBottomWidth: 2,
    borderBottomColor: '#0f766e',
    paddingBottom: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  clinicHeaderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f766e',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  clinicHeaderSubtitle: {
    fontSize: 8,
    fontStyle: 'italic',
    color: '#4b5563',
    textAlign: 'center',
    marginTop: 1,
  },
  clinicHeaderServices: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#1e3a8a',
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  detailsContainer: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    backgroundColor: '#f9fafb',
    padding: 6,
    marginBottom: 8,
    position: 'relative',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    width: '50%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 10,
    paddingVertical: 1.5,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#374151',
  },
  detailValueBlue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  detailItemFull: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingVertical: 2,
    marginTop: 2,
  },
  gridContainer: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 10,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: -3,
    marginBottom: 4,
  },
  columnWrapper: {
    width: '25%',
    paddingHorizontal: 3,
    display: 'flex',
    flexDirection: 'column',
  },
  ageColumn: {
    borderWidth: 1,
    borderColor: '#6b21a8',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
  },
  columnHeader: {
    backgroundColor: '#6b21a8',
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 2,
    textTransform: 'uppercase',
  },
  dateBox: {
    backgroundColor: '#f0fdf4',
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
    paddingVertical: 1.5,
    alignItems: 'center',
  },
  dateBoxLabel: {
    fontSize: 5.5,
    fontWeight: 'bold',
    color: '#15803d',
    textTransform: 'uppercase',
  },
  dateBoxValue: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#166534',
    marginTop: 0.5,
  },
  subtitleBox: {
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 1,
    alignItems: 'center',
  },
  subtitleText: {
    fontSize: 5,
    fontWeight: 'bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
  },
  vaccineRows: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
  },
  vaccineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
    flexGrow: 1,
  },
  vaccineName: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#374151',
    flex: 1,
    paddingRight: 2,
  },
  vaccineNameOptional: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#dc2626',
    flex: 1,
    paddingRight: 2,
  },
  vaccineDateBox: {
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    borderRadius: 2,
    paddingVertical: 1,
    paddingHorizontal: 2,
    minWidth: 42,
    textAlign: 'center',
    fontSize: 6.5,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    color: '#9ca3af',
    backgroundColor: '#ffffff',
  },
  vaccineDateBoxCompleted: {
    borderWidth: 0.5,
    borderColor: '#5eead4',
    borderRadius: 2,
    paddingVertical: 1,
    paddingHorizontal: 2,
    minWidth: 42,
    textAlign: 'center',
    fontSize: 6.5,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    color: '#0f766e',
    backgroundColor: '#f0fdfa',
  },
  vaccineDateBoxOptional: {
    borderWidth: 0.5,
    borderColor: '#fca5a5',
    borderRadius: 2,
    paddingVertical: 1,
    paddingHorizontal: 2,
    minWidth: 42,
    textAlign: 'center',
    fontSize: 6.5,
    fontFamily: 'Courier',
    fontWeight: 'bold',
    color: '#dc2626',
    backgroundColor: '#ffffff',
  },
  footerContainer: {
    borderTopWidth: 2,
    borderTopColor: '#0f766e',
    paddingTop: 8,
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLeft: {
    flexDirection: 'column',
    maxWidth: '45%',
  },
  sloganHeader: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#0f766e',
    marginBottom: 2,
  },
  sloganText: {
    fontSize: 7.5,
    fontStyle: 'italic',
    color: '#6b7280',
    marginBottom: 4,
  },
  pmQuoteBox: {
    borderLeftWidth: 1,
    borderLeftColor: '#d1d5db',
    paddingLeft: 4,
    marginTop: 2,
  },
  pmQuoteText: {
    fontSize: 6.5,
    fontStyle: 'italic',
    color: '#9ca3af',
  },
  pmAuthorText: {
    fontSize: 6.5,
    fontWeight: 'bold',
    color: '#9ca3af',
    marginTop: 1,
  },
  doctorBlock: {
    flexDirection: 'column',
    textAlign: 'right',
    maxWidth: '40%',
  },
  doctorName: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f766e',
  },
  doctorDegree: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 0.5,
  },
  doctorTitle: {
    fontSize: 7,
    color: '#6b7280',
    marginTop: 0.5,
  },
  clinicDetails: {
    marginTop: 2,
  },
  clinicNameText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#374151',
  },
  clinicInfoText: {
    fontSize: 6.5,
    color: '#6b7280',
    marginTop: 0.5,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 2,
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  qrLabel: {
    fontSize: 5,
    fontWeight: 'bold',
    color: '#9ca3af',
    marginTop: 1.5,
    textTransform: 'uppercase',
  },
});

const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const VaccinationGridPDF = ({ patient, vaccinations }) => {
  const groups = groupVaccinesByAge(vaccinations);
  const rows = chunkArray(groups, 4);

  return (
    <View style={styles.gridContainer}>
      {rows.map((rowGroups, rowIndex) => (
        <View key={rowIndex} style={styles.gridRow} wrap={false}>
          {rowGroups.map((group) => {
            const isBirth = group.ageLabel.toLowerCase() === 'birth';
            const displayDate = isBirth 
              ? dayjs(patient?.dateOfBirth).format('DD/MM/YYYY')
              : (group.vaccines[0]?.dueDate ? dayjs(group.vaccines[0].dueDate).format('DD/MM/YYYY') : '');

            return (
              <View key={group.ageLabel} style={styles.columnWrapper}>
                <View style={styles.ageColumn}>
                  {/* Banner */}
                  <Text style={styles.columnHeader}>{group.ageLabel}</Text>
                  
                  {/* Due Date Box */}
                  <View style={styles.dateBox}>
                    <Text style={styles.dateBoxLabel}>
                      {isBirth ? 'Date of Birth' : 'Vaccination due date'}
                    </Text>
                    <Text style={styles.dateBoxValue}>{displayDate}</Text>
                  </View>

                  {/* Subtitle */}
                  <View style={styles.subtitleBox}>
                    <Text style={styles.subtitleText}>Date of Vaccination (dd/mm/yyyy)</Text>
                  </View>

                  {/* Vaccines rows */}
                  <View style={styles.vaccineRows}>
                    {group.vaccines.map((v) => {
                      const isOptional = v.category === 'optional';
                      const isGiven = v.status === 'given';
                      
                      let boxStyle = styles.vaccineDateBox;
                      if (isGiven) {
                        boxStyle = styles.vaccineDateBoxCompleted;
                      } else if (isOptional) {
                        boxStyle = styles.vaccineDateBoxOptional;
                      }

                      return (
                        <View key={v.id} style={styles.vaccineRow}>
                          <Text style={isOptional ? styles.vaccineNameOptional : styles.vaccineName}>
                            {v.vaccineName}
                          </Text>
                          <Text style={boxStyle}>
                            {isGiven && v.dateGiven
                              ? dayjs(v.dateGiven).format('DD/MM/YYYY')
                              : '__/__/____'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

export const VaccinationCertificatePDF = ({ patient, vaccinations }) => {
  const fullVaccinations = getVaccList(vaccinations, patient?.dateOfBirth);
  
  console.log("VaccinationCertificatePDF received vaccinations:", fullVaccinations);

  const clinic = patient?.clinic || {
    name: 'ABC Child Care Clinic',
    address: '123 Main Road, Bhubaneswar, Odisha',
    phone: '+91-XXXXXXXXXX',
    email: 'contact@abcchildcare.com'
  };

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* Header Block */}
        <View style={styles.clinicHeaderContainer}>
          <Text style={styles.clinicHeaderTitle}>KIDDOSCARE PEDIATRIC CLINIC</Text>
          <Text style={styles.clinicHeaderSubtitle}>Compassionate Care, Healthy Childhood</Text>
          <Text style={styles.clinicHeaderServices}>
            Advanced Neonatal Care • Pediatric Care • Vaccination • Growth & Development
          </Text>
        </View>

        {/* Patient Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Ref ID / UHID:</Text>
              <Text style={styles.detailValueBlue}>{patient?.uhid}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Date of Birth:</Text>
              <Text style={styles.detailValue}>{patient ? dayjs(patient.dateOfBirth).format('DD-MMM-YYYY') : ''}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Beneficiary's Name:</Text>
              <Text style={styles.detailValue}>{patient?.namePrefix} {patient?.name}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Gender:</Text>
              <Text style={[styles.detailValue, { textTransform: 'uppercase' }]}>{patient?.gender}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Mother Name:</Text>
              <Text style={styles.detailValue}>{patient?.motherName || '--'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Vaccination Date:</Text>
              <Text style={styles.detailValue}>{patient ? dayjs(patient.createdAt).format('DD-MMM-YYYY') : ''}</Text>
            </View>

            <View style={[styles.detailItem, { width: '100%' }]}>
              <Text style={styles.detailLabel}>Vaccinated At:</Text>
              <Text style={styles.detailValue}>{clinic.name}</Text>
            </View>
          </View>
          <View style={styles.detailItemFull}>
            <Text style={styles.detailLabel}>Vaccinated By: </Text>
            <Text style={[styles.detailValueBlue, { marginLeft: 4 }]}>Dr. Shubha Smruti Mohanty</Text>
          </View>
        </View>

        {/* Dynamic Vaccine Grid */}
        <VaccinationGridPDF patient={patient} vaccinations={fullVaccinations} />

        {/* Bottom Signature & Clinic Block */}
        <View style={styles.footerContainer} wrap={false}>
          {/* Quotes */}
          <View style={styles.footerLeft}>
            <Text style={styles.sloganHeader}>"Today's Vaccination, Tomorrow's Healthy Future."</Text>
            <Text style={styles.sloganText}>"Get vaccinated on time. Keep diseases away."</Text>
            
            <View style={styles.pmQuoteBox}>
              <Text style={styles.pmQuoteText}>"Let no child suffer from any vaccine preventable diseases"</Text>
            </View>
          </View>

          {/* Doctor Signature */}
          <View style={styles.doctorBlock}>
            <Text style={styles.doctorName}>Dr. Shubha Smruti Mohanty</Text>
            <Text style={styles.doctorDegree}>MBBS, MD (Paediatrics)</Text>
            <Text style={styles.doctorTitle}>Consultant Pediatrician & Neonatologist</Text>
            
            <View style={styles.clinicDetails}>
              <Text style={styles.clinicNameText}>{clinic.name}</Text>
              <Text style={styles.clinicInfoText}>{clinic.address}</Text>
              <Text style={[styles.clinicInfoText, { fontFamily: 'Courier' }]}>Phone: {clinic.phone}</Text>
              {clinic.email && <Text style={[styles.clinicInfoText, { fontFamily: 'Courier' }]}>Email: {clinic.email}</Text>}
            </View>
          </View>


        </View>
      </Page>
    </Document>
  );
};
