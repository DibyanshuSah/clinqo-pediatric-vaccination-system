import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, Hospital, MessageSquare, LogOut, X } from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { logout, user } = useAuth();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Patients', path: '/patients', icon: Users },
    { name: 'Clinics', path: '/clinics', icon: Hospital },
    { name: 'Reminders', path: '/reminders', icon: MessageSquare }
  ];

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  return (
    <aside className={`w-64 bg-surface border-r border-border flex flex-col h-screen fixed md:sticky top-0 z-40 transition-transform duration-300 md:translate-x-0 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      {/* Header / Logo */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-primary">KIDDOSCARE</h1>
          <p className="text-xs text-secondary font-medium">Vaccination Tracker</p>
        </div>
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="p-1 rounded-md text-secondary hover:text-primary hover:bg-bg md:hidden"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Doctor Card */}
      <div className="p-4 mx-4 my-6 bg-bg border border-border rounded-lg flex flex-col">
        <span className="text-sm font-bold text-primary">
          {user?.name || "Dr. Shubha Sandeep Mahanty"}
        </span>
        <span className="text-xs text-secondary mt-1">
          Pediatrician & Neonatologist
        </span>
      </div>

      {/* Menus */}
      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-secondary hover:bg-bg hover:text-primary'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Actions & Footer */}
      <div className="p-4 border-t border-border mt-auto">
        <button
          onClick={() => {
            handleLinkClick();
            logout();
          }}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-secondary hover:bg-status-completed-bg hover:text-status-completed-text rounded-lg transition-all duration-200"
        >
          <LogOut className="w-5 h-5 text-secondary group-hover:text-status-completed-text" />
          Sign Out
        </button>
        <div className="mt-4 text-center">
          <p className="text-xs font-semibold text-secondary">KIDDOSCARE v1.0</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
