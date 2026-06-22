import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Briefcase,
  BookOpen,
  Search,
  FileText,
  Clock,
  Users,
  Calendar,
  MessageSquare,
  User,
  UserPlus,
  Brain,
  Menu,
  X,
  LogOut,
  Bell,
  Scale,
} from 'lucide-react';

const navItems = [
  { path: '/lawyer', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { path: '/lawyer/ai-brain', icon: Brain, label: 'AI Second Brain' },
  { path: '/lawyer/journal', icon: BookOpen, label: 'Journal' },
  { path: '/lawyer/cases', icon: Briefcase, label: 'Case Hub' },
  { path: '/lawyer/research', icon: Search, label: 'AI Research' },
  { path: '/lawyer/documents', icon: FileText, label: 'Documents' },
  { path: '/lawyer/time-tracking', icon: Clock, label: 'Time & Billing' },
  { path: '/lawyer/clients', icon: Users, label: 'Clients' },
  { path: '/lawyer/requests', icon: UserPlus, label: 'Requests' },
  { path: '/lawyer/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/lawyer/messages', icon: MessageSquare, label: 'Messages' },
  { path: '/lawyer/profile', icon: User, label: 'Profile' },
];

export default function LawyerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser, logout, messages, loadUsers } = useStore();
  const navigate = useNavigate();

  useEffect(() => { loadUsers(); }, [loadUsers]);
  
  const unreadCount = messages.filter(m => m.receiverId === currentUser?.id && !m.read).length;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-emerald-700 to-emerald-800 text-white z-50 flex items-center justify-between px-4 shadow-lg">
        <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-lg transition">
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <Scale size={24} className="text-emerald-300" />
          <span className="font-serif font-bold text-lg">Jinnah Legal</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-white/10 rounded-lg relative transition">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
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
        fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-emerald-700 via-emerald-800 to-slate-900 text-white z-50
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Scale size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-lg">Jinnah Legal</h1>
              <p className="text-xs text-emerald-200">Lawyer Portal</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/10 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img
              src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.name}&background=random`}
              alt={currentUser?.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{currentUser?.name}</h3>
              <p className="text-xs text-emerald-200 truncate">{currentUser?.email}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                currentUser?.isVerified ? 'bg-emerald-500/30 text-emerald-200' : 'bg-emerald-700/30 text-emerald-200'
              }`}>
                {currentUser?.isVerified ? '✓ Verified' : 'Pending Verification'}
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
                      : 'text-emerald-100 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                  {item.label === 'Messages' && unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-slate-900/50">
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
