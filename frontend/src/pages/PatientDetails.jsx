import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { pdf, Font } from '@react-pdf/renderer';

// Register Unicode font supporting Odia/Oriya script for @react-pdf/renderer
Font.register({
  family: 'Noto Sans Oriya',
  src: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/master/hinted/ttf/NotoSansOriya/NotoSansOriya-Regular.ttf'
});
import { VaccinationCertificatePDF } from '../components/VaccinationCertificatePDF';
import { getVaccList } from '../utils/vaccineDefaults';
import uwinLogo from '../assets/uwin-logo.png';
import govtLogo from '../assets/govt-logo.png';
import nhmLogo from '../assets/nhm-logo.png';
import drSignImg from '../assets/dr-sign.png';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  ArrowLeft,
  Printer,
  Bell,
  Download,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Send,
  MessageCircle
} from 'lucide-react';
import { Loader, SkeletonCard } from '../components/Loader';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
const groupVaccinationsByAge = (vaccList) => {
  const groups = [];
  const groupMap = {};
  
  vaccList.forEach((v) => {
    const age = v.ageLabel || 'Other';
    if (!groupMap[age]) {
      groupMap[age] = {
        ageLabel: age,
        vaccines: []
      };
      groups.push(groupMap[age]);
    }
    groupMap[age].vaccines.push(v);
  });
  
  return groups;
};

const formatTime12hr = (timeStr) => {
  if (!timeStr) return '--';
  const cleanTime = timeStr.replace(/-/g, ':'); // normalise dash format
  const parts = cleanTime.split(':');
  if (parts.length < 2) return cleanTime;
  
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const seconds = parts[2] || '00';
  
  if (isNaN(hours)) return cleanTime;
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  
  const strHours = hours < 10 ? '0' + hours : hours;
  
  return `${strHours}:${minutes}:${seconds} ${ampm}`;
};

const INVESTIGATION_TEMPLATES = {
  "Complete Blood Count (CBC)": [
    { name: "Hemoglobin (Hb)", unit: "g/dL", type: "number" },
    { name: "Total RBC Count", unit: "10⁶/mm³", type: "number" },
    { name: "PCV (Packed Volume)", unit: "%", type: "number" },
    { name: "MCV (Mean Corpuscular Volume)", unit: "fL", type: "number" },
    { name: "MCHC (Mean Corpuscular Hemoglobin Concentration)", unit: "g/dL", type: "number" },
    { name: "MCH (Mean Corpuscular Hemoglobin)", unit: "pg", type: "number" },
    { name: "Total Leucocyte Count", unit: "10³/mm³", type: "number" },
    { name: "Eosinophils Absolute Count", unit: "10³/mm³", type: "number" },
    { name: "Lymphocytes", unit: "%", type: "number" },
    { name: "Neutrophils", unit: "%", type: "number" },
    { name: "Eosinophils", unit: "%", type: "number" },
    { name: "Basophils", unit: "%", type: "number" },
    { name: "Monocytes", unit: "%", type: "number" },
    { name: "Platelet Count", unit: "10³/mm³", type: "number" },
    { name: "Peripheral Blood Smear (PBS)", unit: "", type: "text" },
    { name: "Erythrocyte Sedimentation Rate (ESR)", unit: "mm/hr", type: "number" }
  ],
  "Liver Function Test (LFT)": [
    { name: "Total Bilirubin", unit: "mg/dL", type: "number" },
    { name: "Direct Bilirubin", unit: "mg/dL", type: "number" },
    { name: "Indirect Bilirubin", unit: "mg/dL", type: "number" },
    { name: "AST / SGOT (Aspartate Aminotransferase)", unit: "U/L", type: "number" },
    { name: "ALT / SGPT (Alanine Aminotransferase)", unit: "U/L", type: "number" },
    { name: "SGOT / SGPT Ratio", unit: "Ratio", type: "number" },
    { name: "ALP (Alkaline Phosphatase)", unit: "U/L", type: "number" },
    { name: "Total Protein", unit: "g/dL", type: "number" },
    { name: "Albumin", unit: "g/dL", type: "number" },
    { name: "Globulin", unit: "g/dL", type: "number" },
    { name: "Albumin / Globulin Ratio (A/G Ratio)", unit: "Ratio", type: "number" },
    { name: "GGT (Gamma-Glutamyl Transferase)", unit: "U/L", type: "number" },
    { name: "Magnesium", unit: "mg/dL", type: "number" }
  ],
  "Cardiac & Inflammatory Profile (CRP)": [
    { name: "C-Reactive Protein (CRP), Serum (Quantitative)", unit: "mg/L", type: "number" }
  ],
  "Iron Profile": [
    { name: "TIBC (Total Iron Binding Capacity)", unit: "µg/dL", type: "number" },
    { name: "UIBC (Unsaturated Iron Binding Capacity)", unit: "µg/dL", type: "number" }
  ],
  "Pulmonary Function Test": [
    { name: "DLCO (Diffusing Capacity for Carbon Monoxide)", unit: "", type: "number" },
    { name: "Total Lung Capacity (TLC)", unit: "L", type: "number" },
    { name: "Residual Volume / Total Lung Capacity (RV/TLC)", unit: "%", type: "number" },
    { name: "Vital Capacity (VC)", unit: "mL", type: "number" },
    { name: "Inspiratory Capacity (IC)", unit: "mL", type: "number" },
    { name: "Forced Vital Capacity (FVC)", unit: "mL", type: "number" }
  ],
  "Fever Profile": [
    { name: "COVID-19 RT-PCR", unit: "", type: "text" }
  ],
  "Diabetes Profile": [
    { name: "Fasting Blood Sugar (FBS)", unit: "mg/dL", type: "number" },
    { name: "Post Prandial Blood Sugar (PPBS)", unit: "mg/dL", type: "number" },
    { name: "Random Blood Sugar (RBS)", unit: "mg/dL", type: "number" },
    { name: "HbA1c", unit: "%", type: "number" },
    { name: "Estimated Average Glucose (eAG)", unit: "mg/dL", type: "number" },
    { name: "Urine Sugar", unit: "", type: "select", options: ["", "Absent", "Present", "Trace", "+", "++", "+++", "++++"] },
    { name: "Urine Ketones", unit: "", type: "select", options: ["", "Absent", "Present", "Trace", "+", "++", "+++", "++++"] },
    { name: "Fasting Insulin", unit: "µIU/mL", type: "number" },
    { name: "C-Peptide", unit: "ng/mL", type: "number" }
  ],
  "Urine Routine & Microscopy": [
    { name: "Colour", unit: "", type: "text" },
    { name: "Appearance", unit: "", type: "text" },
    { name: "Specific Gravity", unit: "Ratio", type: "number" },
    { name: "pH", unit: "pH", type: "number" },
    { name: "Protein (Albumin)", unit: "", type: "select", options: ["", "Nil", "Trace", "+", "++", "+++", "++++"] },
    { name: "Glucose", unit: "", type: "select", options: ["", "Nil", "Trace", "+", "++", "+++", "++++"] },
    { name: "Ketones", unit: "", type: "select", options: ["", "Nil", "Trace", "+", "++", "+++", "++++"] },
    { name: "Bilirubin", unit: "", type: "select", options: ["", "Nil", "Trace", "+", "++", "+++", "++++"] },
    { name: "Urobilinogen", unit: "mg/dL", type: "number" },
    { name: "Nitrite", unit: "", type: "select", options: ["", "Negative", "Positive"] },
    { name: "Leukocyte Esterase", unit: "", type: "select", options: ["", "Negative", "Positive"] },
    { name: "RBC", unit: "/HPF", type: "number" },
    { name: "WBC (Pus Cells)", unit: "/HPF", type: "number" },
    { name: "Epithelial Cells", unit: "/HPF", type: "number" },
    { name: "Casts", unit: "/LPF", type: "number" },
    { name: "Crystals", unit: "/HPF", type: "number" },
    { name: "Bacteria", unit: "", type: "text" },
    { name: "Yeast Cells", unit: "", type: "text" }
  ],
  "Blood Grouping": [
    { name: "ABO Blood Group", unit: "", type: "select", options: ["", "A", "B", "AB", "O"] },
    { name: "Rh Factor", unit: "", type: "select", options: ["", "Positive", "Negative"] },
    { name: "Blood Group", unit: "", type: "auto" },
    { name: "Antibody Screening", unit: "", type: "select", options: ["", "Negative", "Positive"] },
    { name: "Cross Match", unit: "", type: "select", options: ["", "Compatible", "Incompatible"] }
  ],
  "Kidney Function Test": [
    { name: "Blood Urea", unit: "mg/dL", type: "number" },
    { name: "Serum Creatinine", unit: "mg/dL", type: "number" },
    { name: "Blood Urea Nitrogen (BUN)", unit: "mg/dL", type: "number" },
    { name: "Uric Acid", unit: "mg/dL", type: "number" },
    { name: "Sodium (Na⁺)", unit: "mmol/L", type: "number" },
    { name: "Potassium (K⁺)", unit: "mmol/L", type: "number" },
    { name: "Chloride (Cl⁻)", unit: "mmol/L", type: "number" },
    { name: "Calcium", unit: "mg/dL", type: "number" },
    { name: "Phosphorus", unit: "mg/dL", type: "number" },
    { name: "Estimated GFR (eGFR)", unit: "mL/min/1.73m²", type: "number" }
  ]
};

const getAutoBloodGroup = (abo, rh) => {
  if (!abo) return '';
  let rhSign = '';
  if (rh === 'Positive') rhSign = '+';
  else if (rh === 'Negative') rhSign = '-';
  else rhSign = rh; // Fallback
  return `${abo}${rhSign}`;
};

const parseNicuDetails = (nicuDetailsString) => {
  let d = {};
  try {
    d = JSON.parse(nicuDetailsString || '{}');
  } catch (e) {
    d = {};
  }
  
  let active = d.activeInvestigations || [];
  let invData = d.investigationData || {};

  // Backward compatibility migration for Urine Routine & Microscopy
  if ((d.bacteria || d.yeastCells) && !active.includes("Urine Routine & Microscopy")) {
    active = [...active, "Urine Routine & Microscopy"];
    invData = {
      ...invData,
      "Urine Routine & Microscopy": {
        ...invData["Urine Routine & Microscopy"],
        "Bacteria": d.bacteria || '',
        "Yeast Cells": d.yeastCells || ''
      }
    };
  }

  // Backward compatibility migration for Blood Grouping
  if ((d.aboBloodGroup || d.rhFactor) && !active.includes("Blood Grouping")) {
    active = [...active, "Blood Grouping"];
    let mappingRh = d.rhFactor || '';
    if (d.rhFactor === '+') mappingRh = 'Positive';
    if (d.rhFactor === '-') mappingRh = 'Negative';
    invData = {
      ...invData,
      "Blood Grouping": {
        ...invData["Blood Grouping"],
        "ABO Blood Group": d.aboBloodGroup || '',
        "Rh Factor": mappingRh
      }
    };
  }

  // Auto-generate blood group if missing or needs update
  if (active.includes("Blood Grouping")) {
    const bgData = invData["Blood Grouping"] || {};
    const abo = bgData["ABO Blood Group"] || '';
    const rh = bgData["Rh Factor"] || '';
    invData["Blood Grouping"] = {
      ...bgData,
      "Blood Group": getAutoBloodGroup(abo, rh)
    };
  }

  return { active, invData, raw: d };
};

