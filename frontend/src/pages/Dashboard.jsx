import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Loader, SkeletonCard } from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { Users, Calendar, CheckCircle, ArrowRight } from 'lucide-react';
import dayjs from 'dayjs';

const Dashboard = () => {
  const { user, activeClinic, setActiveClinic, clinics, API_URL } = useAuth();
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [clinicStatsList, setClinicStatsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const navigate = useNavigate();

  // Load Dashboard stats & upcoming vaccines
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const clinicParam = activeClinic !== 'all' ? `?clinicId=${activeClinic}` : '';
      
      const [statsRes, upcomingRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/stats${clinicParam}`),
        axios.get(`${API_URL}/dashboard/upcoming-vaccines?days=7${activeClinic !== 'all' ? `&clinicId=${activeClinic}` : ''}`)
      ]);
      
      setStats(statsRes.data);
      setUpcoming(upcomingRes.data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load stats for all clinics individually for the clinic breakdown section
  const loadClinicBreakdown = async () => {
    if (clinics.length === 0) return;
    setLoadingBreakdown(true);
    try {
      const breakdownData = await Promise.all(
        clinics.map(async (clinic) => {
          const res = await axios.get(`${API_URL}/dashboard/stats?clinicId=${clinic.id}`);
          return {
            clinicId: clinic.id,
            clinicName: clinic.name,
            totalPatients: res.data.totalPatients,
            upcomingVaccines: res.data.upcomingVaccines,
            vaccinatedThisMonth: res.data.vaccinatedThisMonth
          };
        })
      );
      setClinicStatsList(breakdownData);
    } catch (err) {
      console.error('Error loading clinic breakdown stats:', err);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [activeClinic]);

  useEffect(() => {
    if (clinics.length > 0) {
      loadClinicBreakdown();
    }
  }, [clinics]);

  const statsCards = [
    { title: 'Total Patients', value: stats?.totalPatients || 0, icon: Users, color: 'text-primary' },
    { title: 'Due Today', value: stats?.vaccinesToday || 0, icon: Calendar, color: 'text-accent' },
    { title: 'Due in 7 Days', value: stats?.upcomingVaccines || 0, icon: Calendar, color: 'text-secondary' },
    { title: 'Vaccinated This Month', value: stats?.vaccinatedThisMonth || 0, icon: CheckCircle, color: 'text-status-completed-text' }
  ];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h1>
          <p className="text-sm text-secondary font-medium mt-1">
            Logged in as <span className="font-bold text-primary">{user?.name || "Dr. Shubha Sandeep Mahanty"}</span> • {dayjs().format('MMMM DD, YYYY')}
          </p>
        </div>
      </div>

      {/* Clinic Chips */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        <button
          onClick={() => setActiveClinic('all')}
          className={`h-9 px-4 rounded-full text-xs font-semibold tracking-wide border transition-all ${
            activeClinic === 'all'
              ? 'bg-accent text-white border-accent shadow-sm'
              : 'bg-surface text-secondary border-border hover:bg-bg'
          }`}
        >
          All Clinics
        </button>
        {clinics.map((clinic) => (
          <button
            key={clinic.id}
            onClick={() => setActiveClinic(clinic.id)}
            className={`h-9 px-4 rounded-full text-xs font-semibold tracking-wide border transition-all ${
              activeClinic === clinic.id
                ? 'bg-accent text-white border-accent shadow-sm'
                : 'bg-surface text-secondary border-border hover:bg-bg'
            }`}
          >
            {clinic.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={idx} className="bg-surface border border-border p-6 rounded-lg shadow-sm flex items-center justify-between transition-transform hover:-translate-y-0.5">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-secondary uppercase tracking-wider">{card.title}</p>
                    <p className="text-3xl font-extrabold text-primary">{card.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-bg border border-border ${card.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Next Vaccine Due & Clinic Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Next Vaccine Due Card */}
            <div className="lg:col-span-1 bg-surface border border-border rounded-lg shadow-sm p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-secondary uppercase tracking-wider border-b border-border pb-3 mb-4">
                  Next Vaccine Due
                </h3>
                {stats?.nextVaccineDue ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-secondary font-medium">Vaccine Name</p>
                      <p className="text-lg font-bold text-accent">{stats.nextVaccineDue.vaccineName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-secondary font-medium">Patient Name</p>
                      <p className="text-base font-semibold text-primary">{stats.nextVaccineDue.patientName}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-secondary font-medium">UHID</p>
                        <p className="text-sm font-bold text-primary">{stats.nextVaccineDue.uhid}</p>
                      </div>
                      <div>
                        <p className="text-xs text-secondary font-medium">Age Schedule</p>
                        <p className="text-sm font-semibold text-primary">{stats.nextVaccineDue.ageLabel}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-secondary font-medium">Due Date</p>
                      <p className="text-sm font-bold text-primary">
                        {dayjs(stats.nextVaccineDue.dueDate).format('DD MMM YYYY')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-secondary">
                    No vaccines currently scheduled.
                  </div>
                )}
              </div>
              {stats?.nextVaccineDue && (
                <button
                  onClick={() => navigate(`/patients/${stats.nextVaccineDue.patientId}`)}
                  className="mt-6 w-full h-10 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  View Patient <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Clinic Breakdown Cards */}
            <div className="lg:col-span-2 bg-surface border border-border rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-bold text-secondary uppercase tracking-wider border-b border-border pb-3 mb-4">
                Clinic Breakdown
              </h3>
              {loadingBreakdown ? (
                <Loader />
              ) : clinicStatsList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clinicStatsList.map((c) => (
                    <div key={c.clinicId} className="border border-border rounded-lg p-4 bg-bg flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-primary line-clamp-1">{c.clinicName}</h4>
                        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                          <div className="bg-surface border border-border rounded p-2">
                            <span className="text-[10px] text-secondary font-semibold uppercase tracking-wider block">Patients</span>
                            <span className="text-base font-bold text-primary">{c.totalPatients}</span>
                          </div>
                          <div className="bg-surface border border-border rounded p-2">
                            <span className="text-[10px] text-secondary font-semibold uppercase tracking-wider block">Due 7d</span>
                            <span className="text-base font-bold text-primary">{c.upcomingVaccines}</span>
                          </div>
                          <div className="bg-surface border border-border rounded p-2">
                            <span className="text-[10px] text-secondary font-semibold uppercase tracking-wider block">Completed</span>
                            <span className="text-base font-bold text-primary">{c.vaccinatedThisMonth}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-secondary">
                  No clinics found. Please register a clinic.
                </div>
              )}
            </div>
          </div>

          {/* Due in Next 7 Days Table */}
          <div className="bg-surface border border-border rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-primary">Due in Next 7 Days</h3>
            </div>

            {upcoming.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-3 text-xs font-bold text-secondary uppercase tracking-wider">Patient</th>
                      <th className="pb-3 text-xs font-bold text-secondary uppercase tracking-wider">UHID</th>
                      <th className="pb-3 text-xs font-bold text-secondary uppercase tracking-wider">Vaccine</th>
                      <th className="pb-3 text-xs font-bold text-secondary uppercase tracking-wider">Due Date</th>
                      <th className="pb-3 text-xs font-bold text-secondary uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {upcoming.map((row) => (
                      <tr key={row.vaccinationId} className="hover:bg-bg/40 transition-colors">
                        <td className="py-3.5 text-sm font-semibold text-primary">{row.patientName}</td>
                        <td className="py-3.5 text-sm text-secondary font-mono">{row.uhid}</td>
                        <td className="py-3.5 text-sm font-semibold text-accent">{row.vaccineName}</td>
                        <td className="py-3.5 text-sm text-secondary">
                          {dayjs(row.dueDate).format('DD MMM YYYY')}
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => navigate(`/patients/${row.patientId}`)}
                            className="h-8 px-3 bg-surface hover:bg-bg border border-border text-primary text-xs font-semibold rounded-lg transition-all inline-flex items-center gap-1"
                          >
                            View Patient
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No vaccinations due soon"
                description="There are no pending vaccinations scheduled in the next 7 days for this clinic selection."
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
