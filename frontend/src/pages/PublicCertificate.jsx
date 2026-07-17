import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import { pdf } from '@react-pdf/renderer';
import { VaccinationCertificatePDF } from '../components/VaccinationCertificatePDF';
import { getVaccList } from '../utils/vaccineDefaults';
import { Loader, SkeletonCard } from '../components/Loader';
import { Download, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';

// Group vaccines by age helper
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

  Object.values(ageGroupsMap).forEach((group) => {
    group.vaccines.sort((a, b) => {
      const aOrder = a.displayOrder !== undefined ? a.displayOrder : 0;
      const bOrder = b.displayOrder !== undefined ? b.displayOrder : 0;
      return aOrder - bOrder;
    });
  });

  return Object.values(ageGroupsMap).sort((a, b) => {
    const aDays = a.recommendedAgeDays || 0;
    const bDays = b.recommendedAgeDays || 0;
    return aDays - bDays;
  });
};

const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// VaccinationGrid component
const VaccinationGrid = ({ patient, vaccinations, onVaccineClick }) => {
  const groups = groupVaccinesByAge(vaccinations);
  const rows = chunkArray(groups, 4);
  
  return (
    <div className="space-y-4 mb-6">
      {rows.map((rowGroups, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-4 gap-3">
          {rowGroups.map((group) => {
            const isBirth = group.ageLabel.toLowerCase() === 'birth';
            const displayDate = isBirth 
              ? dayjs(patient?.dateOfBirth).format('DD/MM/YYYY')
              : (group.vaccines[0]?.dueDate ? dayjs(group.vaccines[0].dueDate).format('DD/MM/YYYY') : '');

            return (
              <div 
                key={group.ageLabel}
                className="border rounded overflow-hidden flex flex-col"
                style={{ 
                  borderColor: '#6b21a8',
                  backgroundColor: '#ffffff'
                }}
              >
                {/* Group Header Banner */}
                <div 
                  className="text-white text-[9px] font-extrabold uppercase text-center py-1 px-1 tracking-wider leading-tight" 
                  style={{ backgroundColor: '#6b21a8' }}
                >
                  {group.ageLabel}
                </div>

                {/* Due Date Box */}
                <div 
                  className="border-y text-center py-0.5 px-1"
                  style={{ 
                    backgroundColor: '#f0fdf4',
                    borderTopColor: '#bbf7d0',
                    borderBottomColor: '#bbf7d0'
                  }}
                >
                  <div className="text-[7.5px] font-bold uppercase tracking-tight" style={{ color: '#15803d' }}>
                    {isBirth ? 'Date of Birth' : 'Vaccination due date'}
                  </div>
                  <div className="text-[9px] font-bold" style={{ color: '#166534' }}>
                    {displayDate}
                  </div>
                </div>

                {/* Subtitle */}
                <div 
                  className="border-b text-center py-0.5" 
                  style={{ 
                    fontSize: '6.5px',
                    backgroundColor: '#f9fafb',
                    borderBottomColor: '#f3f4f6'
                  }}
                >
                  <span className="font-extrabold uppercase tracking-tighter" style={{ color: '#9ca3af' }}>
                    Date of Vaccination (dd/mm/yyyy)
                  </span>
                </div>

                {/* Vaccines Rows */}
                <div className="divide-y divide-gray-100 flex-1 flex flex-col" style={{ divideColor: '#f3f4f6' }}>
                  {group.vaccines.map((v) => {
                    const isOptional = v.category === 'optional';
                    return (
                      <div 
                        key={v.id}
                        onClick={() => onVaccineClick && onVaccineClick(v)}
                        className="flex justify-between items-center py-1 px-1.5 cursor-pointer hover:bg-gray-50 transition-colors flex-1"
                        style={{
                          backgroundColor: isOptional ? 'rgba(254, 242, 242, 0.4)' : '#ffffff'
                        }}
                      >
                        <span 
                          className="text-[8.5px] font-bold pr-1 leading-tight flex-1"
                          style={{ color: isOptional ? '#dc2626' : '#374151' }}
                        >
                          {v.vaccineName}
                        </span>
                        <span 
                          className="text-[8px] font-bold px-0.5 py-0.5 border rounded text-center min-w-[55px] font-mono leading-none"
                          style={
                            isOptional 
                              ? { borderColor: '#fca5a5', color: '#dc2626', backgroundColor: '#ffffff' } 
                              : v.status === 'given' 
                                ? { borderColor: '#5eead4', color: '#0f766e', backgroundColor: '#f0fdfa' } 
                                : { borderColor: '#e5e7eb', color: '#9ca3af', backgroundColor: '#ffffff' }
                          }
                        >
                          {v.status === 'given' && v.dateGiven
                            ? dayjs(v.dateGiven).format('DD/MM/YYYY')
                            : '__/__/____'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// VaccinationCertificate component
const VaccinationCertificate = ({ patient, vaccinations, onVaccineClick }) => {
  const fullVaccinations = getVaccList(vaccinations, patient?.dateOfBirth);
  
  const clinic = patient?.clinic || {
    name: 'ABC Child Care Clinic',
    address: '123 Main Road, Bhubaneswar, Odisha',
    phone: '+91-XXXXXXXXXX',
    email: 'contact@abcchildcare.com'
  };

  return (
    <div 
      id="vaccination-certificate-print-area"
      className="bg-white p-8 border-4 rounded-lg shadow-lg max-w-[800px] mx-auto font-sans relative"
      style={{ 
        minHeight: '1130px', 
        width: '800px', 
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        borderColor: '#0f766e',
        color: '#1f2937'
      }}
    >
      {/* Header Block */}
      <div className="text-center border-b-2 pb-3 mb-4" style={{ borderBottomColor: '#0f766e' }}>
        <h1 className="text-lg font-extrabold tracking-wider" style={{ color: '#0f766e' }}>
          KIDDOSCARE PEDIATRIC CLINIC
        </h1>
        <p className="text-[10px] font-semibold italic text-gray-500 mt-0.5">
          Compassionate Care, Healthy Childhood
        </p>
        <p className="text-[9px] font-bold tracking-wide mt-1" style={{ color: '#1e3a8a' }}>
          Advanced Neonatal Care • Pediatric Care • Vaccination • Growth & Development
        </p>
      </div>

      {/* Patient details block */}
      <div 
        className="grid grid-cols-2 gap-y-2.5 gap-x-6 border rounded-lg p-3.5 mb-5 text-[11px] relative"
        style={{ 
          backgroundColor: '#f9fafb', 
          borderColor: '#e5e7eb',
          color: '#374151'
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] select-none">
          <span className="font-extrabold text-2xl tracking-widest uppercase" style={{ color: '#1e3a8a' }}>U - WIN SYSTEM</span>
        </div>

        <div className="flex justify-between border-b pb-1" style={{ borderBottomColor: '#e5e7eb' }}>
          <span className="font-bold" style={{ color: '#6b7280' }}>Ref ID / UHID:</span>
          <span className="font-bold" style={{ color: '#1e3a8a' }}>{patient?.uhid}</span>
        </div>
        <div className="flex justify-between border-b pb-1" style={{ borderBottomColor: '#e5e7eb' }}>
          <span className="font-bold" style={{ color: '#6b7280' }}>Date of Birth:</span>
          <span className="font-bold" style={{ color: '#374151' }}>{patient ? dayjs(patient.dateOfBirth).format('DD-MMM-YYYY') : ''}</span>
        </div>

        <div className="flex justify-between border-b pb-1" style={{ borderBottomColor: '#e5e7eb' }}>
          <span className="font-bold" style={{ color: '#6b7280' }}>Beneficiary's Name:</span>
          <span className="font-bold" style={{ color: '#374151' }}>{patient?.namePrefix} {patient?.name}</span>
        </div>
        <div className="flex justify-between border-b pb-1" style={{ borderBottomColor: '#e5e7eb' }}>
          <span className="font-bold" style={{ color: '#6b7280' }}>Gender:</span>
          <span className="font-bold uppercase" style={{ color: '#374151' }}>{patient?.gender}</span>
        </div>

        <div className="flex justify-between border-b pb-1" style={{ borderBottomColor: '#e5e7eb' }}>
          <span className="font-bold" style={{ color: '#6b7280' }}>Mother Name:</span>
          <span className="font-bold" style={{ color: '#374151' }}>{patient?.motherName || '--'}</span>
        </div>
        <div className="flex justify-between border-b pb-1" style={{ borderBottomColor: '#e5e7eb' }}>
          <span className="font-bold" style={{ color: '#6b7280' }}>Vaccination Date:</span>
          <span className="font-bold" style={{ color: '#374151' }}>{patient ? dayjs(patient.createdAt).format('DD-MMM-YYYY') : ''}</span>
        </div>

        <div className="flex justify-between border-b pb-1 col-span-2" style={{ borderBottomColor: '#e5e7eb' }}>
          <span className="font-bold" style={{ color: '#6b7280' }}>Vaccinated At:</span>
          <span className="font-bold" style={{ color: '#374151' }}>{clinic.name}</span>
        </div>

        <div className="flex justify-between col-span-2 pt-0.5">
          <span className="font-bold" style={{ color: '#6b7280' }}>Vaccinated By:</span>
          <span className="font-bold" style={{ color: '#1e3a8a' }}>Dr. Shubha Sandeep Mahanty</span>
        </div>
      </div>

      {/* Dynamic Vaccine Grid */}
      <VaccinationGrid 
        patient={patient} 
        vaccinations={fullVaccinations} 
        onVaccineClick={onVaccineClick} 
      />

      {/* Footer / Quote / Clinician Block */}
      <div className="border-t-2 pt-5 mt-auto flex justify-between items-end text-[10px]" style={{ borderTopColor: '#0f766e' }}>
        {/* Slogan */}
        <div className="flex flex-col gap-1 max-w-[40%]">
          <p className="font-extrabold text-[12px] tracking-wide leading-tight" style={{ color: '#0f766e' }}>
            "Today's Vaccination, Tomorrow's Healthy Future."
          </p>
          <p className="font-semibold italic text-[9.5px] leading-relaxed" style={{ color: '#6b7280' }}>
            "Get vaccinated on time. Keep diseases away."
          </p>
          
          {/* Subtle PM Quote */}
          <div className="border-l pl-2 mt-2 text-[8px] space-y-0.5" style={{ borderLeftColor: '#d1d5db', color: '#9ca3af' }}>
            <p className="italic">"Let no child suffer from any vaccine preventable diseases"</p>
          </div>
        </div>

        {/* Doctor Signature Block */}
        <div className="text-right space-y-0.5 max-w-[45%]" style={{ color: '#374151' }}>
          <p className="font-extrabold text-[12px] leading-tight" style={{ color: '#0f766e' }}>Dr. Shubha Sandeep Mahanty</p>
          <p className="font-bold text-[10px] leading-none" style={{ color: '#1f2937' }}>MBBS, MD (Paediatrics)</p>
          <p className="font-semibold text-[9px] leading-tight" style={{ color: '#6b7280' }}>Consultant Pediatrician & Neonatologist</p>
          
          <div className="pt-1 text-[9px] font-semibold space-y-0.5" style={{ color: '#6b7280' }}>
            <p className="font-bold" style={{ color: '#374151' }}>{clinic.name}</p>
            <p>{clinic.address}</p>
            <p className="font-mono" style={{ color: '#4b5563' }}>Phone: {clinic.phone}</p>
            {clinic.email && <p className="font-mono" style={{ color: '#4b5563' }}>Email: {clinic.email}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main PublicCertificate component
const PublicCertificate = () => {
  const { patientId, uuid: rawUuid } = useParams();
  const uuid = rawUuid?.replace(/^uuid=/, '');
  const [patient, setPatient] = useState(null);
  const [vaccinations, setVaccinations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Base API URL
  const API_URL = import.meta.env.VITE_API_URL || (window.location.origin.includes('localhost') ? 'http://localhost:5000/api' : `${window.location.origin}/api`);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/patients/public/${uuid}`);
        setPatient(res.data.patient);
        setVaccinations(res.data.vaccinations);
        setSummary(res.data.summary);
      } catch (err) {
        console.error('Failed to load public record:', err);
        setError(true);
        toast.error('Unable to fetch vaccination records.');
      } finally {
        setLoading(false);
      }
    };

    if (uuid) {
      fetchPublicData();
    } else {
      setError(true);
      setLoading(false);
    }
  }, [uuid]);

  const handleDownloadPDF = async () => {
    toast.info('Generating e-Vaccination Certificate PDF...');

    try {
      const doc = <VaccinationCertificatePDF patient={patient} vaccinations={vaccinations} />;
      const blob = await pdf(doc).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Vaccination_Certificate_${patient?.name.replace(/\s+/g, '_')}_${patient?.uhid}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Certificate PDF downloaded successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate certificate PDF');
    }
  };

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto p-6 space-y-6">
        <SkeletonCard />
        <Loader />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="max-w-[600px] mx-auto my-12 p-8 text-center bg-white border border-red-100 rounded-lg shadow-md animate-fade-in">
        <p className="text-red-500 font-bold text-lg">Access Denied or Record Not Found</p>
        <p className="text-gray-500 text-sm mt-2">
          The link you used might be invalid, expired, or the patient ID does not match. Please contact KIDDOSCARE for support.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-8 px-4 animate-fade-in">
      {/* Welcome Banner */}
      <div className="max-w-[800px] mx-auto mb-6 bg-surface border border-border p-6 rounded-lg shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-primary tracking-tight">KIDDOSCARE E-Certificate</h1>
            <p className="text-sm text-secondary font-semibold mt-0.5">
              Verified immunization certificate for <span className="text-accent">{patient?.namePrefix} {patient?.name}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Summary grid */}
      <div className="max-w-[800px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-surface border border-border p-6 rounded-lg shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Vaccines Given</span>
          <span className="text-3xl font-extrabold text-status-completed-text mt-1">{summary?.completed || 0}</span>
          <span className="text-xs text-secondary mt-2 font-medium">Doses administered</span>
        </div>
        <div className="bg-surface border border-border p-6 rounded-lg shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Due & Upcoming</span>
          <span className="text-3xl font-extrabold text-accent mt-1">{summary?.pending || 0}</span>
          <span className="text-xs text-secondary mt-2 font-medium">Remaining pending doses</span>
        </div>
        <div className="bg-surface border border-border p-6 rounded-lg shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Next Appointment</span>
          <span className="text-sm font-bold text-primary mt-2">
            {summary?.nextDue ? dayjs(summary.nextDue).format('DD MMM YYYY') : 'Fully Immunized'}
          </span>
          <span className="text-xs text-secondary line-clamp-1 mt-1 font-semibold">
            {summary?.nextVaccineName || 'No vaccine pending'}
          </span>
        </div>
      </div>

      {/* Certificate layout */}
      <div className="max-w-[800px] mx-auto bg-surface border border-border rounded-lg shadow-sm p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-accent uppercase tracking-wider">
              e-Vaccination Certificate Preview
            </h3>
            <p className="text-xs text-secondary mt-0.5 font-medium">High fidelity interactive visual layout of U-WIN immunization certificate</p>
          </div>
          <button
            onClick={handleDownloadPDF}
            className="h-10 px-4 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4" /> Download Certificate PDF
          </button>
        </div>
        <div className="w-full overflow-x-auto pb-4 pt-2 flex justify-center bg-bg/50 rounded-lg border border-border p-4">
          <VaccinationCertificate patient={patient} vaccinations={vaccinations} />
        </div>
      </div>
    </div>
  );
};

export default PublicCertificate;