const NicuPanel = ({ patient, onUpdate, API_URL }) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  const initialParsed = parseNicuDetails(patient.nicuDetails);
  
  // Parse details for view mode backward compatibility mapping
  const details = {
    ...initialParsed.raw,
    activeInvestigations: initialParsed.active,
    investigationData: initialParsed.invData,
    bloodGroup: (initialParsed.invData["Blood Grouping"] || {})["Blood Group"] || initialParsed.raw.bloodGroup || ''
  };

  const [fields, setFields] = useState({
    gestationalAge: details.gestationalAge || '',
    apgar1: details.apgar1 || '',
    apgar5: details.apgar5 || '',
    respiratorySupport: details.respiratorySupport || 'None',
    incubatorDays: details.incubatorDays || '',
    phototherapyDays: details.phototherapyDays || '',
    feedingType: details.feedingType || 'Oral feed',
    complications: details.complications || '',
    nicuNotes: details.nicuNotes || '',
    babyIpNo: details.babyIpNo || '',
    consultant: details.consultant || 'DR SHUBHA MAHANTY',
    timeOfBirth: (details.timeOfBirth || '').replace(/-/g, ':'),
    modeOfDelivery: details.modeOfDelivery || 'Normal Vaginal Delivery (NVD)',
    motherHighRisk: details.motherHighRisk || 'NO',
    chiefComplaints: details.chiefComplaints || '',
    conditionOnAdmission: details.conditionOnAdmission || '',
    hospitalCourse: details.hospitalCourse || '',
    treatmentGiven: details.treatmentGiven || ''
  });

  const [activeInvestigations, setActiveInvestigations] = useState(initialParsed.active);
  const [investigationData, setInvestigationData] = useState(initialParsed.invData);
  const [expandedSections, setExpandedSections] = useState(initialParsed.active);
  const [selectedInvestigationToAdd, setSelectedInvestigationToAdd] = useState('');
  const [expandedViewSections, setExpandedViewSections] = useState([]);

  // Sync state if patient changes
  useEffect(() => {
    const parsed = parseNicuDetails(patient.nicuDetails);
    setFields({
      gestationalAge: parsed.raw.gestationalAge || '',
      apgar1: parsed.raw.apgar1 || '',
      apgar5: parsed.raw.apgar5 || '',
      respiratorySupport: parsed.raw.respiratorySupport || 'None',
      incubatorDays: parsed.raw.incubatorDays || '',
      phototherapyDays: parsed.raw.phototherapyDays || '',
      feedingType: parsed.raw.feedingType || 'Oral feed',
      complications: parsed.raw.complications || '',
      nicuNotes: parsed.raw.nicuNotes || '',
      babyIpNo: parsed.raw.babyIpNo || '',
      consultant: parsed.raw.consultant || 'DR SHUBHA MAHANTY',
      timeOfBirth: (parsed.raw.timeOfBirth || '').replace(/-/g, ':'),
      modeOfDelivery: parsed.raw.modeOfDelivery || 'Normal Vaginal Delivery (NVD)',
      motherHighRisk: parsed.raw.motherHighRisk || 'NO',
      chiefComplaints: parsed.raw.chiefComplaints || '',
      conditionOnAdmission: parsed.raw.conditionOnAdmission || '',
      hospitalCourse: parsed.raw.hospitalCourse || '',
      treatmentGiven: parsed.raw.treatmentGiven || ''
    });
    setActiveInvestigations(parsed.active);
    setInvestigationData(parsed.invData);
    setExpandedSections(parsed.active);
    setExpandedViewSections([]);
  }, [patient]);

  const handleInvestigationFieldChange = (category, fieldName, value) => {
    setInvestigationData(prev => {
      const categoryData = { ...prev[category], [fieldName]: value };
      
      // Handle auto-generation of Blood Group
      if (category === "Blood Grouping") {
        if (fieldName === "ABO Blood Group" || fieldName === "Rh Factor") {
          const abo = fieldName === "ABO Blood Group" ? value : (categoryData["ABO Blood Group"] || '');
          const rh = fieldName === "Rh Factor" ? value : (categoryData["Rh Factor"] || '');
          categoryData["Blood Group"] = getAutoBloodGroup(abo, rh);
        }
      }
      
      return {
        ...prev,
        [category]: categoryData
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate date & time for all active investigations
      for (const category of activeInvestigations) {
        const data = investigationData[category] || {};
        if (!data.investigationDate || !data.investigationTime) {
          toast.error(`Please fill both Date and Time of Investigation for "${category}" before saving.`);
          return;
        }
      }

      const bloodGroupData = investigationData["Blood Grouping"] || {};
      const computedBloodGroup = bloodGroupData["Blood Group"] || '';

      const payload = {
        ...fields,
        activeInvestigations,
        investigationData,
        // Keep top level properties for backward compatibility
        aboBloodGroup: bloodGroupData["ABO Blood Group"] || '',
        rhFactor: bloodGroupData["Rh Factor"] === 'Positive' ? '+' : (bloodGroupData["Rh Factor"] === 'Negative' ? '-' : (bloodGroupData["Rh Factor"] || '')),
        bacteria: (investigationData["Urine Routine & Microscopy"] || {})["Bacteria"] || '',
        yeastCells: (investigationData["Urine Routine & Microscopy"] || {})["Yeast Cells"] || '',
        bloodGroup: computedBloodGroup
      };

      await axios.patch(`${API_URL}/patients/${patient.id}`, {
        nicuDetails: JSON.stringify(payload),
        bloodGroup: computedBloodGroup || undefined
      });
      toast.success('NICU clinical details updated successfully!');
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update NICU details');
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg shadow-sm p-6 space-y-6">
      <div className="flex justify-between items-center border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-accent uppercase tracking-wider">
            Neonatal Intensive Care Unit (NICU) Record
          </h3>
          <p className="text-xs text-secondary mt-0.5">Clinical metrics and progress details for premature or high-care newborns</p>
        </div>
        {user?.role === 'doctor' && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="h-9 px-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Edit2 className="w-4 h-4" /> Edit Record
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Administrative & Delivery Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-accent uppercase tracking-wider border-b border-border/60 pb-1.5">
              Birth & Administrative Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Baby IP No. (Manual)</label>
                <input
                  type="text"
                  placeholder="e.g. IP-98765"
                  value={fields.babyIpNo}
                  onChange={(e) => setFields(p => ({ ...p, babyIpNo: e.target.value }))}
                  className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Consultant</label>
                <input
                  type="text"
                  placeholder="e.g. DR SHUBHA MAHANTY"
                  value={fields.consultant}
                  onChange={(e) => setFields(p => ({ ...p, consultant: e.target.value }))}
                  className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Time of Birth</label>
                <input
                  type="time"
                  step="1"
                  value={fields.timeOfBirth}
                  onChange={(e) => setFields(p => ({ ...p, timeOfBirth: e.target.value }))}
                  className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Mode of Delivery</label>
                <select
                  value={fields.modeOfDelivery}
                  onChange={(e) => setFields(p => ({ ...p, modeOfDelivery: e.target.value }))}
                  className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
                >
                  <option value="Normal Vaginal Delivery (NVD)">Normal Vaginal Delivery (NVD)</option>
                  <option value="Lower Segment Cesarean Section (LSCS)">Lower Segment Cesarean Section (LSCS)</option>
                  <option value="Forceps Delivery">Forceps Delivery</option>
                  <option value="Vacuum Assisted Delivery">Vacuum Assisted Delivery</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Any High Risk in Mother</label>
                <select
                  value={fields.motherHighRisk}
                  onChange={(e) => setFields(p => ({ ...p, motherHighRisk: e.target.value }))}
                  className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
                >
                  <option value="NO">NO</option>
                  <option value="YES">YES</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Metrics */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-accent uppercase tracking-wider border-b border-border/60 pb-1.5">
              NICU Care & Clinical Metrics
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Gestational Age (weeks)</label>
                <input
                  type="text"
                  placeholder="e.g. 34 weeks + 3 days"
                  value={fields.gestationalAge}
                  onChange={(e) => setFields(p => ({ ...p, gestationalAge: e.target.value }))}
                  className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">APGAR Score (1 Min)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  placeholder="0 - 10"
                  value={fields.apgar1}
                  onChange={(e) => setFields(p => ({ ...p, apgar1: e.target.value }))}
                  className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">APGAR Score (5 Min)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  placeholder="0 - 10"
                  value={fields.apgar5}
                  onChange={(e) => setFields(p => ({ ...p, apgar5: e.target.value }))}
                  className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Respiratory Support</label>
                <select
                  value={fields.respiratorySupport}
                  onChange={(e) => setFields(p => ({ ...p, respiratorySupport: e.target.value }))}
                  className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
                >
                  <option value="None">None</option>
                  <option value="O2 Mask / Nasal Cannula">O2 Mask / Nasal Cannula</option>
                  <option value="HFNC (High Flow Nasal Cannula)">HFNC (High Flow Nasal Cannula)</option>
                  <option value="CPAP">CPAP</option>
                  <option value="Mechanical Ventilation">Mechanical Ventilation</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Incubator Stay (Days)</label>
                <input
                  type="number"
                  placeholder="Number of days"
                  value={fields.incubatorDays}
                  onChange={(e) => setFields(p => ({ ...p, incubatorDays: e.target.value }))}
                  className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Phototherapy Stay (Days)</label>
                <input
                  type="number"
                  placeholder="Number of days"
                  value={fields.phototherapyDays}
                  onChange={(e) => setFields(p => ({ ...p, phototherapyDays: e.target.value }))}
                  className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Feeding Status</label>
                <select
                  value={fields.feedingType}
                  onChange={(e) => setFields(p => ({ ...p, feedingType: e.target.value }))}
                  className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
                >
                  <option value="Oral feed">Oral feed</option>
                  <option value="TPN (Total Parenteral Nutrition)">TPN (Total Parenteral Nutrition)</option>
                  <option value="Gavage / NG Tube feed">Gavage / NG Tube feed</option>
                  <option value="NPO (Nil Per Os)">NPO (Nil Per Os)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-bold text-secondary uppercase">Complications / Diagnoses</label>
                <input
                  type="text"
                  placeholder="e.g. Neonatal Jaundice, RDS, Sepsis"
                  value={fields.complications}
                  onChange={(e) => setFields(p => ({ ...p, complications: e.target.value }))}
                  className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Narrative Texts */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-accent uppercase tracking-wider border-b border-border/60 pb-1.5">
              Clinical Narratives & Hospital Course
            </h4>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Chief Complaints (text box)</label>
                <textarea
                  rows="2"
                  placeholder="Enter chief complaints..."
                  value={fields.chiefComplaints}
                  onChange={(e) => setFields(p => ({ ...p, chiefComplaints: e.target.value }))}
                  className="border border-border rounded p-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent resize-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Condition During Admission (text box)</label>
                <textarea
                  rows="2"
                  placeholder="Enter condition during admission..."
                  value={fields.conditionOnAdmission}
                  onChange={(e) => setFields(p => ({ ...p, conditionOnAdmission: e.target.value }))}
                  className="border border-border rounded p-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent resize-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Course During Hospitalization (text box)</label>
                <textarea
                  rows="2"
                  placeholder="Enter medical course and interventions during hospitalization..."
                  value={fields.hospitalCourse}
                  onChange={(e) => setFields(p => ({ ...p, hospitalCourse: e.target.value }))}
                  className="border border-border rounded p-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent resize-none"
                />
              </div>
              {/* Dynamic Investigation Section */}
              <div className="border border-border rounded-xl p-4 bg-bg/10 space-y-4">
                <div className="flex justify-between items-center border-b border-border/40 pb-2">
                  <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Investigations Setup</span>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-secondary uppercase">Select Investigation</label>
                    <select
                      value={selectedInvestigationToAdd}
                      onChange={(e) => setSelectedInvestigationToAdd(e.target.value)}
                      className="h-10 border border-border rounded-lg px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent w-full"
                    >
                      <option value="">-- Choose an Investigation --</option>
                      {Object.keys(INVESTIGATION_TEMPLATES).map((name) => {
                        const isAdded = activeInvestigations.includes(name);
                        return (
                          <option key={name} value={name}>
                            {name} {isAdded ? ' (Added)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={!selectedInvestigationToAdd}
                      onClick={() => {
                        if (selectedInvestigationToAdd) {
                          if (activeInvestigations.includes(selectedInvestigationToAdd)) {
                            if (!expandedSections.includes(selectedInvestigationToAdd)) {
                              setExpandedSections(prev => [...prev, selectedInvestigationToAdd]);
                            }
                            toast.info(`${selectedInvestigationToAdd} is already added and now expanded.`);
                          } else {
                            setActiveInvestigations(prev => [...prev, selectedInvestigationToAdd]);
                            setExpandedSections(prev => [...prev, selectedInvestigationToAdd]);
                            toast.success(`Added ${selectedInvestigationToAdd}`);
                          }
                          setSelectedInvestigationToAdd('');
                        }
                      }}
                      className={`h-10 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto ${
                        !selectedInvestigationToAdd
                          ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                          : activeInvestigations.includes(selectedInvestigationToAdd)
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed font-medium'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-95'
                      }`}
                    >
                      {selectedInvestigationToAdd && activeInvestigations.includes(selectedInvestigationToAdd) ? (
                        <span className="flex items-center gap-1 font-bold">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Added ✓
                        </span>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" /> Add
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* List of active investigations in edit mode */}
                {activeInvestigations.length === 0 ? (
                  <p className="text-xs text-secondary/70 italic text-center py-2">No investigations added yet. Select one above and click Add.</p>
                ) : (
                  <div className="space-y-3 mt-3">
                    {activeInvestigations.map((category) => {
                      const isExpanded = expandedSections.includes(category);
                      const fieldsList = INVESTIGATION_TEMPLATES[category] || [];
                      const data = investigationData[category] || {};
                      
                      return (
                        <div key={category} className="border border-border/70 rounded-lg overflow-hidden bg-surface transition-all duration-200">
                          {/* Accordion Header */}
                          <div 
                            className="flex justify-between items-center px-4 py-2.5 bg-bg/25 hover:bg-bg/40 cursor-pointer select-none border-b border-border/30"
                            onClick={() => {
                              setExpandedSections(prev => 
                                isExpanded ? prev.filter(c => c !== category) : [...prev, category]
                              );
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`transform transition-transform text-secondary text-[10px] ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                              <span className="text-xs font-bold text-primary uppercase">{category}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Are you sure you want to remove the ${category} section? All entered data for this test will be lost.`)) {
                                  setActiveInvestigations(prev => prev.filter(c => c !== category));
                                  setExpandedSections(prev => prev.filter(c => c !== category));
                                  setInvestigationData(prev => {
                                    const updated = { ...prev };
                                    delete updated[category];
                                    return updated;
                                  });
                                  toast.info(`Removed ${category}`);
                                }
                              }}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded transition-colors"
                              title={`Remove ${category}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Accordion Fields */}
                          {isExpanded && (
                            <div className="p-4 bg-surface space-y-4">
                              {/* Date & Time fields at the top */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-border/40">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold text-accent uppercase flex items-center gap-1">
                                    <span>Date of Investigation</span>
                                    <span className="text-rose-500">*</span>
                                  </label>
                                  <input
                                    type="date"
                                    required
                                    value={data.investigationDate || ''}
                                    onChange={(e) => handleInvestigationFieldChange(category, "investigationDate", e.target.value)}
                                    className="h-10 border border-border rounded-lg px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent w-full"
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold text-accent uppercase flex items-center gap-1">
                                    <span>Time of Investigation</span>
                                    <span className="text-rose-500">*</span>
                                  </label>
                                  <input
                                    type="time"
                                    required
                                    value={data.investigationTime || ''}
                                    onChange={(e) => handleInvestigationFieldChange(category, "investigationTime", e.target.value)}
                                    className="h-10 border border-border rounded-lg px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent w-full"
                                  />
                                </div>
                              </div>

                              {/* Sub-category fields */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {fieldsList.map((f) => {
                                  const value = data[f.name] || '';
                                  const isDisabled = !data.investigationDate || !data.investigationTime;
                                  
                                  return (
                                    <div key={f.name} className="flex flex-col gap-1">
                                      <label className="text-[10px] font-bold text-secondary uppercase flex justify-between">
                                        <span>{f.name}</span>
                                        {f.unit && <span className="text-secondary/70 lowercase font-medium">({f.unit})</span>}
                                      </label>
                                      {f.type === "select" ? (
                                        <select
                                          disabled={isDisabled}
                                          value={value}
                                          onChange={(e) => handleInvestigationFieldChange(category, f.name, e.target.value)}
                                          className={`h-10 border border-border rounded-lg px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent w-full ${isDisabled ? 'opacity-50 cursor-not-allowed bg-bg' : ''}`}
                                        >
                                          {f.options.map(opt => (
                                            <option key={opt} value={opt}>{opt || 'Select...'}</option>
                                          ))}
                                        </select>
                                      ) : f.type === "auto" ? (
                                        <input
                                          type="text"
                                          readOnly
                                          disabled
                                          value={value || '--'}
                                          className="h-10 border border-border rounded-lg px-3 text-sm text-secondary bg-bg focus:outline-none font-bold w-full"
                                        />
                                      ) : (
                                        <input
                                          type={f.type}
                                          disabled={isDisabled}
                                          placeholder={isDisabled ? "Fill Date & Time first" : (f.unit ? `Value (${f.unit})` : `Value`)}
                                          value={value}
                                          onChange={(e) => handleInvestigationFieldChange(category, f.name, e.target.value)}
                                          className={`h-10 border border-border rounded-lg px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent w-full ${isDisabled ? 'opacity-50 cursor-not-allowed bg-bg' : ''}`}
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Treatment Given */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Treatment Given (text box)</label>
                <textarea
                  rows="3"
                  placeholder="Enter treatment details and medications administered..."
                  value={fields.treatmentGiven}
                  onChange={(e) => setFields(p => ({ ...p, treatmentGiven: e.target.value }))}
                  className="border border-border rounded p-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent resize-none"
                />
              </div>

              {/* Clinician Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Clinician Notes</label>
                <textarea
                  rows="3"
                  placeholder="Discharge recommendations, clinical progress notes..."
                  value={fields.nicuNotes}
                  onChange={(e) => setFields(p => ({ ...p, nicuNotes: e.target.value }))}
                  className="border border-border rounded p-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="h-10 px-4 text-xs font-bold border border-border bg-surface hover:bg-bg rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-4 text-xs font-bold bg-[#0F766E] hover:bg-[#0d645e] text-white rounded-lg"
            >
              Save Details
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Card 1: Administrative & Delivery Details */}
            <div className="bg-bg/40 border border-border/80 rounded-lg p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase">Baby IP No.</p>
                <p className="text-sm font-bold text-primary mt-0.5">{details.babyIpNo || '--'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase">Consultant</p>
                <p className="text-sm font-bold text-primary mt-0.5">{details.consultant || 'DR SHUBHA MAHANTY'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase">Time of Birth</p>
                <p className="text-sm font-bold text-primary mt-0.5">{formatTime12hr(details.timeOfBirth)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase">Mode of Delivery</p>
                <p className="text-sm font-bold text-primary mt-0.5">{details.modeOfDelivery || '--'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-secondary uppercase">Any High Risk in Mother</p>
                <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded border mt-1 ${details.motherHighRisk === 'YES' ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200'}`}>
                  {details.motherHighRisk || 'NO'}
                </span>
              </div>
            </div>

            {/* Card 2: Clinical Metrics */}
            <div className="bg-bg/40 border border-border/80 rounded-lg p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase">Gestational Age</p>
                <p className="text-sm font-bold text-primary mt-0.5">{details.gestationalAge || '--'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase">APGAR Score</p>
                <p className="text-sm font-bold text-primary mt-0.5">
                  {details.apgar1 || details.apgar5 ? `${details.apgar1 || '--'} (1m) / ${details.apgar5 || '--'} (5m)` : '--'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase">Incubator Days</p>
                <p className="text-sm font-bold text-primary mt-0.5">{details.incubatorDays ? `${details.incubatorDays} days` : '--'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase">Phototherapy</p>
                <p className="text-sm font-bold text-primary mt-0.5">{details.phototherapyDays ? `${details.phototherapyDays} days` : '--'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase">Respiratory Support</p>
                <span className="inline-block text-xs font-bold text-accent bg-accent-soft px-2.5 py-1 rounded border border-accent/15 mt-1">
                  {details.respiratorySupport || 'None'}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase">Feeding Status</p>
                <span className="inline-block text-xs font-bold text-secondary bg-bg px-2.5 py-1 rounded border border-border mt-1">
                  {details.feedingType || 'Oral feed'}
                </span>
              </div>
            </div>

            {/* Card 3: Investigations */}
            <div className="bg-bg/40 border border-border/80 rounded-lg p-4 space-y-4">
              <div className="border-b border-border/60 pb-1.5 mb-1">
                <p className="text-xs font-bold text-accent uppercase tracking-wider">Investigations</p>
              </div>
              
              {activeInvestigations.length === 0 ? (
                <p className="text-xs text-secondary italic">No investigations recorded.</p>
              ) : (
                <div className="space-y-3">
                  {activeInvestigations.map((category) => {
                    const templateFields = INVESTIGATION_TEMPLATES[category] || [];
                    const data = investigationData[category] || {};
                    const isExpanded = expandedViewSections.includes(category);
                    
                    const filledFields = templateFields.filter(f => data[f.name] !== undefined && data[f.name] !== '');
                    
                    // If no values, date, or time recorded, don't show card
                    if (filledFields.length === 0 && !data.investigationDate && !data.investigationTime) return null;
                    
                    return (
                      <div key={category} className="border border-border/60 rounded-xl overflow-hidden bg-surface shadow-sm transition-all duration-200">
                        {/* Header (Clickable to Toggle) */}
                        <div 
                          className="flex justify-between items-center px-4 py-2.5 bg-bg/20 hover:bg-bg/30 cursor-pointer select-none transition-colors"
                          onClick={() => {
                            setExpandedViewSections(prev => 
                              isExpanded ? prev.filter(c => c !== category) : [...prev, category]
                            );
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`transform transition-transform text-secondary text-[10px] ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                            <span className="text-xs font-bold text-primary uppercase tracking-wide">{category}</span>
                          </div>
                          {(data.investigationDate || data.investigationTime) && (
                            <span className="text-[9px] font-bold text-secondary bg-surface px-2 py-0.5 rounded border border-border/80">
                              {data.investigationDate ? dayjs(data.investigationDate).format('DD/MM/YYYY') : ''}
                              {data.investigationDate && data.investigationTime ? ' @ ' : ''}
                              {data.investigationTime ? formatTime12hr(data.investigationTime) : ''}
                            </span>
                          )}
                        </div>

                        {/* Collapsible Content */}
                        {isExpanded && (
                          <div className="p-4 border-t border-border/40 bg-surface">
                            {filledFields.length === 0 ? (
                              <p className="text-xs text-secondary/70 italic">No values recorded.</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                                {filledFields.map(f => (
                                  <div key={f.name} className="flex justify-between items-center text-xs py-1 border-b border-border/5">
                                    <span className="text-secondary/90 font-medium">{f.name}</span>
                                    <span className="font-bold text-primary text-right">
                                      {data[f.name]}
                                      {f.unit && <span className="text-[9px] text-secondary font-medium lowercase ml-0.5"> {f.unit}</span>}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Clinical Textboxes */}
          <div className="bg-bg/40 border border-border/80 rounded-lg p-4 space-y-4">
            <div>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Chief Complaints</p>
              <p className="text-sm font-normal text-primary mt-1 whitespace-pre-wrap break-words leading-relaxed">
                {details.chiefComplaints || 'No complaints recorded.'}
              </p>
            </div>
            <div className="border-t border-border/60 pt-3">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Condition During Admission</p>
              <p className="text-sm font-normal text-primary mt-1 whitespace-pre-wrap break-words leading-relaxed">
                {details.conditionOnAdmission || 'No admission condition details recorded.'}
              </p>
            </div>
            <div className="border-t border-border/60 pt-3">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Course During Hospitalization</p>
              <p className="text-sm font-normal text-primary mt-1 whitespace-pre-wrap break-words leading-relaxed">
                {details.hospitalCourse || 'No course during hospitalization details recorded.'}
              </p>
            </div>
            <div className="border-t border-border/60 pt-3">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Treatment Given</p>
              <p className="text-sm font-normal text-primary mt-1 whitespace-pre-wrap break-words leading-relaxed">
                {details.treatmentGiven || 'No treatment details recorded.'}
              </p>
            </div>
            <div className="border-t border-border/60 pt-3">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Diagnoses & Complications</p>
              <p className="text-sm font-normal text-primary mt-1 whitespace-pre-wrap break-words leading-relaxed">
                {details.complications || 'No complications recorded.'}
              </p>
            </div>
            <div className="border-t border-border/60 pt-3">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Clinician Notes</p>
              <p className="text-xs font-normal text-secondary mt-1 whitespace-pre-wrap break-words leading-relaxed">
                {details.nicuNotes || 'No notes available.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DischargePanel = ({ patient, onUpdate, API_URL }) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  const nicuData = parseNicuDetails(patient.nicuDetails);
  const discharge = nicuData.raw.dischargeDetails || {};
  
  const [fields, setFields] = useState({
    doa: discharge.doa || (patient.dateOfBirth ? dayjs(patient.dateOfBirth).format('YYYY-MM-DD') : ''),
    dod: discharge.dod || dayjs().format('YYYY-MM-DD'),
    dischargeWeight: discharge.dischargeWeight || '',
    dischargeHeadCircumference: discharge.dischargeHeadCircumference || '',
    dischargeLength: discharge.dischargeLength || '',
    dischargeCondition: discharge.dischargeCondition || '',
    adviceOnDischarge: discharge.adviceOnDischarge || '',
    
    chiefComplaints: '',
    conditionOnAdmission: '',
    hospitalCourse: '',
    treatmentGiven: '',
    complications: ''
  });

  // Helper to load or sync fields
  const syncFields = (nd, d) => {
    return {
      doa: d.doa || (patient.dateOfBirth ? dayjs(patient.dateOfBirth).format('YYYY-MM-DD') : ''),
      dod: d.dod || dayjs().format('YYYY-MM-DD'),
      dischargeWeight: d.dischargeWeight || '',
      dischargeHeadCircumference: d.dischargeHeadCircumference || '',
      dischargeLength: d.dischargeLength || '',
      dischargeCondition: d.dischargeCondition || '',
      adviceOnDischarge: d.adviceOnDischarge || '',
      
      chiefComplaints: d.chiefComplaints !== undefined ? d.chiefComplaints : (nd.raw.chiefComplaints || ''),
      conditionOnAdmission: d.conditionOnAdmission !== undefined ? d.conditionOnAdmission : (nd.raw.conditionOnAdmission || ''),
      hospitalCourse: d.hospitalCourse !== undefined ? d.hospitalCourse : (nd.raw.hospitalCourse || ''),
      treatmentGiven: d.treatmentGiven !== undefined ? d.treatmentGiven : (nd.raw.treatmentGiven || ''),
      complications: d.complications !== undefined ? d.complications : (nd.raw.complications || '')
    };
  };

  // Initial state load
  useEffect(() => {
    const nd = parseNicuDetails(patient.nicuDetails);
    const d = nd.raw.dischargeDetails || {};
    setFields(syncFields(nd, d));
  }, [patient]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const existingNicu = parseNicuDetails(patient.nicuDetails).raw;
      const updatedNicu = {
        ...existingNicu,
        // Update main narratives so they stay synchronized with NICU tab
        chiefComplaints: fields.chiefComplaints,
        conditionOnAdmission: fields.conditionOnAdmission,
        hospitalCourse: fields.hospitalCourse,
        treatmentGiven: fields.treatmentGiven,
        complications: fields.complications,
        
        // Save discharge-specific details
        dischargeDetails: {
          doa: fields.doa,
          dod: fields.dod,
          dischargeWeight: fields.dischargeWeight,
          dischargeHeadCircumference: fields.dischargeHeadCircumference,
          dischargeLength: fields.dischargeLength,
          dischargeCondition: fields.dischargeCondition,
          adviceOnDischarge: fields.adviceOnDischarge,
          
          // Narrative duplicates stored in dischargeDetails
          chiefComplaints: fields.chiefComplaints,
          conditionOnAdmission: fields.conditionOnAdmission,
          hospitalCourse: fields.hospitalCourse,
          treatmentGiven: fields.treatmentGiven,
          complications: fields.complications
        }
      };

      await axios.patch(`${API_URL}/patients/${patient.id}`, {
        nicuDetails: JSON.stringify(updatedNicu)
      });
      toast.success('Neonatal Discharge Summary updated successfully!');
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update Discharge Summary details');
    }
  };

  const getMostRecentInvestigations = () => {
    const active = nicuData.active || [];
    const invData = nicuData.invData || {};
    
    const list = active.map(category => {
      const data = invData[category] || {};
      return {
        category,
        date: data.investigationDate || '',
        time: data.investigationTime || ''
      };
    }).filter(item => item.date !== '');
    
    list.sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time || '00:00'}`);
      const dateTimeB = new Date(`${b.date}T${b.time || '00:00'}`);
      return dateTimeB - dateTimeA;
    });
    
    return list;
  };

  const recentInvestigations = getMostRecentInvestigations();

  const handlePrintDischarge = () => {
    const printWindow = window.open('', '_blank');
    
    const formatDate = (dStr) => dStr ? dayjs(dStr).format('DD/MM/YYYY') : '--';
    const formatTime = (tStr) => tStr ? formatTime12hr(tStr) : '--';
    
    const investigationsHTML = recentInvestigations.length === 0
      ? '<p style="color:#6b7280; font-style:italic; font-size:12px;">No investigations recorded.</p>'
      : '<ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #1f2937;">' + 
        recentInvestigations.map(inv => `
          <li style="margin-bottom: 4px;">
            <strong>${inv.category}</strong> 
            <span style="color: #6b7280; font-size: 11px; margin-left: 6px;">(${formatDate(inv.date)}${inv.time ? ' @ ' + formatTime(inv.time) : ''})</span>
          </li>
        `).join('') + 
        '</ul>';

    printWindow.document.write(`
      <html>
      <head>
        <title>Discharge Summary - ${patient?.name}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Oriya:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          html, body { height: auto; }
          body { font-family: 'Inter', sans-serif; background-color: #ffffff; color: #111827; padding: 10px; font-size: 11.5px; line-height: 1.5; }
          .container { max-width: 800px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); height: auto; }
          .header { border-bottom: 2px double #2563eb; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
          .header-left h1 { margin: 0; font-size: 20px; color: #2563eb; font-weight: 800; letter-spacing: -0.5px; }
          .header-left p { margin: 2px 0 0 0; font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; }
          .header-right { text-align: right; }
          .header-right h2 { margin: 0; font-size: 14px; color: #1f2937; font-weight: 700; }
          .header-right p { margin: 2px 0 0 0; font-size: 10px; color: #4b5563; }
          
          .section-title { font-size: 11.5px; font-weight: 700; text-transform: uppercase; background-color: #eff6ff; color: #2563eb; padding: 5px 10px; border-left: 3px solid #2563eb; margin: 12px 0 6px 0; letter-spacing: 0.5px; page-break-after: avoid; break-after: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          
          th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          
          .grid-2 { display: grid; grid-template-cols: 1fr 1fr; gap: 12px; }
          
          .card-block {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 12px 12px 12px;
            background-color: #f8fafc;
            box-sizing: border-box;
            height: 100%;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Prevent page-break inside content blocks */
          .grid-2, .grid-2 > div, .card-block, table, tr, .text-block, .signature-box { page-break-inside: avoid; break-inside: avoid; }
          
          .data-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; table-layout: fixed; }
          .data-label { font-weight: 500; color: #4b5563; font-size: 11.5px; padding: 3px 0; vertical-align: top; width: 42%; }
          .data-colon { font-weight: 500; color: #6b7280; font-size: 11.5px; padding: 3px 0; vertical-align: top; text-align: center; width: 15px; }
          .data-val { color: #111827; font-weight: 600; font-size: 11.5px; padding: 3px 0; vertical-align: top; word-break: break-word; word-wrap: break-word; overflow-wrap: break-word; width: calc(58% - 15px); }
          
          .text-block { font-size: 11.5px; color: #111827; line-height: 1.5; white-space: pre-wrap; padding: 2px 0; font-weight: 500; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; }
          
          .odia-text { font-family: 'Noto Sans Oriya', sans-serif; line-height: 1.4; font-size: 11px; }
          
          .footer { margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; }
          .signature-box { text-align: right; width: 220px; }
          
          @media print {
            html, body { height: auto; }
            body { padding: 0; }
            .container { border: none; box-shadow: none; padding: 0; max-width: 100%; height: auto; }
            button { display: none; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-left">
              <h1>NEONATAL DISCHARGE SUMMARY</h1>
              <p>Department of Neonatology - ${patient?.clinicName || 'Clinic Record'}</p>
            </div>
            <div class="header-right">
              <h2>UHID: ${patient?.uhid}</h2>
              <p>IP No: ${nicuData.raw.babyIpNo || '--'}</p>
            </div>
          </div>
          
          <!-- Unified Side-by-Side Table for Header Information & Neonatal Details -->
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #9ca3af; margin-bottom: 12px; font-size: 11.5px;">
            <thead>
              <tr style="border-bottom: 1px solid #9ca3af;">
                <th style="width: 50%; text-align: left; padding: 5px 10px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; background-color: #eff6ff; color: #2563eb; border-left: 3px solid #2563eb; letter-spacing: 0.5px; border-right: 1px solid #9ca3af;">1. HEADER INFORMATION</th>
                <th style="width: 50%; text-align: left; padding: 5px 10px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; background-color: #eff6ff; color: #2563eb; border-left: 3px solid #2563eb; letter-spacing: 0.5px;">2. NEONATAL DETAILS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <!-- Left Column (Header Information) -->
                <td style="width: 50%; padding: 6px 10px; vertical-align: top; border-right: 1px solid #9ca3af;">
                  <table class="data-table" style="margin-bottom: 0;">
                    <tr>
                      <td class="data-label">Baby IP No.</td>
                      <td class="data-colon">:</td>
                      <td class="data-val">${nicuData.raw.babyIpNo || '--'}</td>
                    </tr>
                    <tr>
                      <td class="data-label">Consultant</td>
                      <td class="data-colon">:</td>
                      <td class="data-val">${nicuData.raw.consultant || 'DR SHUBHA MAHANTY'}</td>
                    </tr>
                    <tr>
                      <td class="data-label">Mother's Name</td>
                      <td class="data-colon">:</td>
                      <td class="data-val">${patient?.motherName || '--'}</td>
                    </tr>
                    <tr>
                      <td class="data-label">Father's Name</td>
                      <td class="data-colon">:</td>
                      <td class="data-val">${patient?.parentName || '--'}</td>
                    </tr>
                    <tr>
                      <td class="data-label">Address</td>
                      <td class="data-colon">:</td>
                      <td class="data-val">${patient?.address || '--'}</td>
                    </tr>
                    <tr>
                      <td class="data-label">Mobile No.</td>
                      <td class="data-colon">:</td>
                      <td class="data-val">${patient?.mobile || '--'}</td>
                    </tr>
                    <tr>
                      <td class="data-label">Admission (DOA)</td>
                      <td class="data-colon">:</td>
                      <td class="data-val">${formatDate(fields.doa)}</td>
                    </tr>
                    <tr>
                      <td class="data-label">Discharge (DOD)</td>
                      <td class="data-colon">:</td>
                      <td class="data-val">${formatDate(fields.dod)}</td>
                    </tr>
                  </table>
                </td>
                
                <!-- Right Column (Neonatal Details) -->
                <td style="width: 50%; padding: 6px 10px; vertical-align: top;">
                  <table class="data-table" style="margin-bottom: 0;">
                    <tr>
                      <td class="data-label">Date of Birth</td>
                      <td class="data-colon">:</td>
                      <td class="data-val">${formatDate(patient?.dateOfBirth)}</td>
                    </tr>
                    <tr>
                      <td class="data-label">Gender</td>
                      <td class="data-colon">:</td>
                      <td class="data-val">${patient?.gender?.toUpperCase() || '--'}</td>
                    </tr>
                    <tr>
                      <td class="data-label">Time of Birth</td>
                      <td class="data-colon">:</td>
                      <td class="data-val">${formatTime(nicuData.raw.timeOfBirth)}</td>
                    </tr>
                    <tr>
                      <td class="data-label">Birth Weight</td>
                      <td class="data-colon">:</td>
                      <td class="data-val">${patient?.birthWeight ? patient.birthWeight + ' kg' : '--'}</td>
                    </tr>
                    <tr>
                      <td class="data-label">Gestation Age</td>
                      <td class="data-colon">:</td>
                      <td class="data-val">${nicuData.raw.gestationalAge || '--'}</td>
                    </tr>
                    <tr>
                      <td class="data-label">Mode Delivery</td>
                      <td class="data-colon">:</td>
                      <td class="data-val">${nicuData.raw.modeOfDelivery || '--'}</td>
                    </tr>
                    <tr>
                      <td class="data-label">High risk in mother</td>
                      <td class="data-colon">:</td>
                      <td class="data-val">${nicuData.raw.motherHighRisk || 'NO'}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
          
          <!-- APGAR score and Diagnosis (Side by Side) -->
          <div class="grid-2">
            <div>
              <div class="section-title">3. APGAR Details</div>
              <table class="data-table">
                <tr>
                  <td class="data-label" style="width: 40%;">APGAR Score</td>
                  <td class="data-colon" style="width: 15px;">:</td>
                  <td class="data-val" style="width: calc(60% - 15px);">${nicuData.raw.apgar1 || '--'} (1 Min) / ${nicuData.raw.apgar5 || '--'} (5 Min)</td>
                </tr>
              </table>
            </div>
            <div>
              <div class="section-title">4. Diagnosis</div>
              <div class="text-block">${fields.complications || 'None recorded.'}</div>
            </div>
          </div>
          
          <!-- Chief complaints and Condition Admission (Side by Side) -->
          <div class="grid-2">
            <div>
              <div class="section-title">5. Chief Complaints</div>
              <div class="text-block">${fields.chiefComplaints || 'None recorded.'}</div>
            </div>
            <div>
              <div class="section-title">6. Condition During Admission</div>
              <div class="text-block">${fields.conditionOnAdmission || 'None recorded.'}</div>
            </div>
          </div>
          
          <div class="section-title">7. Course During Hospitalization</div>
          <div class="text-block">${fields.hospitalCourse || 'None recorded.'}</div>
          
          <!-- Investigations and Treatment Given (Side by Side) -->
          <div class="grid-2">
            <div>
              <div class="section-title">8. Recent Investigations (Categories Only)</div>
              <div style="padding: 2px 0;">
                ${investigationsHTML}
              </div>
            </div>
            <div>
              <div class="section-title">9. Treatment Given</div>
              <div class="text-block">${fields.treatmentGiven || 'None recorded.'}</div>
            </div>
          </div>


          <!-- Unified Side-by-Side Table for Discharge Details & Condition on Discharge -->
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #9ca3af; margin-top: 16px; margin-bottom: 12px; font-size: 11.5px; page-break-inside: avoid; break-inside: avoid;">
            <thead>
              <tr style="border-bottom: 1px solid #9ca3af;">
                <th style="width: 50%; text-align: left; padding: 5px 10px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; background-color: #eff6ff; color: #2563eb; border-left: 3px solid #2563eb; letter-spacing: 0.5px; border-right: 1px solid #9ca3af;">10. DISCHARGE DETAILS</th>
                <th style="width: 50%; text-align: left; padding: 5px 10px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; background-color: #eff6ff; color: #2563eb; border-left: 3px solid #2563eb; letter-spacing: 0.5px;">11. CONDITION ON DISCHARGE</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <!-- Left Column (Discharge Details) -->
                <td style="width: 50%; padding: 6px 10px; vertical-align: top; border-right: 1px solid #9ca3af;">
                  <div class="grid-2" style="gap: 6px;">
                    <table class="data-table" style="margin-bottom: 0;">
                      <tr>
                        <td class="data-label" style="width: 50%;">DOD</td>
                        <td class="data-colon" style="width: 15px;">:</td>
                        <td class="data-val" style="width: calc(50% - 15px);">${formatDate(fields.dod)}</td>
                      </tr>
                      <tr>
                        <td class="data-label">Weight</td>
                        <td class="data-colon">:</td>
                        <td class="data-val">${fields.dischargeWeight ? fields.dischargeWeight + ' kg' : '--'}</td>
                      </tr>
                    </table>
                    <table class="data-table" style="margin-bottom: 0;">
                      <tr>
                        <td class="data-label" style="width: 50%;">Head Circ.</td>
                        <td class="data-colon" style="width: 15px;">:</td>
                        <td class="data-val" style="width: calc(50% - 15px);">${fields.dischargeHeadCircumference ? fields.dischargeHeadCircumference + ' cm' : '--'}</td>
                      </tr>
                      <tr>
                        <td class="data-label">Length</td>
                        <td class="data-colon">:</td>
                        <td class="data-val">${fields.dischargeLength ? fields.dischargeLength + ' cm' : '--'}</td>
                      </tr>
                    </table>
                  </div>
                </td>
                
                <!-- Right Column (Condition on Discharge) -->
                <td style="width: 50%; padding: 6px 10px; vertical-align: top;">
                  <div class="text-block" style="padding-top: 0;">${fields.dischargeCondition || 'Good / Stable.'}</div>
                </td>
              </tr>
            </tbody>
          </table>
          
          <!-- Advice on Discharge and Follow Up (Side by Side) -->
          <div class="grid-2">
            <div>
              <div class="section-title">12. Advice on Discharge <span class="odia-text" style="font-size: 10px; font-weight: 700;">(ପ୍ରତିଦିନ ଖାଇବା ଔଷଧର ତାଲିକା)</span></div>
              <div class="text-block" style="font-weight: 600;">${fields.adviceOnDischarge || 'None.'}</div>
            </div>
            <div>
              <div class="section-title">13. Follow Up</div>
              <div class="text-block" style="font-weight: 600; font-size: 11px; line-height: 1.4; padding: 2px 0; color: #111827;">
                • RW AFTER 7 DAYS (ADVISED 2D ECHO)<br/>
                • REVIEW @ 1,3,6,12,24 MONTHS FOR NEURODEVELOPMENTAL ASSESSMENT
              </div>
            </div>
          </div>

          <div class="section-title">14. Standard Discharge Guidelines & Advice <span class="odia-text" style="font-size: 10px; font-weight: 700;">(ଓଡ଼ିଆ)</span></div>
          <div class="text-block" style="color: #374151; padding-top: 2px;">
            <div class="odia-text" style="margin: 0; display: flex; flex-direction: column; gap: 3px;">
              <div style="display: flex; align-items: flex-start; line-height: 1.4;">
                <span style="margin-right: 6px; font-size: 8px; margin-top: 3px;">•</span>
                <span>ଜନ୍ମ ପରେ ଯଥାଶୀଘ୍ର ଶିଶୁକୁ ମା' କ୍ଷୀର ଖାଇବାକୁ ଦିଅନ୍ତୁ।</span>
              </div>
              <div style="display: flex; align-items: flex-start; line-height: 1.4;">
                <span style="margin-right: 6px; font-size: 8px; margin-top: 3px;">•</span>
                <span>କୋଲୋଷ୍ଟ୍ରମ୍ ତ୍ୟାଗ କରନ୍ତୁ ନାହିଁ ଏହି କ୍ଷୀର ପିଇବା ଦ୍ଵାରา ପୁଷ୍ଟି ମିଳିଥାଏ ଏବଂ ସଂକ୍ରମଣ ରୋକାଯାଏ।</span>
              </div>
              <div style="display: flex; align-items: flex-start; line-height: 1.4;">
                <span style="margin-right: 6px; font-size: 8px; margin-top: 3px;">•</span>
                <span>ଦିନରେ ଏବଂ ରାତିରେ ଅତି କମରେ ଆଠରୁ ଦଶ ଥର ଏବଂ ଯେତେବେଳେ ଶିଶୁ ଭୋକରେ କାନ୍ଦେ ସେହି ସମୟରେ ମା' କ୍ଷୀର ଦିଅନ୍ତୁ।</span>
              </div>
              <div style="display: flex; align-items: flex-start; line-height: 1.4;">
                <span style="margin-right: 6px; font-size: 8px; margin-top: 3px;">•</span>
                <span>କ୍ଷୀର ପିଇବା ସମୟରେ ମନେରଖନ୍ତୁ ଯେପର୍ଯ୍ୟନ୍ତ ଆପଣଙ୍କ ଶିଶୁ ସନ୍ତୁଷ୍ଟ ନହୁଏ ସେପର୍ଯ୍ୟନ୍ତ ଗୋଟିଏ ସ୍ତନପାନରୁ ସ୍ତନପାନ କରାନ୍ତୁ ଏବଂ ତା'ପରେ ଅନ୍ୟ ପାର୍ଶ୍ଵ ଦିଅନ୍ତୁ।</span>
              </div>
              <div style="display: flex; align-items: flex-start; line-height: 1.4;">
                <span style="margin-right: 6px; font-size: 8px; margin-top: 3px;">•</span>
                <span>ସ୍ତନପାନ କରାଇବା ସମୟରେ, ଶିଶୁ ସହିତ ପ୍ରେମର ସହିତ କଥା ହୁଅନ୍ତୁ ଏହା ଶିଶୁର ମସ୍ତିଷ୍କ ବିକାଶରେ ସାହାଯ୍ୟ କରିବ।</span>
              </div>
              <div style="display: flex; align-items: flex-start; line-height: 1.4;">
                <span style="margin-right: 6px; font-size: 8px; margin-top: 3px;">•</span>
                <span>ଛଅ ମାସ ପର୍ଯ୍ୟନ୍ତ ଶିଶୁ ମା' କ୍ଷୀରରୁ ସମସ୍ତ ପୁଷ୍ଟିକର ପଦାର୍ଥ ପାଇଥାଏ। ଏଥିରେ ଖାଦ୍ୟ, ପାଣି ଏବଂ ରୋଗ ସହିତ ଲଢ଼ିବା ଏବଂ ପିଲାର ବିକାଶକୁ ସମର୍ଥନ କରିବା ପାଇଁ ସମସ୍ତ ପୁଷ୍ଟିକର ପଦାର୍ଥ ଅଛି। ତୁମର କ୍ଷୀରଠାରୁ ଭଲ ଆଉ କିଛି ନାହିଁ, ତେଣୁ ଛଅ ମାସ ପର୍ଯ୍ୟନ୍ତ କେବଳ ତୁମର ଶିଶୁକୁ ସ୍ତନପାନ କରାଅ।</span>
              </div>
            </div>
          </div>

          <div class="section-title" style="background-color: #fef2f2; color: #dc2626; border-left: 3px solid #dc2626;">15. Danger Signs <span class="odia-text" style="font-size: 10px; font-weight: 700; color: #dc2626;">(ତୁରନ୍ତ ଡାକ୍ତରଖାନା ନିଅନ୍ତୁ)</span></div>
          <div class="text-block" style="color: #b91c1c; background-color: #fff5f5; border: 1px solid #fecaca; border-radius: 4px; padding: 4px 8px; line-height: 1.3; font-size: 10.5px;">
            <div style="display: flex; flex-wrap: wrap; gap: 4px 10px; margin-bottom: 3px; font-weight: 600;">
              <span>• POOR FEEDING</span>
              <span>• LETHARGY</span>
              <span>• FAST BREATHING</span>
              <span>• PALM AND SOLE LOOKS YELLOW</span>
              <span>• BABY APPEARS BLUE</span>
              <span>• ABNORMAL BODY MOVEMENTS</span>
              <span>• TEMP &gt;37.5C</span>
            </div>
            <span style="font-size: 9px; color: #111827; font-weight: bold; display: block; border-top: 1px dashed #fecaca; padding-top: 3px; margin-top: 3px;">★ IF ANY DANGER SIGN FOUND VISIT TO NEAREST HOSPITAL</span>
          </div>
          
          <div class="footer">
            <div style="font-size: 8px; color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
              Powered by ClinqoAI
            </div>
            <div class="signature-box">
              <img src="${drSignImg}" style="height: 50px; max-width: 200px; margin-bottom: 2px;" alt="Signature" />
              <div style="font-size: 9px; font-weight: 800; color: #2563eb; border-top: 1px dashed #2563eb; padding-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">SIGN OF DOCTOR</div>
              <div style="font-size: 11px; font-weight: 800; color: #1f2937; margin-top: 2px;">DR SHUBHA SANDEEP MAHANTY</div>
              <div style="font-size: 8px; color: #4b5563; line-height: 1.3; font-weight: 600; text-align: right; margin-top: 2px;">
                MBBS, MD (PAEDIATRICS)<br/>
                Advanced NRP, ALS, BLS Trained<br/>
                Specialist in paediatric and neonatal care<br/>
                SCB Medical College and hospital<br/>
                Regd no- 26284/2020
              </div>
            </div>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-surface border border-border rounded-lg shadow-sm p-6 space-y-6">
      <div className="flex justify-between items-center border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-accent uppercase tracking-wider">
            Neonatal Discharge Summary
          </h3>
          <p className="text-xs text-secondary mt-0.5 font-medium">Auto-compiled discharge summary from the patient's NICU record</p>
        </div>
        <div className="flex gap-2">
          {user?.role === 'doctor' && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="h-10 px-4 bg-[#0F766E] hover:bg-[#0d645e] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Edit2 className="w-4 h-4" /> Edit Discharge Summary
            </button>
          )}
          {!isEditing && (
            <button
              onClick={handlePrintDischarge}
              className="h-10 px-4 bg-[#0284C7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" /> Print Summary
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Discharge Metrics */}
          <div className="bg-bg/10 border border-border rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-accent uppercase tracking-wider border-b border-border/40 pb-2">
              Discharge Metrics
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Date of Admission (DOA) <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  required
                  value={fields.doa}
                  onChange={(e) => setFields(p => ({ ...p, doa: e.target.value }))}
                  className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Date of Discharge (DOD) <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  required
                  value={fields.dod}
                  onChange={(e) => setFields(p => ({ ...p, dod: e.target.value }))}
                  className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Discharge Weight (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 2.45"
                  value={fields.dischargeWeight}
                  onChange={(e) => setFields(p => ({ ...p, dischargeWeight: e.target.value }))}
                  className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Discharge Head Circumference (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 32.5"
                  value={fields.dischargeHeadCircumference}
                  onChange={(e) => setFields(p => ({ ...p, dischargeHeadCircumference: e.target.value }))}
                  className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Discharge Length (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 46.0"
                  value={fields.dischargeLength}
                  onChange={(e) => setFields(p => ({ ...p, dischargeLength: e.target.value }))}
                  className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Narrative Details (Editable) */}
          <div className="bg-bg/10 border border-border rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-accent uppercase tracking-wider border-b border-border/40 pb-2">
              Clinical Narrative Details
            </h4>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Diagnosis / Complications</label>
                <input
                  type="text"
                  placeholder="e.g. Neonatal Jaundice, RDS, Sepsis"
                  value={fields.complications}
                  onChange={(e) => setFields(p => ({ ...p, complications: e.target.value }))}
                  className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent w-full"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Chief Complaints</label>
                <textarea
                  rows="2"
                  placeholder="Enter chief complaints..."
                  value={fields.chiefComplaints}
                  onChange={(e) => setFields(p => ({ ...p, chiefComplaints: e.target.value }))}
                  className="border border-border rounded p-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent resize-none w-full"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Condition During Admission</label>
                <textarea
                  rows="2"
                  placeholder="Enter condition during admission..."
                  value={fields.conditionOnAdmission}
                  onChange={(e) => setFields(p => ({ ...p, conditionOnAdmission: e.target.value }))}
                  className="border border-border rounded p-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent resize-none w-full"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Course During Hospitalization</label>
                <textarea
                  rows="2"
                  placeholder="Enter course during hospitalization..."
                  value={fields.hospitalCourse}
                  onChange={(e) => setFields(p => ({ ...p, hospitalCourse: e.target.value }))}
                  className="border border-border rounded p-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent resize-none w-full"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Treatment Given</label>
                <textarea
                  rows="2"
                  placeholder="Enter treatment given..."
                  value={fields.treatmentGiven}
                  onChange={(e) => setFields(p => ({ ...p, treatmentGiven: e.target.value }))}
                  className="border border-border rounded p-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent resize-none w-full"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Discharge Outcomes & Advice */}
          <div className="bg-bg/10 border border-border rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-accent uppercase tracking-wider border-b border-border/40 pb-2">
              Discharge Outcomes & Advice
            </h4>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Condition on Discharge</label>
                <textarea
                  rows="2"
                  placeholder="Describe baby's clinical state on discharge, feeding status, active reflexes..."
                  value={fields.dischargeCondition}
                  onChange={(e) => setFields(p => ({ ...p, dischargeCondition: e.target.value }))}
                  className="border border-border rounded p-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent resize-none w-full"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-secondary uppercase">Advice on Discharge (ପ୍ରତିଦିନ ଖାଇବା ଔଷଧର ତାଲିକା)</label>
                <textarea
                  rows="4"
                  placeholder="Enter discharge advice, feeding schedule, follow-up instructions (use bullet points like • breastfeed every 2h)..."
                  value={fields.adviceOnDischarge}
                  onChange={(e) => setFields(p => ({ ...p, adviceOnDischarge: e.target.value }))}
                  className="border border-border rounded p-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent resize-none w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="h-10 px-4 text-xs font-bold border border-border bg-surface hover:bg-bg rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-4 text-xs font-bold bg-[#0F766E] hover:bg-[#0d645e] text-white rounded-lg"
            >
              Save Discharge Details
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Header Info and Neonatal Details (Side by Side Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Header Information */}
            <div className="bg-bg/40 border border-border/80 rounded-lg p-4">
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-3 border-b border-border/40 pb-1.5">
                1. Header Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase">Baby IP No.</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{nicuData.raw.babyIpNo || '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase">Consultant</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{nicuData.raw.consultant || 'DR SHUBHA MAHANTY'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase">Mother's Name</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{patient?.motherName || '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase">Father's Name</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{patient?.parentName || '--'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-secondary uppercase">Address</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{patient?.address || '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase">Mobile No.</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{patient?.mobile || '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase">DOA (Date of Admission)</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{fields.doa ? dayjs(fields.doa).format('DD/MM/YYYY') : '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase">DOD (Date of Discharge)</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{fields.dod ? dayjs(fields.dod).format('DD/MM/YYYY') : '--'}</p>
                </div>
              </div>
            </div>

            {/* Card 2: Neonatal Details */}
            <div className="bg-bg/40 border border-border/80 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider border-b border-border/40 pb-1.5">
                2. Neonatal Details
              </h4>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase">DOB</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{dayjs(patient?.dateOfBirth).format('DD/MM/YYYY')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase">Gender</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{patient?.gender?.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase">Time of Birth</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{formatTime12hr(nicuData.raw.timeOfBirth)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase">Birth Weight</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{patient?.birthWeight ? `${patient.birthWeight} kg` : '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase">Gestational Age</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{nicuData.raw.gestationalAge || '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase">Mode of Delivery</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{nicuData.raw.modeOfDelivery || '--'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold text-secondary uppercase">High Risk in Mother</p>
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded border mt-1 ${nicuData.raw.motherHighRisk === 'YES' ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-emerald-600 bg-emerald-50 border-emerald-200'}`}>
                    {nicuData.raw.motherHighRisk || 'NO'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: APGAR & Diagnosis */}
          <div className="bg-bg/40 border border-border/80 rounded-lg p-4">
            <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-3 border-b border-border/40 pb-1.5">
              3. APGAR & Diagnosis
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase">APGAR Score</p>
                <p className="text-sm font-bold text-primary mt-0.5">
                  {nicuData.raw.apgar1 || nicuData.raw.apgar5 ? `${nicuData.raw.apgar1 || '--'} (1m) / ${nicuData.raw.apgar5 || '--'} (5m)` : '--'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase">Diagnosis</p>
                <p className="text-sm font-bold text-primary mt-0.5 whitespace-pre-wrap break-words">{fields.complications || 'No complications recorded.'}</p>
              </div>
            </div>
          </div>

          {/* Clinical Summaries Block */}
          <div className="bg-bg/40 border border-border/80 rounded-lg p-4 space-y-4">
            <h4 className="text-xs font-bold text-accent uppercase tracking-wider border-b border-border/40 pb-1.5">
              4. Clinical Narrative Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Chief Complaints</p>
                  <p className="text-xs font-normal text-primary mt-1 whitespace-pre-wrap break-words leading-relaxed">{fields.chiefComplaints || 'None recorded.'}</p>
                </div>
                <div className="border-t border-border/60 pt-2">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Condition During Admission</p>
                  <p className="text-xs font-normal text-primary mt-1 whitespace-pre-wrap break-words leading-relaxed">{fields.conditionOnAdmission || 'None recorded.'}</p>
                </div>
                <div className="border-t border-border/60 pt-2">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Course During Hospitalization</p>
                  <p className="text-xs font-normal text-primary mt-1 whitespace-pre-wrap break-words leading-relaxed">{fields.hospitalCourse || 'None recorded.'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Investigations (Categories Only)</p>
                  {recentInvestigations.length === 0 ? (
                    <p className="text-xs text-secondary italic mt-1">No investigations recorded.</p>
                  ) : (
                    <ul className="list-disc list-inside text-xs text-primary mt-1.5 space-y-1">
                      {recentInvestigations.map((inv, idx) => (
                        <li key={idx} className="font-normal">
                          {inv.category} <span className="text-[10px] text-secondary font-medium font-mono">({dayjs(inv.date).format('DD/MM/YYYY')})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="border-t border-border/60 pt-2">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Treatment Given</p>
                  <p className="text-xs font-normal text-primary mt-1 whitespace-pre-wrap break-words leading-relaxed">{fields.treatmentGiven || 'None recorded.'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Discharge Details & Outcomes Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-bg/40 border border-border/80 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider border-b border-border/40 pb-1.5">
                5. Discharge Details
              </h4>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase">DOD (Date of Discharge)</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{fields.dod ? dayjs(fields.dod).format('DD/MM/YYYY') : '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase">Weight on Discharge</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{fields.dischargeWeight ? `${fields.dischargeWeight} kg` : '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase">Head Circumference</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{fields.dischargeHeadCircumference ? `${fields.dischargeHeadCircumference} cm` : '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase">Length</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{fields.dischargeLength ? `${fields.dischargeLength} cm` : '--'}</p>
                </div>
              </div>
            </div>

            <div className="bg-bg/40 border border-border/80 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-bold text-accent uppercase tracking-wider border-b border-border/40 pb-1.5">
                6. Discharge Outcomes
              </h4>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-secondary uppercase">Condition on Discharge</p>
                  <p className="text-xs text-primary mt-1 whitespace-pre-wrap break-words leading-relaxed">{fields.dischargeCondition || 'Good / Stable.'}</p>
                </div>
                <div className="border-t border-border/60 pt-2.5">
                  <p className="text-[10px] font-bold text-secondary uppercase">Advice on Discharge (ପ୍ରତିଦିନ ଖାଇବା ଔଷଧର ତାଲିକା)</p>
                  <p className="text-xs text-primary mt-1 whitespace-pre-wrap break-words leading-relaxed font-medium">{fields.adviceOnDischarge || 'No discharge advice recorded.'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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

const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

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

const VaccinationCertificate = ({ patient, vaccinations, onVaccineClick }) => {
  const fullVaccinations = getVaccList(vaccinations, patient?.dateOfBirth);
  
  console.log("VaccinationCertificate (Preview) received vaccinations:", fullVaccinations);

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
      {/* Watermark in the background */}
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

const PatientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, clinics, API_URL } = useAuth();

  // Loading and core states
  const [patient, setPatient] = useState(null);
  const [summary, setSummary] = useState(null);
  const [vaccinations, setVaccinations] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tabs: 'overview', 'vaccinations', 'growth', 'reminders'
  const [activeTab, setActiveTab] = useState('overview');

  // Vaccination state filters
  const [vaccSearch, setVaccSearch] = useState('');
  const [vaccSubTab, setVaccSubTab] = useState('mandatory');
  const [vaccCategory, setVaccCategory] = useState('all');
  const [vaccStatus, setVaccStatus] = useState('all');
  const [vaccPage, setVaccPage] = useState(1);
  const vaccLimit = 10;

  // Modals state
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [isDeletePatientOpen, setIsDeletePatientOpen] = useState(false);
  const [isEditVaccineOpen, setIsEditVaccineOpen] = useState(false);
  const [isBulkMarkOpen, setIsBulkMarkOpen] = useState(false);
  const [isAddGrowthOpen, setIsAddGrowthOpen] = useState(false);

  // Active items for editing
  const [selectedVaccine, setSelectedVaccine] = useState(null);

  // Form inputs
  const [editPatientFields, setEditPatientFields] = useState({
    namePrefix: '',
    name: '',
    parentName: '',
    motherName: '',
    mobile: '',
    email: '',
    address: '',
    bloodGroup: '',
    currentWeight: '',
    visitType: ''
  });

  const [editVaccineFields, setEditVaccineFields] = useState({
    status: 'completed',
    dueDate: '',
    dateGiven: '',
    brand: '',
    batchNumber: '',
    notes: '',
    category: 'mandatory'
  });

  const [bulkMarkFields, setBulkMarkFields] = useState({
    dateGiven: dayjs().format('YYYY-MM-DD')
  });

  const [growthFields, setGrowthFields] = useState({
    recordDate: dayjs().format('YYYY-MM-DD'),
    weight: '',
    height: '',
    headCircumference: '',
    notes: ''
  });

  // Load patient core information
  const loadPatientData = async () => {
    try {
      const [patientRes, summaryRes, vaccRes] = await Promise.all([
        axios.get(`${API_URL}/patients/${id}`),
        axios.get(`${API_URL}/patients/${id}/vaccination-summary`),
        axios.get(`${API_URL}/patients/${id}/vaccinations`)
      ]);
      setPatient(patientRes.data);
      setSummary(summaryRes.data);
      setVaccinations(vaccRes.data);
      
      // Initialize edit fields
      setEditPatientFields({
        namePrefix: patientRes.data.namePrefix || '',
        name: patientRes.data.name,
        parentName: patientRes.data.parentName,
        motherName: patientRes.data.motherName || '',
        mobile: patientRes.data.mobile,
        email: patientRes.data.email || '',
        address: patientRes.data.address || '',
        bloodGroup: patientRes.data.bloodGroup || '',
        currentWeight: patientRes.data.currentWeight,
        visitType: patientRes.data.visitType || 'Normal OPD visit'
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load patient records');
    }
  };

  // Load tab specific details
  const loadTabDetails = async () => {
    try {
      if (activeTab === 'vaccinations' || activeTab === 'certificate') {
        const res = await axios.get(
          `${API_URL}/patients/${id}/vaccinations`
        );
        setVaccinations(res.data);
      } else if (activeTab === 'growth') {
        const res = await axios.get(`${API_URL}/patients/${id}/growth`);
        setGrowth(res.data);
      } else if (activeTab === 'reminders') {
        const res = await axios.get(`${API_URL}/reminders?patientId=${id}`);
        setReminders(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadPatientData().then(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (patient) {
      loadTabDetails();
    }
  }, [activeTab, patient]);

  // Edit Patient handler
  const handleEditPatientSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.patch(`${API_URL}/patients/${id}`, editPatientFields);
      setPatient(res.data);
      setIsEditPatientOpen(false);
      toast.success('Patient information updated successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  // Delete Patient handler
  const handleDeletePatientConfirm = async () => {
    try {
      await axios.delete(`${API_URL}/patients/${id}`);
      toast.success('Patient record deleted');
      navigate('/patients');
    } catch (err) {
      console.error(err);
      toast.error('Deletion failed');
    }
  };

  // Single Mark Given (simple toggle or immediate set to complete)
  const handleSingleMarkGiven = async (vaccId) => {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      await axios.patch(`${API_URL}/patients/${id}/vaccinations/${vaccId}`, {
        status: 'completed',
        dateGiven: today
      });
      toast.success('Vaccine marked as completed!');
      loadPatientData();
      loadTabDetails();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update vaccination');
    }
  };

  // Edit Vaccine Handler
  const handleEditVaccineSubmit = async (e) => {
    if (e) e.preventDefault();
    try {
      const payload = {
        status: editVaccineFields.status,
        brand: editVaccineFields.brand,
        notes: editVaccineFields.notes,
        dueDate: editVaccineFields.dueDate,
        dateGiven: editVaccineFields.dateGiven || (editVaccineFields.status === 'given' ? dayjs().format('YYYY-MM-DD') : null),
        category: editVaccineFields.category
      };

      if (payload.dateGiven && payload.status === 'not_given') {
        payload.status = 'given';
      } else if (!payload.dateGiven && payload.status === 'given') {
        payload.status = 'not_given';
      }

      await axios.patch(
        `${API_URL}/patients/${id}/vaccinations/${selectedVaccine.id}`,
        payload
      );
      toast.success('Vaccine record updated!');
      setIsEditVaccineOpen(false);
      loadPatientData();
      loadTabDetails();
    } catch (err) {
      console.error(err);
      toast.error('Update failed');
    }
  };

  // Re-usable status update handler
  const handleUpdateVaccineStatus = async (newStatus) => {
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const payload = {
        status: newStatus,
        brand: editVaccineFields.brand,
        notes: editVaccineFields.notes,
        dueDate: editVaccineFields.dueDate,
        dateGiven: newStatus === 'given' 
          ? (editVaccineFields.dateGiven || today)
          : null,
        category: editVaccineFields.category
      };

      await axios.patch(
        `${API_URL}/patients/${id}/vaccinations/${selectedVaccine.id}`,
        payload
      );
      toast.success(newStatus === 'given' ? 'Vaccine marked as Given!' : 'Vaccine marked as Not Given!');
      setIsEditVaccineOpen(false);
      loadPatientData();
      loadTabDetails();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update vaccine record');
    }
  };

  const handleUpdateVaccineStatusDirect = async (e, vaccId, newStatus) => {
    e.stopPropagation();
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const payload = {
        status: newStatus,
        dateGiven: newStatus === 'given' ? today : null
      };

      await axios.patch(
        `${API_URL}/patients/${id}/vaccinations/${vaccId}`,
        payload
      );
      toast.success(newStatus === 'given' ? 'Vaccine marked as Given!' : 'Vaccine marked as Not Given!');
      loadPatientData();
      loadTabDetails();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update vaccine status');
    }
  };

  const handleToggleGroupStatus = async (group) => {
    const allGiven = group.vaccines.every(v => v.status === 'given');
    const newStatus = allGiven ? 'not_given' : 'given';
    
    // Find if there is already a date chosen in the group's given date input
    const existingDate = group.vaccines.find(v => v.status === 'given')?.dateGiven;
    const today = dayjs().format('YYYY-MM-DD');
    const dateGiven = newStatus === 'given' 
      ? (existingDate ? dayjs(existingDate).format('YYYY-MM-DD') : today)
      : null;
    
    try {
      toast.info(`${newStatus === 'given' ? 'Marking' : 'Clearing'} vaccines in ${group.ageLabel}...`);
      await Promise.all(group.vaccines.map(v => 
        axios.patch(`${API_URL}/patients/${id}/vaccinations/${v.id}`, {
          status: newStatus,
          dateGiven: dateGiven
        })
      ));
      toast.success(`Successfully updated all vaccines for ${group.ageLabel}!`);
      loadPatientData();
      loadTabDetails();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update group vaccines');
    }
  };

  const handleGroupDateChange = async (group, selectedDate) => {
    if (!selectedDate) {
      try {
        toast.info(`Clearing vaccination dates for ${group.ageLabel}...`);
        await Promise.all(group.vaccines.map(v => 
          axios.patch(`${API_URL}/patients/${id}/vaccinations/${v.id}`, {
            status: 'not_given',
            dateGiven: null
          })
        ));
        toast.success(`Successfully cleared all vaccines for ${group.ageLabel}!`);
        loadPatientData();
        loadTabDetails();
      } catch (err) {
        console.error(err);
        toast.error('Failed to clear vaccination dates');
      }
      return;
    }

    try {
      toast.info(`Updating vaccination date to ${dayjs(selectedDate).format('DD MMM YYYY')} for ${group.ageLabel}...`);
      await Promise.all(group.vaccines.map(v => 
        axios.patch(`${API_URL}/patients/${id}/vaccinations/${v.id}`, {
          status: 'given',
          dateGiven: selectedDate
        })
      ));
      toast.success(`Successfully set given date for ${group.ageLabel}!`);
      loadPatientData();
      loadTabDetails();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update vaccination dates');
    }
  };

  // Bulk Mark Given Handler
  const handleBulkMarkSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${API_URL}/patients/${id}/vaccinations/bulk-mark-given`,
        bulkMarkFields
      );
      toast.success(`Success! Marked ${res.data.updated} vaccines as completed.`);
      setIsBulkMarkOpen(false);
      loadPatientData();
      loadTabDetails();
    } catch (err) {
      console.error(err);
      toast.error('Bulk update failed');
    }
  };

  // Add Growth Record Handler
  const handleAddGrowthSubmit = async (e) => {
    e.preventDefault();
    if (!growthFields.weight || parseFloat(growthFields.weight) <= 0) {
      return toast.error('Weight must be a positive number');
    }

    try {
      await axios.post(`${API_URL}/patients/${id}/growth`, growthFields);
      toast.success('Growth record added!');
      setIsAddGrowthOpen(false);
      // Reset growthFields weight/height/hc/notes
      setGrowthFields({
        recordDate: dayjs().format('YYYY-MM-DD'),
        weight: '',
        height: '',
        headCircumference: '',
        notes: ''
      });
      loadPatientData();
      loadTabDetails();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add growth record');
    }
  };

  // WhatsApp reminder template sender
  const handleSendReminder = async (vacc = null) => {
    let vaccineName = vacc ? vacc.vaccineName : (summary?.nextVaccineName || 'Upcoming Routine Vaccines');
    let dueDate = vacc ? vacc.dueDate : (summary?.nextDue || 'scheduled dates');

    // Format date to e.g. "06 June 2026"
    const formatDateToCustom = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };

    const formattedDueDate = formatDateToCustom(dueDate);
    const doctorName = 'Dr. Shubha Sandeep Mahanty';
    const clinicName = patient?.clinic?.name || 'KiddosCare Clinic';
    const clinicPhone = patient?.clinic?.phone || '999XXXXXXXXXX';
    const uniqueLink = `${window.location.origin}/patient/${patient?.id}/uuid=${patient?.uuid || ''}`;

    const templateParams = {
      parentName: patient?.parentName || '',
      childName: patient?.name || '',
      vaccineName,
      dueDate: formattedDueDate,
      doctorName,
      clinicName,
      uniqueLink,
      clinicPhone
    };

    toast.info('Sending template reminder via WhatsApp...');

    try {
      await axios.post(`${API_URL}/reminders`, {
        patientId: parseInt(id),
        vaccinationId: vacc ? vacc.id : null,
        type: 'upcoming',
        templateName: 'vaccination_reminder_1',
        templateParams: JSON.stringify(templateParams),
        message: `🩺 *KIDDOSCARE Vaccination Reminder*\n\nDear ${patient?.parentName},\n\nThis is a reminder from *${doctorName}* that ${patient?.name}'s vaccination is due:\n\n💉 Vaccine: *${vaccineName}*\n📅 Due Date: *${formattedDueDate}*\n🏥 Clinic: *${clinicName}*\n\nPortal: ${uniqueLink}`
      });
      toast.success('WhatsApp Template Reminder sent successfully!');
      
      // Refresh timeline if we are in the reminders tab
      if (activeTab === 'reminders') {
        const res = await axios.get(`${API_URL}/reminders?patientId=${id}`);
        setReminders(res.data);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Failed to send template reminder. Opening manual WhatsApp chat instead...';
      toast.warn(errMsg);

      // Fallback: Manual deep link
      const fallbackMsg = `🩺 *KIDDOSCARE Vaccination Reminder*\n\nDear ${patient?.parentName} ,\n\nThis is a reminder from *${doctorName}* that ${patient?.name}'s vaccination is due:\n\n💉 Vaccine: *${vaccineName}*\n📅 Due Date: *${formattedDueDate}*\n\nPlease visit the clinic on time.\n\n– KIDDOSCARE`;
      const waUrl = `https://api.whatsapp.com/send/?phone=91${patient?.mobile}&text=${encodeURIComponent(fallbackMsg)}`;
      window.open(waUrl, '_blank');
    }
  };

  const triggerReminderSend = async (rem) => {
    toast.info('Sending template reminder via WhatsApp Cloud API...');
    try {
      await axios.post(`${API_URL}/reminders/${rem.id}/send`);
      toast.success('WhatsApp Template Reminder sent successfully!');
      // Refresh the timeline
      const res = await axios.get(`${API_URL}/reminders?patientId=${id}`);
      setReminders(res.data);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Failed to send template message via WhatsApp API.';
      toast.error(errMsg);
    }
  };


  // Download printable PDF vaccine chart using native @react-pdf/renderer
  const handleDownloadPDF = async () => {
    toast.info('Generating e-Vaccination Certificate PDF...');

    try {
      // Create PDF document using latest React state (no DOM dependencies)
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
  };  // Generate printable card trigger
  const handlePrintCard = () => {
    // Open a print window with card
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
      <head>
        <title>Print Patient Card - ${patient?.uhid}</title>
        <style>
          body { font-family: 'Inter', sans-serif; background-color: #ffffff; color: #111827; padding: 40px; }
          .card-box { border: 2px solid #0F766E; border-radius: 8px; padding: 24px; max-width: 450px; margin: 0 auto; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .card-header { border-bottom: 2px solid #0F766E; padding-bottom: 12px; margin-bottom: 16px; text-align: center; }
          .card-header h2 { margin: 0; font-size: 20px; color: #0F766E; }
          .card-header p { margin: 4px 0 0 0; font-size: 11px; color: #4B5563; text-transform: uppercase; font-weight: bold; }
          .pc-row { display: flex; justify-content: space-between; font-size: 13px; margin: 8px 0; border-bottom: 1px dashed #E5E7EB; padding-bottom: 4px; }
          .pc-label { font-weight: bold; color: #4B5563; }
          .pc-val { font-weight: 600; color: #111827; }
          .footer { text-align: center; font-size: 10px; color: #4B5563; margin-top: 20px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card-box">
          <div class="card-header">
            <h2>KIDDOSCARE</h2>
            <p>Child Vaccination Card</p>
          </div>
          <div class="pc-row">
            <span class="pc-label">Patient Name:</span>
            <span class="pc-val">${patient?.namePrefix} ${patient?.name}</span>
          </div>
          <div class="pc-row">
            <span class="pc-label">UHID / ID:</span>
            <span class="pc-val" style="font-family: monospace; font-weight: bold;">${patient?.uhid}</span>
          </div>
          <div class="pc-row">
            <span class="pc-label">Gender:</span>
            <span class="pc-val">${patient?.gender?.toUpperCase()}</span>
          </div>
          <div class="pc-row">
            <span class="pc-label">Date of Birth:</span>
            <span class="pc-val">${dayjs(patient?.dateOfBirth).format('DD MMM YYYY')}</span>
          </div>
          <div class="pc-row">
            <span class="pc-label">Parent Name:</span>
            <span class="pc-val">${patient?.parentName}</span>
          </div>
          <div class="pc-row">
            <span class="pc-label">Mother Name:</span>
            <span class="pc-val">${patient?.motherName || '--'}</span>
          </div>
          <div class="pc-row">
            <span class="pc-label">Mobile Phone:</span>
            <span class="pc-val">${patient?.mobile}</span>
          </div>
          <div class="pc-row">
            <span class="pc-label">Associated Clinic:</span>
            <span class="pc-val">${patient?.clinicName}</span>
          </div>
          <div class="footer">
            KIDDOSCARE v1.0 • Please present this card on every visit.
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const paginatedVaccinations = vaccinations.slice(
    (vaccPage - 1) * vaccLimit,
    vaccPage * vaccLimit
  );

  const totalVaccPages = Math.ceil(vaccinations.length / vaccLimit);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header buttons and Patient Profile bar */}
      <div className="bg-surface border border-border rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/patients')}
              className="h-10 w-10 border border-border bg-surface hover:bg-bg rounded-lg flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-accent-soft text-accent border border-accent/10 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  {patient?.gender}
                </span>
                <span className="text-xs bg-bg text-secondary border border-border px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  {patient?.uhid}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-primary tracking-tight mt-1">
                {patient?.namePrefix && <span className="text-secondary font-semibold mr-1">{patient.namePrefix}</span>}
                {patient?.name}
              </h1>
            </div>
          </div>

          {/* Action Header Buttons */}
          {user?.role === 'doctor' && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handlePrintCard}
                className="h-9 px-3 bg-surface hover:bg-bg border border-border text-primary text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Card
              </button>
              <button
                onClick={() => handleSendReminder()}
                className="h-9 px-3 bg-accent-soft hover:bg-accent/10 border border-accent/20 text-accent text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Bell className="w-4 h-4" /> Remind
              </button>
              <button
                onClick={handleDownloadPDF}
                className="h-9 px-3 bg-surface hover:bg-bg border border-border text-primary text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <button
                onClick={() => setIsEditPatientOpen(true)}
                className="h-9 px-3 bg-surface hover:bg-bg border border-border text-accent text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => setIsDeletePatientOpen(true)}
                className="h-9 px-3 bg-surface hover:bg-red-50 border border-border text-red-600 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-surface border border-border p-4 rounded-lg shadow-sm">
          <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">Total Vaccines</p>
          <p className="text-2xl font-extrabold text-primary mt-1">{summary?.total || 0}</p>
        </div>
        <div className="bg-surface border border-border p-4 rounded-lg shadow-sm">
          <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">Completed</p>
          <p className="text-2xl font-extrabold text-status-completed-text mt-1">{summary?.completed || 0}</p>
        </div>
        <div className="bg-surface border border-border p-4 rounded-lg shadow-sm">
          <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-extrabold text-status-pending-text mt-1">{summary?.pending || 0}</p>
        </div>
        <div className="bg-surface border border-border p-4 rounded-lg shadow-sm">
          <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">Next Due Date</p>
          <p className="text-sm font-bold text-accent mt-2">
            {summary?.nextDue ? dayjs(summary.nextDue).format('DD MMM YYYY') : 'Completed'}
          </p>
          {summary?.nextVaccineName && (
            <p className="text-[10px] text-secondary font-semibold line-clamp-1 mt-0.5">{summary.nextVaccineName}</p>
          )}
        </div>
      </div>
      {/* Navigation Tabs */}
      <div className="flex border-b border-border bg-surface rounded-lg shadow-sm p-1.5 gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
        {['overview', 'vaccinations', 'certificate', 'growth', 'reminders', ...(patient?.visitType === 'NICU' ? ['nicu', 'discharge'] : [])].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setVaccPage(1);
            }}
            className={`px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all inline-block ${
              activeTab === tab
                ? 'bg-accent text-white shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-bg'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface border border-border rounded-lg shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-accent uppercase tracking-wider border-b border-border pb-3">
              Patient Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-secondary font-semibold">Full Name</p>
                <p className="text-sm font-bold text-primary">{patient?.namePrefix} {patient?.name}</p>
              </div>
              <div>
                <p className="text-xs text-secondary font-semibold">UHID</p>
                <p className="text-sm font-bold text-primary font-mono">{patient?.uhid}</p>
              </div>
              <div>
                <p className="text-xs text-secondary font-semibold">Date of Birth</p>
                <p className="text-sm font-bold text-primary">
                  {dayjs(patient?.dateOfBirth).format('DD MMM YYYY')}
                </p>
              </div>
              <div>
                <p className="text-xs text-secondary font-semibold">Gender</p>
                <p className="text-sm font-bold text-primary uppercase">{patient?.gender}</p>
              </div>
              <div>
                <p className="text-xs text-secondary font-semibold">Blood Group</p>
                <p className="text-sm font-bold text-primary">{patient?.bloodGroup || '--'}</p>
              </div>
              <div>
                <p className="text-xs text-secondary font-semibold">Associated Clinic</p>
                <p className="text-sm font-bold text-primary">{patient?.clinicName}</p>
              </div>
              <div>
                <p className="text-xs text-secondary font-semibold">Birth Weight</p>
                <p className="text-sm font-bold text-primary">{patient?.birthWeight} kg</p>
              </div>
              <div>
                <p className="text-xs text-secondary font-semibold">Current Weight</p>
                <p className="text-sm font-bold text-primary">{patient?.currentWeight} kg</p>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-accent uppercase tracking-wider border-b border-border pb-3">
              Guardian Details
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-secondary font-semibold">Father / Guardian Name</p>
                <p className="text-sm font-bold text-primary">{patient?.parentName}</p>
              </div>
              <div>
                <p className="text-xs text-secondary font-semibold">Mother Name</p>
                <p className="text-sm font-bold text-primary">{patient?.motherName || '--'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-secondary font-semibold">Mobile Number</p>
                  <p className="text-sm font-bold text-primary font-mono">{patient?.mobile}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary font-semibold">Email Address</p>
                  <p className="text-sm font-semibold text-primary break-all">{patient?.email || '--'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-secondary font-semibold">Home Address</p>
                <p className="text-sm font-semibold text-primary">{patient?.address || '--'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'vaccinations' && (
        <div className="bg-surface border border-border rounded-lg shadow-sm p-6 space-y-6">
          {/* Category Subtabs */}
          <div className="flex flex-col sm:flex-row border-b border-border bg-bg/50 rounded-lg p-1.5 gap-2">
            <button
              onClick={() => {
                setVaccSubTab('mandatory');
              }}
              className={`flex-1 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all text-center ${
                vaccSubTab === 'mandatory'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-secondary hover:text-primary hover:bg-bg'
              }`}
            >
              Indian academy of paediatrics (IAP) Schedule
            </button>
            <button
              onClick={() => {
                setVaccSubTab('optional');
              }}
              className={`flex-1 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all text-center ${
                vaccSubTab === 'optional'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-secondary hover:text-primary hover:bg-bg'
              }`}
            >
              Optional Vaccines
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" />
            <input
              type="text"
              placeholder="Search Vaccine..."
              value={vaccSearch}
              onChange={(e) => setVaccSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-border rounded-lg text-sm text-primary bg-surface focus:outline-none focus:border-accent"
            />
          </div>

          {/* Vaccine Blocks */}
          {(() => {
            const filtered = vaccinations.filter((v) => {
              const matchCat = vaccSubTab === 'mandatory'
                ? v.vaccineMasterCategory === 'mandatory'
                : v.category === 'optional';
              const matchQuery = v.vaccineName.toLowerCase().includes(vaccSearch.toLowerCase());
              return matchCat && matchQuery;
            });
            const grouped = groupVaccinationsByAge(filtered);

            return grouped.length > 0 ? (
              <div className="space-y-8">
                {grouped.map((group) => (
                  <div key={group.ageLabel} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-extrabold text-accent uppercase tracking-wider bg-accent-soft border border-accent/15 px-3 py-1.5 rounded-md inline-block">
                        {group.ageLabel}
                      </h3>
                      {user?.role === 'doctor' && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-500 font-semibold">Given Date:</span>
                            <input
                              type="date"
                              value={
                                group.vaccines.find(v => v.status === 'given')?.dateGiven 
                                  ? dayjs(group.vaccines.find(v => v.status === 'given').dateGiven).format('YYYY-MM-DD')
                                  : ''
                              }
                              onChange={(e) => handleGroupDateChange(group, e.target.value)}
                              className="h-7 text-[10px] font-bold text-accent bg-surface border border-border px-1.5 rounded-md outline-none focus:border-accent cursor-pointer"
                            />
                          </div>
                          <button
                            onClick={() => handleToggleGroupStatus(group)}
                            className="h-7 text-[10px] font-bold text-accent hover:bg-accent-soft/20 transition-colors flex items-center gap-1 bg-surface border border-border px-2 rounded-md cursor-pointer"
                          >
                            {group.vaccines.every(v => v.status === 'given') ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {group.vaccines.map((v) => (
                        <div
                          key={v.id}
                          onClick={() => {
                            setSelectedVaccine(v);
                            setEditVaccineFields({
                              status: v.status,
                              dueDate: v.dueDate,
                              dateGiven: v.dateGiven || '',
                              brand: v.brand || '',
                              batchNumber: v.batchNumber || '',
                              notes: v.notes || '',
                              category: v.category || 'mandatory'
                            });
                            setIsEditVaccineOpen(true);
                          }}
                          className={`p-3 rounded-lg border-2 cursor-pointer bg-white transition-all shadow-sm hover:shadow-md flex flex-col justify-between ${
                            v.category === 'optional'
                              ? 'border-red-500 bg-red-50/20'
                              : v.status === 'given'
                                ? 'border-[#0F766E]'
                                : 'border-[#E5E7EB] hover:border-gray-300'
                          }`}
                        >
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-gray-800 break-words leading-tight">
                              {v.vaccineName}
                            </h4>
                            <p className="text-[10px] text-gray-500 font-semibold">
                              Due: {dayjs(v.dueDate).format('DD MMM YYYY')}
                            </p>
                            {v.status === 'given' && v.dateGiven && (
                              <p className={`text-[10px] font-bold ${v.category === 'optional' ? 'text-red-600' : 'text-[#0F766E]'}`}>
                                Given: {dayjs(v.dateGiven).format('DD MMM YYYY')}
                              </p>
                            )}
                          </div>
                          {user?.role === 'doctor' && (
                            <div className="mt-3 pt-2 border-t border-gray-100 flex gap-1 justify-between">
                              <button
                                onClick={(e) => handleUpdateVaccineStatusDirect(e, v.id, 'given')}
                                className={`flex-1 py-1 px-1.5 text-[10px] font-bold rounded transition-colors text-center ${
                                  v.status === 'given'
                                    ? v.category === 'optional'
                                      ? 'bg-red-600 text-white'
                                      : 'bg-[#0F766E] text-white'
                                    : 'bg-bg border border-border text-primary hover:bg-bg/80'
                                }`}
                              >
                                Mark Given
                              </button>
                              <button
                                onClick={(e) => handleUpdateVaccineStatusDirect(e, v.id, 'not_given')}
                                className={`flex-1 py-1 px-1.5 text-[10px] font-bold rounded transition-colors text-center ${
                                  v.status !== 'given'
                                    ? 'bg-gray-500 text-white'
                                    : 'bg-bg border border-border text-secondary hover:bg-bg/80'
                                }`}
                              >
                                Not Given
                              </button>
                            </div>
                          )}
                          {user?.role !== 'doctor' && (
                            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                              {v.status === 'given' ? (
                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${v.category === 'optional' ? 'text-red-600' : 'text-[#0F766E]'}`}>
                                  <span className={`font-bold ${v.category === 'optional' ? 'text-red-500' : 'text-[#10B981]'}`}>✓</span> Given
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-gray-400">
                                  Not Given
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No vaccines found"
                description="No vaccination records matches the search query or category filter."
              />
            );
          })()}
        </div>
      )}

      {activeTab === 'growth' && (
        <div className="space-y-6">
          {/* Add growth record button banner */}
          {user?.role === 'doctor' && (
            <div className="flex justify-end">
              <button
                onClick={() => setIsAddGrowthOpen(true)}
                className="h-10 px-4 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Growth Record
              </button>
            </div>
          )}

          {growth.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Weight History Chart */}
              <div className="bg-surface border border-border rounded-lg shadow-sm p-6">
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-4 border-b border-border pb-2">
                  Weight History (kg)
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={growth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="recordDate" tickFormatter={(t) => dayjs(t).format('DD MMM YY')} tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip labelFormatter={(t) => dayjs(t).format('DD MMM YYYY')} />
                      <Line type="monotone" dataKey="weight" stroke="#0F766E" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Height History Chart */}
              <div className="bg-surface border border-border rounded-lg shadow-sm p-6">
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-4 border-b border-border pb-2">
                  Height History (cm)
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={growth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="recordDate" tickFormatter={(t) => dayjs(t).format('DD MMM YY')} tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip labelFormatter={(t) => dayjs(t).format('DD MMM YYYY')} />
                      <Line type="monotone" dataKey="height" stroke="#4B5563" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* BMI History Chart */}
              <div className="bg-surface border border-border rounded-lg shadow-sm p-6">
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-4 border-b border-border pb-2">
                  BMI History
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={growth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="recordDate" tickFormatter={(t) => dayjs(t).format('DD MMM YY')} tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip labelFormatter={(t) => dayjs(t).format('DD MMM YYYY')} />
                      <Line type="monotone" dataKey="bmi" stroke="#047857" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Head Circumference Chart */}
              <div className="bg-surface border border-border rounded-lg shadow-sm p-6">
                <h4 className="text-xs font-bold text-secondary uppercase tracking-wider mb-4 border-b border-border pb-2">
                  Head Circumference History (cm)
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={growth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="recordDate" tickFormatter={(t) => dayjs(t).format('DD MMM YY')} tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip labelFormatter={(t) => dayjs(t).format('DD MMM YYYY')} />
                      <Line type="monotone" dataKey="headCircumference" stroke="#4B5563" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No growth history recorded"
              description="Add height and weight details to map growth progression charts."
            />
          )}
        </div>
      )}

      {activeTab === 'reminders' && (
        <div className="bg-surface border border-border rounded-lg shadow-sm p-6">
          <h3 className="text-sm font-bold text-accent uppercase tracking-wider border-b border-border pb-3 mb-6">
            Reminders Timeline
          </h3>

          {reminders.length > 0 ? (
            <div className="relative border-l border-border pl-6 space-y-6 ml-4">
              {reminders.map((rem) => (
                <div key={rem.id} className="relative">
                  {/* Timeline point */}
                  <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-accent border-2 border-white shadow-sm flex items-center justify-center text-white"></span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-primary uppercase">
                        {rem.type.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                          rem.status === 'sent'
                            ? 'bg-status-completed-bg text-status-completed-text'
                            : 'bg-status-pending-bg text-status-pending-text'
                        }`}
                      >
                        {rem.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary font-medium">
                      Scheduled: {dayjs(rem.scheduledAt).format('DD MMM YYYY, hh:mm A')}
                      {rem.sentAt && ` • Sent: ${dayjs(rem.sentAt).format('DD MMM YYYY, hh:mm A')}`}
                    </p>
                    <div className="bg-bg border border-border rounded p-3 text-xs text-primary font-mono whitespace-pre-wrap break-words mt-2 max-w-xl">
                      {rem.message}
                    </div>
                    {(rem.status === 'scheduled' || rem.status === 'failed') && (
                      <button
                        onClick={() => triggerReminderSend(rem)}
                        className="mt-2 h-7 px-3 bg-accent hover:bg-accent-hover text-white text-[11px] font-bold rounded transition-colors inline-flex items-center gap-1 shadow-sm"
                      >
                        Send Now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No reminders logged"
              description="No manual or automatic WhatsApp alerts have been sent for this patient."
            />
          )}
        </div>
      )}

      {activeTab === 'nicu' && patient?.visitType === 'NICU' && (
        <NicuPanel patient={patient} onUpdate={loadPatientData} API_URL={API_URL} />
      )}

      {activeTab === 'discharge' && patient?.visitType === 'NICU' && (
        <DischargePanel patient={patient} onUpdate={loadPatientData} API_URL={API_URL} />
      )}

      {activeTab === 'certificate' && (
        <div className="bg-surface border border-border rounded-lg shadow-sm p-6 space-y-6">
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
            <VaccinationCertificate 
              patient={patient}
              vaccinations={vaccinations}
              onVaccineClick={(v) => {
                setSelectedVaccine(v);
                setEditVaccineFields({
                  status: v.status,
                  dueDate: v.dueDate,
                  dateGiven: v.dateGiven || '',
                  brand: v.brand || '',
                  batchNumber: v.batchNumber || '',
                  notes: v.notes || '',
                  category: v.category || 'mandatory'
                });
                setIsEditVaccineOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Hidden Certificate Print Area for background pdf rendering */}
      {activeTab !== 'certificate' && (
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
          <VaccinationCertificate 
            patient={patient}
            vaccinations={vaccinations}
            onVaccineClick={() => {}}
          />
        </div>
      )}

      {/* EDIT PATIENT MODAL */}
      {isEditPatientOpen && (
        <div className="fixed inset-0 bg-primary/40 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-border rounded-lg shadow-lg w-full max-w-xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-primary">Edit Patient Details</h3>
            </div>
            <form onSubmit={handleEditPatientSubmit}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-secondary uppercase">Prefix</label>
                    <input
                      type="text"
                      value={editPatientFields.namePrefix}
                      onChange={(e) => setEditPatientFields(p => ({ ...p, namePrefix: e.target.value }))}
                      className="h-10 border border-border rounded px-3 text-sm text-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-secondary uppercase">Patient Name</label>
                    <input
                      type="text"
                      required
                      value={editPatientFields.name}
                      onChange={(e) => setEditPatientFields(p => ({ ...p, name: e.target.value }))}
                      className="h-10 border border-border rounded px-3 text-sm text-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-secondary uppercase">Father / Guardian</label>
                    <input
                      type="text"
                      required
                      value={editPatientFields.parentName}
                      onChange={(e) => setEditPatientFields(p => ({ ...p, parentName: e.target.value }))}
                      className="h-10 border border-border rounded px-3 text-sm text-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-secondary uppercase">Mother Name</label>
                    <input
                      type="text"
                      value={editPatientFields.motherName}
                      onChange={(e) => setEditPatientFields(p => ({ ...p, motherName: e.target.value }))}
                      className="h-10 border border-border rounded px-3 text-sm text-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-secondary uppercase">Mobile (10 digits)</label>
                    <input
                      type="text"
                      required
                      value={editPatientFields.mobile}
                      onChange={(e) => setEditPatientFields(p => ({ ...p, mobile: e.target.value }))}
                      className="h-10 border border-border rounded px-3 text-sm text-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-secondary uppercase">Email</label>
                    <input
                      type="email"
                      value={editPatientFields.email}
                      onChange={(e) => setEditPatientFields(p => ({ ...p, email: e.target.value }))}
                      className="h-10 border border-border rounded px-3 text-sm text-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-secondary uppercase">Blood Group</label>
                    <select
                      value={editPatientFields.bloodGroup}
                      onChange={(e) => setEditPatientFields(p => ({ ...p, bloodGroup: e.target.value }))}
                      className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none"
                    >
                      <option value="">Select Blood Group (Optional)</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-secondary uppercase">Current Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editPatientFields.currentWeight}
                      onChange={(e) => setEditPatientFields(p => ({ ...p, currentWeight: e.target.value }))}
                      className="h-10 border border-border rounded px-3 text-sm text-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-secondary uppercase">Type of Visit</label>
                    <select
                      value={editPatientFields.visitType}
                      onChange={(e) => setEditPatientFields(p => ({ ...p, visitType: e.target.value }))}
                      className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none"
                    >
                      <option value="Normal OPD visit">Normal OPD visit</option>
                      <option value="NICU">NICU</option>
                      <option value="Follow up">Follow up</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-secondary uppercase">Address</label>
                    <textarea
                      rows="2"
                      value={editPatientFields.address}
                      onChange={(e) => setEditPatientFields(p => ({ ...p, address: e.target.value }))}
                      className="border border-border rounded p-3 text-sm text-primary resize-none"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-bg px-6 py-4 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditPatientOpen(false)}
                  className="h-10 px-4 text-xs font-bold border border-border bg-surface hover:bg-bg rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 text-xs font-bold bg-accent hover:bg-accent-hover text-white rounded"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE PATIENT CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={isDeletePatientOpen}
        title="Delete Patient Record?"
        message="Are you sure you want to permanently delete this child's patient file? This will immediately remove all schedules, growth entries, and logs. This action CANNOT be undone."
        confirmLabel="Permanently Delete"
        isDanger={true}
        onConfirm={handleDeletePatientConfirm}
        onCancel={() => setIsDeletePatientOpen(false)}
      />

      {/* EDIT VACCINATION MODAL */}
      {isEditVaccineOpen && (
        <div className="fixed inset-0 bg-primary/40 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-border rounded-lg shadow-lg w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-border bg-[#0F766E] text-white">
              <h3 className="text-lg font-bold">{selectedVaccine?.vaccineName}</h3>
            </div>
            <form onSubmit={handleEditVaccineSubmit}>
              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Metadata Info */}
                <div className="bg-bg p-4 rounded-lg border border-border space-y-2 text-sm text-primary">
                  <div className="flex justify-between">
                    <span className="text-secondary font-semibold">Age Group:</span>
                    <span className="font-bold">{selectedVaccine?.ageLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary font-semibold">Status:</span>
                    <span className={`font-bold ${selectedVaccine?.status === 'given' ? 'text-[#0F766E]' : 'text-gray-500'}`}>
                      {selectedVaccine?.status === 'given' ? 'Given' : 'Not Given'}
                    </span>
                  </div>
                </div>

                {/* Editable Fields */}
                <div className="space-y-4">
                  {user?.role === 'doctor' && (
                    <div className="flex items-center gap-2 py-2 border-b border-border">
                      <input
                        type="checkbox"
                        id="optionalVaccineCheckbox"
                        checked={editVaccineFields.category === 'optional'}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setEditVaccineFields(p => ({
                            ...p,
                            category: checked ? 'optional' : 'mandatory'
                          }));
                        }}
                        className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                      />
                      <label htmlFor="optionalVaccineCheckbox" className="text-xs font-bold text-secondary uppercase cursor-pointer">
                        Optional Vaccine
                      </label>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-secondary uppercase">Due Date</label>
                    <input
                      type="date"
                      required
                      disabled={user?.role !== 'doctor'}
                      value={editVaccineFields.dueDate ? editVaccineFields.dueDate.split('T')[0] : ''}
                      onChange={(e) => setEditVaccineFields(p => ({ ...p, dueDate: e.target.value }))}
                      className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent disabled:opacity-50"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-secondary uppercase">Date Given</label>
                    <input
                      type="date"
                      disabled={user?.role !== 'doctor'}
                      value={editVaccineFields.dateGiven ? editVaccineFields.dateGiven.split('T')[0] : ''}
                      onChange={(e) => setEditVaccineFields(p => ({ ...p, dateGiven: e.target.value }))}
                      className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent disabled:opacity-50"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-secondary uppercase">Brand (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. GSK"
                      disabled={user?.role !== 'doctor'}
                      value={editVaccineFields.brand}
                      onChange={(e) => setEditVaccineFields(p => ({ ...p, brand: e.target.value }))}
                      className="h-10 border border-border rounded px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent disabled:opacity-50"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-secondary uppercase">Notes (Optional)</label>
                    <textarea
                      rows="2"
                      placeholder="Enter notes..."
                      disabled={user?.role !== 'doctor'}
                      value={editVaccineFields.notes}
                      onChange={(e) => setEditVaccineFields(p => ({ ...p, notes: e.target.value }))}
                      className="border border-border rounded p-3 text-sm text-primary resize-none bg-surface focus:outline-none focus:border-accent disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="bg-bg px-6 py-4 flex justify-between items-center border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditVaccineOpen(false)}
                  className="h-10 px-4 text-xs font-bold border border-border bg-surface hover:bg-bg rounded"
                >
                  Close
                </button>
                {user?.role === 'doctor' && (
                  <div className="flex gap-2">
                    {selectedVaccine?.status === 'not_given' ? (
                      <>
                        <button
                          type="submit"
                          className="h-10 px-4 text-xs font-bold bg-[#0F766E] hover:bg-[#0d645e] text-white rounded"
                        >
                          Save Details
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateVaccineStatus('given')}
                          className="h-10 px-4 text-xs font-bold bg-[#f0fdfa] border border-[#ccfbf1] text-[#0f766e] hover:bg-[#e6fffa] rounded"
                        >
                          Mark Given
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdateVaccineStatus('not_given')}
                          className="h-10 px-4 text-xs font-bold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded"
                        >
                          Mark Not Given
                        </button>
                        <button
                          type="submit"
                          className="h-10 px-4 text-xs font-bold bg-[#0F766E] hover:bg-[#0d645e] text-white rounded"
                        >
                          Save Details
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK MARK MODAL */}
      {isBulkMarkOpen && (
        <div className="fixed inset-0 bg-primary/40 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-border rounded-lg shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-primary">Bulk Mark All as Completed</h3>
              <p className="text-xs text-secondary mt-1">Mark all currently pending vaccinations as administered.</p>
            </div>
            <form onSubmit={handleBulkMarkSubmit}>
              <div className="p-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase">Date Given</label>
                  <input
                    type="date"
                    required
                    value={bulkMarkFields.dateGiven}
                    onChange={(e) => setBulkMarkFields(p => ({ ...p, dateGiven: e.target.value }))}
                    className="h-10 border border-border rounded px-3 text-sm text-primary"
                  />
                </div>
              </div>
              <div className="bg-bg px-6 py-4 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsBulkMarkOpen(false)}
                  className="h-10 px-4 text-xs font-bold border border-border bg-surface hover:bg-bg rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 text-xs font-bold bg-accent hover:bg-accent-hover text-white rounded"
                >
                  Confirm Bulk Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD GROWTH RECORD MODAL */}
      {isAddGrowthOpen && (
        <div className="fixed inset-0 bg-primary/40 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-border rounded-lg shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-primary">Add Growth Measurement</h3>
            </div>
            <form onSubmit={handleAddGrowthSubmit}>
              <div className="p-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase">Record Date</label>
                  <input
                    type="date"
                    required
                    value={growthFields.recordDate}
                    onChange={(e) => setGrowthFields(p => ({ ...p, recordDate: e.target.value }))}
                    className="h-10 border border-border rounded px-3 text-sm text-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase">Weight (kg) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 4.5"
                    value={growthFields.weight}
                    onChange={(e) => setGrowthFields(p => ({ ...p, weight: e.target.value }))}
                    className="h-10 border border-border rounded px-3 text-sm text-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase">Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 52.3"
                    value={growthFields.height}
                    onChange={(e) => setGrowthFields(p => ({ ...p, height: e.target.value }))}
                    className="h-10 border border-border rounded px-3 text-sm text-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase">Head Circumference (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 36.2"
                    value={growthFields.headCircumference}
                    onChange={(e) => setGrowthFields(p => ({ ...p, headCircumference: e.target.value }))}
                    className="h-10 border border-border rounded px-3 text-sm text-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase">Clinician Notes</label>
                  <textarea
                    rows="2"
                    placeholder="Growth observations..."
                    value={growthFields.notes}
                    onChange={(e) => setGrowthFields(p => ({ ...p, notes: e.target.value }))}
                    className="border border-border rounded p-3 text-sm text-primary resize-none"
                  />
                </div>
              </div>
              <div className="bg-bg px-6 py-4 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddGrowthOpen(false)}
                  className="h-10 px-4 text-xs font-bold border border-border bg-surface hover:bg-bg rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 text-xs font-bold bg-accent hover:bg-accent-hover text-white rounded"
                >
                  Save Measurement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetails;
