import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layout & Components
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import RegisterPatient from './pages/RegisterPatient';
import PatientDetails from './pages/PatientDetails';
import Clinics from './pages/Clinics';
import Reminders from './pages/Reminders';
import PublicCertificate from './pages/PublicCertificate';

// A component that handles redirection based on active user role
const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'doctor') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Login & Shared Certificate Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/patient/:patientId/:uuid" element={<PublicCertificate />} />

          {/* Protected Routes Wrapper */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/register" element={<RegisterPatient />} />
            <Route path="/patients/:id" element={<PatientDetails />} />
            <Route path="/clinics" element={<Clinics />} />
            <Route path="/reminders" element={<Reminders />} />
          </Route>

          {/* Root Redirect / Fallback */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </AuthProvider>
  );
}

export default App;
