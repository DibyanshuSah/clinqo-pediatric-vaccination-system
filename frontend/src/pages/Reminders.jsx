import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Loader, SkeletonTable } from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { MessageCircle, Copy, Send, Check } from 'lucide-react';
import dayjs from 'dayjs';

const Reminders = () => {
  const { API_URL } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  const loadDueReminders = async () => {
    setLoading(true);
    try {  
      const res = await axios.get(`${API_URL}/reminders/due`);
      setReminders(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load due reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDueReminders();
  }, []);

  const handleCopyMessage = (rem) => {
    navigator.clipboard.writeText(rem.message);
    setCopiedId(rem.id);
    toast.success('Reminder message copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleManualSend = async (rem) => {
    try {
      // Mark as sent in DB
      await axios.post(`${API_URL}/reminders/${rem.id}/send`);
      toast.success('Reminder status marked as sent!');
      
      // Open WhatsApp deep link
      const waUrl = `https://api.whatsapp.com/send/?phone=91${rem.mobile}&text=${encodeURIComponent(rem.message)}`;
      window.open(waUrl, '_blank');
      
      // Refresh list
      loadDueReminders();
    } catch (err) {
      console.error(err);
      toast.error('Failed to send reminder');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">WhatsApp Reminders</h1>
        <p className="text-sm text-secondary font-medium mt-1">
          Review and manually dispatch immunization scheduling reminders
        </p>
      </div>

      {/* List */}
      {loading ? (
        <SkeletonTable />
      ) : reminders.length > 0 ? (
        <div className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-bg/50">
                  <th className="py-3 px-6 text-xs font-bold text-secondary uppercase tracking-wider">Status</th>
                  <th className="py-3 px-6 text-xs font-bold text-secondary uppercase tracking-wider">Patient Name</th>
                  <th className="py-3 px-6 text-xs font-bold text-secondary uppercase tracking-wider">Vaccine Details</th>
                  <th className="py-3 px-6 text-xs font-bold text-secondary uppercase tracking-wider">Due Date</th>
                  <th className="py-3 px-6 text-xs font-bold text-secondary uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reminders.map((rem) => (
                  <tr key={rem.id} className="hover:bg-bg/40 transition-colors">
                    <td className="py-4 px-6">
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          rem.status === 'sent'
                            ? 'bg-status-completed-bg text-status-completed-text'
                            : 'bg-status-pending-bg text-status-pending-text'
                        }`}
                      >
                        {rem.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-primary">{rem.patientName}</div>
                      <div className="text-xs text-secondary mt-0.5">Parent: {rem.parentName}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-accent">{rem.vaccineName}</div>
                      <div className="text-xs text-secondary font-semibold mt-0.5">Schedule: {rem.type.replace(/_/g, ' ')}</div>
                    </td>
                    <td className="py-4 px-6 text-sm font-semibold text-primary">
                      {dayjs(rem.dueDate).format('DD MMM YYYY')}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => handleCopyMessage(rem)}
                          className="h-8 px-2.5 border border-border hover:bg-bg rounded-lg text-secondary hover:text-primary transition-colors inline-flex items-center gap-1.5 text-xs font-semibold"
                          title="Copy Message Text"
                        >
                          {copiedId === rem.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-status-completed-text" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Msg
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleManualSend(rem)}
                          className="h-8 px-3 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors inline-flex items-center gap-1.5 text-xs font-bold shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" /> Send Reminder
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No upcoming reminders"
          description="There are currently no child vaccination reminders due in the selected 7-day or 3-day scheduling windows."
        />
      )}
    </div>
  );
};

export default Reminders;
