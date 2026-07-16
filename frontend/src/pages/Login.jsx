import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Activity } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const credentials = { type: 'doctor', username, password };
      const res = await login(credentials);
      toast.success(`Welcome ${res.name || 'Doctor'}!`);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-surface border border-border shadow-sm rounded-lg overflow-hidden">
        {/* Header */}
        <div className="p-8 text-center border-b border-border bg-accent-soft">
          <div className="w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">KIDDOSCARE</h1>
          <p className="text-sm text-secondary font-medium mt-1">Vaccination Tracking Platform</p>
        </div>

        {/* Form Title */}
        <div className="px-8 pt-6 pb-2">
          <h2 className="text-sm font-bold text-accent uppercase tracking-wider">Clinician / Staff Sign In</h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6">
          {/* Doctor Form Fields */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider">Username</label>
            <input
              type="text"
              required
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-11 border border-border rounded-lg px-3 text-sm text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-surface"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 border border-border rounded-lg px-3 text-sm text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-surface"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-accent hover:bg-accent-hover text-white rounded-lg font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <p className="text-xs font-semibold text-secondary mt-6">KIDDOSCARE v1.0 • Secure Pediatric Network</p>
    </div>
  );
};

export default Login;
