import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Loader, SkeletonCard } from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { Users, Calendar, CheckCircle, ArrowRight, AlertTriangle, ExternalLink } from 'lucide-react';
import dayjs from 'dayjs';

const Dashboard = () => {
  const { user, activeClinic, setActiveClinic, clinics, API_URL } = useAuth();
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [clinicStatsList, setClinicStatsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [activeVaccineTab, setActiveVaccineTab] = useState('all'); // 'all' or 'optional'
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
    { 
      title: 'Overdue', 
      value: stats?.overdueVaccines || 0, 
      icon: AlertTriangle, 
      color: 'text-red-600 border-red-200 bg-red-50',
      badgeColor: 'bg-red-600 text-white',
      onClick: () => navigate('/reminders?filter=overdue')
    },
    { title: 'Due in 7 Days', value: stats?.upcomingVaccines || 0, icon: Calendar, color: 'text-secondary' },
    { title: 'Vaccinated This Month', value: stats?.vaccinatedThisMonth || 0, icon: CheckCircle, color: 'text-status-completed-text' }
  ];

  // Tab counts
  const allVaccinesCount = upcoming.length;
  const optionalVaccinesCount = useMemo(() => {
    return upcoming.filter((v) => v.category === 'optional').length;
  }, [upcoming]);

  // Filter upcoming vaccines based on active switching tab
  const displayedUpcoming = useMemo(() => {
    if (activeVaccineTab === 'optional') {
      return upcoming.filter((v) => v.category === 'optional');
    }
    return upcoming;
  }, [upcoming, activeVaccineTab]);

  // Group displayed upcoming vaccines by patient
  const groupedUpcoming = useMemo(() => {
    const map = new Map();
    displayedUpcoming.forEach((item) => {
      if (!map.has(item.patientId)) {
        map.set(item.patientId, {
          patientId: item.patientId,
          patientName: item.patientName,
          parentName: item.parentName,
          uhid: item.uhid,
          uuid: item.uuid || item.uhid,
          mobile: item.mobile,
          vaccines: []
        });
      }
      map.get(item.patientId).vaccines.push(item);
    });
    return Array.from(map.values());
  }, [displayedUpcoming]);

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
                <div 
                  key={idx} 
                  onClick={card.onClick}
                  className={`bg-surface border border-border p-6 rounded-lg shadow-sm flex items-center justify-between transition-transform hover:-translate-y-0.5 ${card.onClick ? 'cursor-pointer hover:border-red-400 hover:shadow-md' : ''}`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-secondary uppercase tracking-wider">{card.title}</p>
                      {card.onClick && (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                          Click to View
                        </span>
                      )}
                    </div>
                    <p className={`text-3xl font-extrabold ${card.title === 'Overdue' && (stats?.overdueVaccines || 0) > 0 ? 'text-red-600' : 'text-primary'}`}>{card.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg border ${card.color}`}>
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

          {/* Due in Next 7 Days Table with Two Switching Tabs */}
          <div className="bg-surface border border-border rounded-lg shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-base font-bold text-primary">Due in Next 7 Days</h3>

              {/* Two Switching Tabs */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveVaccineTab('all')}
                  className={`h-9 px-4 rounded-full text-xs font-semibold tracking-wide border transition-all flex items-center gap-1.5 ${
                    activeVaccineTab === 'all'
                      ? 'bg-accent text-white border-accent shadow-sm'
                      : 'bg-surface text-secondary border-border hover:bg-bg'
                  }`}
                >
                  <span>All Vaccines Due in Next 7 Days</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      activeVaccineTab === 'all'
                        ? 'bg-white/20 text-white'
                        : 'bg-bg text-secondary border border-border'
                    }`}
                  >
                    {allVaccinesCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveVaccineTab('optional')}
                  className={`h-9 px-4 rounded-full text-xs font-semibold tracking-wide border transition-all flex items-center gap-1.5 ${
                    activeVaccineTab === 'optional'
                      ? 'bg-accent text-white border-accent shadow-sm'
                      : 'bg-surface text-secondary border-border hover:bg-bg'
                  }`}
                >
                  <span>All Optional Vaccine Dues in Next 7 Days</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      activeVaccineTab === 'optional'
                        ? 'bg-white/20 text-white'
                        : 'bg-bg text-secondary border border-border'
                    }`}
                  >
                    {optionalVaccinesCount}
                  </span>
                </button>
              </div>
            </div>

            {groupedUpcoming.length > 0 ? (
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
                    {groupedUpcoming.map((group) => (
                      <tr key={group.patientId} className="hover:bg-bg/40 transition-colors">
                        <td className="py-3.5 text-sm font-semibold text-primary">{group.patientName}</td>
                        <td className="py-3.5 text-sm text-secondary font-mono">{group.uhid}</td>
                        <td className="py-3.5 text-sm font-semibold text-accent">
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                            {group.vaccines.map((v, idx) => (
                              <span key={v.vaccinationId} className="whitespace-nowrap">
                                {v.vaccineName}{idx < group.vaccines.length - 1 ? ',' : ''}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 text-sm text-secondary whitespace-nowrap">
                          {Array.from(new Set(group.vaccines.map((v) => v.dueDate)))
                            .map((d) => dayjs(d).format('DD MMM YYYY'))
                            .join(', ')}
                        </td>
                        <td className="py-3.5 text-right whitespace-nowrap">
                          <a
                            href={`/patients/${group.patientId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 px-3 bg-surface hover:bg-bg border border-border hover:border-accent text-primary hover:text-accent text-xs font-semibold rounded-lg transition-all inline-flex items-center gap-1.5"
                          >
                            <span>View Patient</span>
                            <ExternalLink className="w-3.5 h-3.5 text-secondary" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title={
                  activeVaccineTab === 'optional'
                    ? "No optional vaccinations due soon"
                    : "No vaccinations due soon"
                }
                description={
                  activeVaccineTab === 'optional'
                    ? "There are no pending optional vaccinations scheduled in the next 7 days for this clinic selection."
                    : "There are no pending vaccinations scheduled in the next 7 days for this clinic selection."
                }
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
