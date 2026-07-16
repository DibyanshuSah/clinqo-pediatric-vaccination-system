import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Loader, SkeletonCard } from '../components/Loader';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { Hospital, Plus, Edit2, Trash2, Phone, Mail, MapPin } from 'lucide-react';

const Clinics = () => {
  const { clinics, setClinics, loadClinics, API_URL, user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Active item
  const [selectedClinic, setSelectedClinic] = useState(null);

  // Form states
  const [formFields, setFormFields] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    city: ''
  });

  useEffect(() => {
    loadClinics().then(() => setLoading(false));
  }, []);

  const handleOpenAdd = () => {
    setFormFields({ name: '', address: '', phone: '', email: '', city: '' });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (clinic) => {
    setSelectedClinic(clinic);
    setFormFields({
      name: clinic.name,
      address: clinic.address,
      phone: clinic.phone,
      email: clinic.email || '',
      city: clinic.city
    });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (clinic) => {
    setSelectedClinic(clinic);
    setIsDeleteOpen(true);
  };

  // Add Clinic Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formFields.name || !formFields.address || !formFields.phone || !formFields.city) {
      return toast.error('All fields except email are required');
    }

    try {
      const res = await axios.post(`${API_URL}/clinics`, formFields);
      toast.success('Clinic registered successfully!');
      setIsAddOpen(false);
      loadClinics();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Registration failed');
    }
  };

  // Edit Clinic Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formFields.name || !formFields.address || !formFields.phone || !formFields.city) {
      return toast.error('All fields except email are required');
    }

    try {
      await axios.patch(`${API_URL}/clinics/${selectedClinic.id}`, formFields);
      toast.success('Clinic details updated!');
      setIsEditOpen(false);
      loadClinics();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  // Delete Clinic Confirm
  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(`${API_URL}/clinics/${selectedClinic.id}`);
      toast.success('Clinic deleted successfully');
      setIsDeleteOpen(false);
      loadClinics();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Deletion failed. Check if clinic is linked to patients.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Clinics</h1>
          <p className="text-sm text-secondary font-medium mt-1">Manage partner clinic distribution network</p>
        </div>
        {user?.role === 'doctor' && (
          <button
            onClick={handleOpenAdd}
            className="h-10 px-4 bg-accent hover:bg-accent-hover text-white text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4.5 h-4.5" /> Add Clinic
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : clinics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clinics.map((clinic) => (
            <div
              key={clinic.id}
              className="bg-surface border border-border rounded-lg shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center gap-3 border-b border-border pb-4 mb-4">
                  <div className="p-2.5 rounded-lg bg-accent-soft text-accent border border-accent/10">
                    <Hospital className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary text-base line-clamp-1">{clinic.name}</h3>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-bg text-secondary border border-border mt-1 inline-block">
                      {clinic.city}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <MapPin className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-secondary leading-normal">{clinic.address}</p>
                  </div>
                  <div className="flex gap-2.5 items-center">
                    <Phone className="w-4 h-4 text-secondary flex-shrink-0" />
                    <p className="text-xs text-primary font-semibold font-mono">{clinic.phone}</p>
                  </div>
                  {clinic.email && (
                    <div className="flex gap-2.5 items-center">
                      <Mail className="w-4 h-4 text-secondary flex-shrink-0" />
                      <p className="text-xs text-primary font-semibold break-all">{clinic.email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              {user?.role === 'doctor' && (
                <div className="flex justify-end gap-2 border-t border-border mt-6 pt-4">
                  <button
                    onClick={() => handleOpenEdit(clinic)}
                    className="h-8 w-8 border border-border hover:bg-bg rounded flex items-center justify-center text-secondary transition-colors"
                    title="Edit Clinic"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenDelete(clinic)}
                    className="h-8 w-8 border border-border hover:bg-red-50 rounded flex items-center justify-center text-red-600 transition-colors"
                    title="Delete Clinic"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No clinics registered"
          description="Click the Add Clinic button to register partner clinics."
        />
      )}

      {/* ADD CLINIC MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-primary/40 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-border rounded-lg shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-primary">Add New Clinic</h3>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="p-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase">Clinic Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BBSR GLOBAL CLINIC"
                    value={formFields.name}
                    onChange={(e) => setFormFields(p => ({ ...p, name: e.target.value }))}
                    className="h-10 border border-border rounded px-3 text-sm text-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bhubaneswar"
                    value={formFields.city}
                    onChange={(e) => setFormFields(p => ({ ...p, city: e.target.value }))}
                    className="h-10 border border-border rounded px-3 text-sm text-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 7899877899"
                    value={formFields.phone}
                    onChange={(e) => setFormFields(p => ({ ...p, phone: e.target.value }))}
                    className="h-10 border border-border rounded px-3 text-sm text-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. clinic_bbsr@gmail.com"
                    value={formFields.email}
                    onChange={(e) => setFormFields(p => ({ ...p, email: e.target.value }))}
                    className="h-10 border border-border rounded px-3 text-sm text-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase">Address *</label>
                  <textarea
                    rows="3"
                    required
                    placeholder="e.g. BBSR, 159357, Odisha"
                    value={formFields.address}
                    onChange={(e) => setFormFields(p => ({ ...p, address: e.target.value }))}
                    className="border border-border rounded p-3 text-sm text-primary resize-none"
                  />
                </div>
              </div>
              <div className="bg-bg px-6 py-4 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="h-10 px-4 text-xs font-bold border border-border bg-surface hover:bg-bg rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 text-xs font-bold bg-accent hover:bg-accent-hover text-white rounded"
                >
                  Register Clinic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLINIC MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-primary/40 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-border rounded-lg shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-primary">Edit Clinic Details</h3>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="p-6 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase">Clinic Name *</label>
                  <input
                    type="text"
                    required
                    value={formFields.name}
                    onChange={(e) => setFormFields(p => ({ ...p, name: e.target.value }))}
                    className="h-10 border border-border rounded px-3 text-sm text-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase">City *</label>
                  <input
                    type="text"
                    required
                    value={formFields.city}
                    onChange={(e) => setFormFields(p => ({ ...p, city: e.target.value }))}
                    className="h-10 border border-border rounded px-3 text-sm text-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formFields.phone}
                    onChange={(e) => setFormFields(p => ({ ...p, phone: e.target.value }))}
                    className="h-10 border border-border rounded px-3 text-sm text-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase">Email Address</label>
                  <input
                    type="email"
                    value={formFields.email}
                    onChange={(e) => setFormFields(p => ({ ...p, email: e.target.value }))}
                    className="h-10 border border-border rounded px-3 text-sm text-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase">Address *</label>
                  <textarea
                    rows="3"
                    required
                    value={formFields.address}
                    onChange={(e) => setFormFields(p => ({ ...p, address: e.target.value }))}
                    className="border border-border rounded p-3 text-sm text-primary resize-none"
                  />
                </div>
              </div>
              <div className="bg-bg px-6 py-4 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
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

      {/* DELETE CLINIC CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete Clinic?"
        message="Are you sure you want to delete this clinic? This operation will fail if the clinic is currently linked to registered patient files."
        confirmLabel="Confirm Delete"
        isDanger={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </div>
  );
};

export default Clinics;
