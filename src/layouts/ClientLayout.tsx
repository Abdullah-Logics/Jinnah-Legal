import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Briefcase, Search, CreditCard, Calendar, MessageSquare,
  User, UserPlus, Menu, X, LogOut, Bell, Scale, Bot, FileText, BarChart3, UsersRound,
} from 'lucide-react';

const sidebarItems = [
  { path: '/client', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { path: '/client/messages', icon: MessageSquare, label: 'Messages' },
  { path: '/client/groups', icon: UsersRound, label: 'Groups' },
  { path: '/client/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/client/weekly-report', icon: BarChart3, label: 'Weekly Plan' },
  { path: '/client/cases', icon: Briefcase, label: 'My Cases' },
  { path: '/client/documents', icon: FileText, label: 'Documents' },
  { path: '/client/find-lawyer', icon: Search, label: 'Find Lawyer' },
  { path: '/client/requests', icon: UserPlus, label: 'Network' },
  { path: '/client/billing', icon: CreditCard, label: 'Billing' },
  { path: '/client/ai-assistant', icon: Bot, label: 'AI Assistant' },
  { path: '/client/profile', icon: User, label: 'Profile' },
];

export default function ClientLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser, logout, messages, loadUsers } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const unreadCount = messages.filter(m => m.receiverId === currentUser?.id && !m.read).length;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string, end?: boolean) => {
    if (end) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-dvh flex flex-col bg-slate-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white z-40 flex items-center justify-between px-4 shadow-lg">
        <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-lg transition">
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <Scale size={20} className="text-emerald-200" />
          <span className="font-serif font-bold text-base">Jinnah Legal</span>
        </div>
        <button className="p-2 hover:bg-white/10 rounded-lg relative transition">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
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

      {/* Sidebar (Desktop) / Drawer (Mobile) */}
      <aside className={`
        fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-emerald-600 via-emerald-700 to-slate-900 text-white z-50
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Scale size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-base">Jinnah Legal</h1>
              <p className="text-[10px] text-emerald-200">Client Portal</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/10 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img
              src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.name}&background=random`}
              alt={currentUser?.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-300"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{currentUser?.name}</h3>
              <p className="text-[10px] text-emerald-200 truncate">{currentUser?.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/30 text-emerald-200 capitalize">
                {currentUser?.subscriptionPlan} Plan
              </span>
            </div>
          </div>
        </div>

        <nav className="p-3 flex-1 overflow-y-auto h-[calc(100%-180px)]">
          <ul className="space-y-1">
            {sidebarItems.map(item => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive: active }) => `
                    flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm
                    ${active ? 'bg-white/20 text-white shadow-lg' : 'text-emerald-100 hover:bg-white/10 hover:text-white'}
                  `}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                  {item.label === 'Messages' && unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-slate-900/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-red-300 hover:bg-red-500/20 rounded-xl transition text-sm"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 pt-14 lg:pt-0 flex flex-col">
        <div className="flex-1 p-3 lg:p-6 flex flex-col min-h-0 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}