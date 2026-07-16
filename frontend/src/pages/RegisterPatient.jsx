import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { ArrowLeft } from 'lucide-react';
import dayjs from 'dayjs';

const RegisterPatient = () => {
  const { clinics, loadClinics, API_URL } = useAuth();
  const navigate = useNavigate();

  // Load clinics if empty
  React.useEffect(() => {
    if (clinics.length === 0) {
      loadClinics();
    }
  }, []);

  // Form fields state
  const [namePrefix, setNamePrefix] = useState('Baby');
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('male');
  const [bloodGroup, setBloodGroup] = useState('');
  const [birthWeight, setBirthWeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');

  const [parentName, setParentName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [clinicId, setClinicId] = useState('');
  const [address, setAddress] = useState('');
  const [visitType, setVisitType] = useState('Normal OPD visit');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!name.trim()) return toast.error('Patient Name is required');
    if (!dateOfBirth) return toast.error('Date of Birth is required');
    if (dayjs(dateOfBirth).isAfter(dayjs())) return toast.error('Date of Birth cannot be in the future');
    if (!mobile.trim() || mobile.trim().length !== 10 || isNaN(mobile)) {
      return toast.error('Mobile Number must be exactly 10 digits');
    }
    if (!parentName.trim()) return toast.error('Father / Guardian Name is required');
    if (!clinicId) return toast.error('Clinic selection is required');

    const bWeight = parseFloat(birthWeight);
    const cWeight = parseFloat(currentWeight);

    if (birthWeight && (isNaN(bWeight) || bWeight <= 0)) {
      return toast.error('Birth Weight must be a positive number');
    }
    if (currentWeight && (isNaN(cWeight) || cWeight <= 0)) {
      return toast.error('Current Weight must be a positive number');
    }

    setIsSubmitting(true);

    try {
      const payload = {
        namePrefix,
        name,
        dateOfBirth,
        gender,
        bloodGroup,
        birthWeight: bWeight || 0,
        currentWeight: cWeight || bWeight || 0,
        parentName,
        motherName,
        mobile,
        email: email || null,
        clinicId: parseInt(clinicId),
        address,
        visitType
      };

      const res = await axios.post(`${API_URL}/patients`, payload);
      toast.success('Patient registered successfully!');
      
      // Navigate to patient details page
      navigate(`/patients/${res.data.id}`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/patients')}
          className="h-10 w-10 border border-border bg-surface hover:bg-bg rounded-lg flex items-center justify-center transition-colors"
          title="Back to Patients List"
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Register New Patient</h1>
          <p className="text-sm text-secondary font-medium mt-1">Enroll a child and automatically build schedule</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* PATIENT DETAILS SECTION */}
        <div className="bg-surface border border-border rounded-lg shadow-sm p-6">
          <h2 className="text-sm font-bold text-accent uppercase tracking-wider border-b border-border pb-3 mb-6">
            PATIENT DETAILS
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">Prefix</label>
              <select
                value={namePrefix}
                onChange={(e) => setNamePrefix(e.target.value)}
                className="h-10 border border-border rounded-lg px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
              >
                <option value="Baby">Baby</option>
                <option value="B/O">B/O (Baby of)</option>
                <option value="Master">Master</option>
                <option value="">None</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">Patient Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Sonu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 border border-border rounded-lg px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">Date of Birth *</label>
              <input
                type="date"
                required
                max={dayjs().format('YYYY-MM-DD')}
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="h-10 border border-border rounded-lg px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">Gender *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="h-10 border border-border rounded-lg px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="h-10 border border-border rounded-lg px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
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

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">Birth Weight (kg)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 3.2"
                value={birthWeight}
                onChange={(e) => setBirthWeight(e.target.value)}
                className="h-10 border border-border rounded-lg px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">Current Weight (kg)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 3.5"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                className="h-10 border border-border rounded-lg px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* PARENT DETAILS SECTION */}
        <div className="bg-surface border border-border rounded-lg shadow-sm p-6">
          <h2 className="text-sm font-bold text-accent uppercase tracking-wider border-b border-border pb-3 mb-6">
            PARENT DETAILS
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">Father / Guardian Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Raj kumar"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="h-10 border border-border rounded-lg px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">Mother Name</label>
              <input
                type="text"
                placeholder="e.g. Riya Kumari"
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                className="h-10 border border-border rounded-lg px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">Mobile Number (10 digits) *</label>
              <input
                type="text"
                required
                maxLength="10"
                placeholder="e.g. 9568956895"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="h-10 border border-border rounded-lg px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                placeholder="e.g. parents_sonu@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 border border-border rounded-lg px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">Linked Clinic *</label>
              <select
                value={clinicId}
                required
                onChange={(e) => setClinicId(e.target.value)}
                className="h-10 border border-border rounded-lg px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
              >
                <option value="">Select Clinic</option>
                {clinics.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">Type of Visit *</label>
              <select
                value={visitType}
                required
                onChange={(e) => setVisitType(e.target.value)}
                className="h-10 border border-border rounded-lg px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent"
              >
                <option value="Normal OPD visit">Normal OPD visit</option>
                <option value="NICU">NICU</option>
                <option value="Follow up">Follow up</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">Home Address</label>
              <textarea
                rows="3"
                placeholder="e.g. STPI, Bhubaneswar, 787878, Odisha"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="border border-border rounded-lg p-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent resize-none"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/patients')}
            className="h-11 px-6 border border-border bg-surface hover:bg-bg text-primary text-sm font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 px-6 bg-accent hover:bg-accent-hover text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Register Patient'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegisterPatient;
