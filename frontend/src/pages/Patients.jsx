import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Loader, SkeletonTable } from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { Search, Plus, ChevronLeft, ChevronRight, ChevronRightSquare } from 'lucide-react';
import dayjs from 'dayjs';

const Patients = () => {
  const { clinics, API_URL } = useAuth();
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedClinic, setSelectedClinic] = useState('all');
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const searchTimeoutRef = useRef(null);

  const loadPatients = async (searchTerm = search, clinicId = selectedClinic, currentPage = page) => {
    setLoading(true);
    try {
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
      const clinicParam = clinicId !== 'all' ? `&clinicId=${clinicId}` : '';
      
      const res = await axios.get(
        `${API_URL}/patients?page=${currentPage}&limit=10${searchParam}${clinicParam}`
      );
      
      setPatients(res.data.patients);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error('Error loading patients:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced Search Handler
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    setPage(1);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadPatients(value, selectedClinic, 1);
    }, 500); // 500ms debounce
  };

  const handleClinicChange = (e) => {
    const value = e.target.value;
    setSelectedClinic(value);
    setPage(1);
    loadPatients(search, value, 1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      loadPatients(search, selectedClinic, newPage);
    }
  };

  useEffect(() => {
    loadPatients();
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Helper to calculate current age in months/years
  const calculateAge = (dobString) => {
    const dob = dayjs(dobString);
    const now = dayjs();
    const diffMonths = now.diff(dob, 'month');
    
    if (diffMonths < 12) {
      return `${diffMonths} Month${diffMonths !== 1 ? 's' : ''}`;
    }
    const diffYears = now.diff(dob, 'year');
    const remainingMonths = diffMonths % 12;
    if (remainingMonths === 0) {
      return `${diffYears} Year${diffYears !== 1 ? 's' : ''}`;
    }
    return `${diffYears} Yr${diffYears !== 1 ? 's' : ''} ${remainingMonths} Mo${remainingMonths !== 1 ? 's' : ''}`;
  };


  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Patients</h1>
          <p className="text-sm text-secondary font-medium mt-1">Manage and register child patient profiles</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/patients/register')}
            className="h-10 px-4 bg-accent hover:bg-accent-hover text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Register Patient
          </button>
        </div>
      </div>

      {/* Toolbar / Search & Filters */}
      <div className="bg-surface border border-border p-4 rounded-lg shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" />
          <input
            type="text"
            placeholder="Search by Name, UHID, or Mobile..."
            value={search}
            onChange={handleSearchChange}
            className="w-full h-10 pl-10 pr-4 border border-border rounded-lg text-sm text-primary bg-surface focus:outline-none focus:border-accent"
          />
        </div>

        <div className="w-full md:w-auto flex items-center gap-2">
          <span className="text-xs font-bold text-secondary uppercase tracking-wider whitespace-nowrap">Clinic Filter:</span>
          <select
            value={selectedClinic}
            onChange={handleClinicChange}
            className="h-10 border border-border rounded-lg px-3 text-sm text-primary bg-surface focus:outline-none focus:border-accent min-w-[200px]"
          >
            <option value="all">All Clinics</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table view */}
      {loading ? (
        <SkeletonTable />
      ) : patients.length > 0 ? (
        <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-bg/50">
                  <th className="py-3 px-6 text-xs font-bold text-secondary uppercase tracking-wider">Patient Details</th>
                  <th className="py-3 px-6 text-xs font-bold text-secondary uppercase tracking-wider">UHID</th>
                  <th className="py-3 px-6 text-xs font-bold text-secondary uppercase tracking-wider">Age / DOB</th>
                  <th className="py-3 px-6 text-xs font-bold text-secondary uppercase tracking-wider">Contact</th>
                  <th className="py-3 px-6 text-xs font-bold text-secondary uppercase tracking-wider">Guardian</th>
                  <th className="py-3 px-6 text-xs font-bold text-secondary uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {patients.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/patients/${p.id}`)}
                    className="hover:bg-bg/50 transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {/* Avatar initials with medical teal styling */}
                        <div className="w-10 h-10 rounded-full bg-accent-soft text-accent font-bold text-sm flex items-center justify-center border border-accent/10">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-primary flex items-center gap-2">
                            {p.namePrefix && <span className="text-xs font-semibold text-secondary">{p.namePrefix}</span>}
                            {p.name}
                          </div>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-bg text-secondary border border-border">
                              {p.gender}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-accent-soft text-accent border border-accent/10 line-clamp-1 max-w-[120px]">
                              {p.clinicName}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm font-mono font-bold text-primary">{p.uhid}</td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-semibold text-primary">{calculateAge(p.dateOfBirth)}</div>
                      <div className="text-xs text-secondary mt-0.5">
                        DOB: {dayjs(p.dateOfBirth).format('DD MMM YYYY')}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-secondary font-medium">{p.mobile}</td>
                    <td className="py-4 px-6 text-sm text-primary font-semibold">{p.parentName}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="text-secondary hover:text-accent inline-flex items-center transition-colors">
                        <ChevronRightSquare className="w-5 h-5" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-bg px-6 py-4 border-t border-border flex items-center justify-between flex-wrap gap-4">
              <span className="text-xs font-semibold text-secondary">
                Showing page {page} of {totalPages} ({total} patients total)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="h-9 w-9 border border-border bg-surface hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {[...Array(totalPages)].map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePageChange(idx + 1)}
                    className={`h-9 w-9 rounded-lg text-xs font-bold transition-all border ${
                      page === idx + 1
                        ? 'bg-accent text-white border-accent'
                        : 'border-border bg-surface hover:bg-bg text-secondary'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="h-9 w-9 border border-border bg-surface hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          title="No patients found"
          description="There are no patients registered matching the search query or clinic selection."
        />
      )}
    </div>
  );
};

export default Patients;
