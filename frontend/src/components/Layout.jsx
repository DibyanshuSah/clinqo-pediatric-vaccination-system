import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import { LogOut, Menu } from 'lucide-react';

const Layout = () => {
  const { user, loading, logout } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

  if (user.role === 'parent') {
    // Parent Portal Layout (No sidebar, top header instead)
    return (
      <div className="min-h-screen bg-bg flex flex-col">
        <header className="bg-surface border-b border-border h-16 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-primary">KIDDOSCARE</h1>
            <p className="text-[10px] text-secondary font-medium uppercase tracking-wider">Parent Portal</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-primary">{user.name}</p>
              <p className="text-xs text-secondary">Guardian of {user.patientName}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-secondary hover:text-primary rounded-lg border border-border bg-surface hover:bg-bg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
        <footer className="py-6 border-t border-border text-center text-xs font-semibold text-secondary">
          KIDDOSCARE v1.0
        </footer>
      </div>
    );
  }

  // Doctor Layout (Sidebar + Header + Content)
  return (
    <div className="flex bg-bg min-h-screen relative">
      {/* Mobile Sidebar overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-primary/40 z-30 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      
      <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 -ml-2 text-secondary hover:text-primary rounded-lg md:hidden hover:bg-bg"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-semibold text-secondary">
              Welcome back, <span className="text-primary font-bold">{user.name}</span>
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs bg-accent-soft text-accent px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
              {user.role}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
