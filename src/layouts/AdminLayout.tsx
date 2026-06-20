import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CreditCard,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  Bell,
  Scale,
  Gavel,
} from 'lucide-react';

const platformNav = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { path: '/admin/lawyers', icon: Gavel, label: 'Lawyers' },
  { path: '/admin/clients', icon: Users, label: 'Clients' },
  { path: '/admin/verification', icon: UserCheck, label: 'Verification' },
  { path: '/admin/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
];

const firmNav = [
  { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { path: '/admin/lawyers', icon: Gavel, label: 'Lawyers' },
  { path: '/admin/clients', icon: Users, label: 'Clients' },
  { path: '/admin/verification', icon: UserCheck, label: 'Verification' },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser, logout, users, loadUsers } = useStore();
  const navigate = useNavigate();
  const isFirmAdmin = currentUser?.role === 'firm_admin';
  const navItems = isFirmAdmin ? firmNav : platformNav;

  useEffect(() => {
    loadUsers();
  }, []);

  const pendingVerifications = users.filter(u => u.role === 'lawyer' && u.verificationStatus === 'pending').length;
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Mobile Header */}
      <header className={`lg:hidden fixed top-0 left-0 right-0 h-16 text-white z-50 flex items-center justify-between px-4 shadow-lg ${isFirmAdmin ? 'bg-gradient-to-r from-emerald-900 to-emerald-800' : 'bg-gradient-to-r from-emerald-950 to-emerald-900'}`}>
        <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-lg transition">
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <Scale size={24} className="text-emerald-400" />
          <span className="font-serif font-bold text-lg">{isFirmAdmin ? 'Firm Admin' : 'Jinnah Admin'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-white/10 rounded-lg relative transition">
            <Bell size={20} />
            {pendingVerifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {pendingVerifications}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-50"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-72 text-white z-50
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isFirmAdmin ? 'bg-gradient-to-b from-emerald-900 via-emerald-800 to-slate-900' : 'bg-gradient-to-b from-emerald-950 via-emerald-900 to-black'}
      `}>
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isFirmAdmin ? 'bg-emerald-600' : 'bg-emerald-800'}`}>
              <Scale size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg">Jinnah Legal</h1>
              <p className={`text-xs ${isFirmAdmin ? 'text-emerald-200' : 'text-slate-300'}`}>{isFirmAdmin ? 'Firm Admin Portal' : 'Admin Portal'}</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/10 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isFirmAdmin ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-emerald-700 to-emerald-900'}`}>
            <span className="text-white font-bold text-lg">
              {currentUser?.name?.charAt(0) || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{currentUser?.name || 'Admin'}</h3>
            <p className={`text-xs truncate ${isFirmAdmin ? 'text-emerald-200' : 'text-slate-300'}`}>{currentUser?.email}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${isFirmAdmin ? 'bg-emerald-500/30 text-emerald-200' : 'bg-emerald-700/30 text-emerald-200'}`}>
              {isFirmAdmin ? 'Firm Admin' : 'System Admin'}
            </span>
          </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 flex-1 overflow-y-auto h-[calc(100vh-200px)]">
          <ul className="space-y-1">
            {navItems.map(item => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-white/20 text-white shadow-lg' 
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                  {item.label === 'Verification' && pendingVerifications > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {pendingVerifications}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-black/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-300 hover:bg-red-500/20 rounded-xl transition"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 pt-16 lg:pt-0 min-h-screen">
        {/* Desktop Header */}
        <div className="hidden lg:block" />
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
