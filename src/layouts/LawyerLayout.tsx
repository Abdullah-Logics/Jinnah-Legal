import { useState, useEffect, useMemo } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { avatarUrl } from '../utils/resolveUrl';
import { useSiteContent } from '../context/SiteContentContext';
import { resolvePortalNav, portalBackground } from '../utils/portal';
import {
  LayoutDashboard, Briefcase, BookOpen, Search, FileText, Clock, Users,
  Calendar, MessageSquare, User, UserPlus, Brain, Menu, X, LogOut, Bell, BarChart3, UsersRound, BookMarked, Phone,
} from 'lucide-react';

const sidebarItems = [
  { path: '/lawyer', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { path: '/lawyer/messages', icon: MessageSquare, label: 'Messages' },
  { path: '/lawyer/groups', icon: UsersRound, label: 'Groups' },
  { path: '/lawyer/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/lawyer/weekly-report', icon: BarChart3, label: 'Weekly Plan' },
  { path: '/lawyer/journal', icon: BookOpen, label: 'Journal' },
  { path: '/lawyer/cases', icon: Briefcase, label: 'Case Hub' },
  { path: '/lawyer/clients', icon: Users, label: 'Clients' },
  { path: '/lawyer/documents', icon: FileText, label: 'Documents' },
  { path: '/lawyer/ai-brain', icon: Brain, label: 'AI Brain' },
  { path: '/lawyer/constitution', icon: BookMarked, label: 'Constitution' },
  { path: '/lawyer/call-logs', icon: Phone, label: 'Call Logs' },
  { path: '/lawyer/research', icon: Search, label: 'Research & Citations' },
  { path: '/lawyer/time-tracking', icon: Clock, label: 'Time & Billing' },
  { path: '/lawyer/requests', icon: UserPlus, label: 'Network' },
  { path: '/lawyer/profile', icon: User, label: 'Profile' },
];

export default function LawyerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(true);
  const { currentUser, logout, messages, loadUsers } = useStore();
  const { content } = useSiteContent();
  const portal = content.portals.lawyer;
  const accent = portal.accent || content.brand.accent;
  const navItems = useMemo(() => resolvePortalNav(sidebarItems, portal.nav), [portal.nav]);
  const compact = portal.density === 'compact';
  const sidebarWidth = compact ? 'w-64' : 'w-72';
  const contentOffset = compact ? 'lg:ml-64' : 'lg:ml-72';
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { setAnnouncementOpen(true); }, [portal.announcement.text]);

  const unreadCount = messages.filter(m => m.receiverId === currentUser?.id && !m.read).length;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="h-dvh grid grid-rows-[1fr] bg-slate-50">
      <header
        className="lg:hidden fixed top-0 left-0 right-0 h-14 text-white z-40 flex items-center justify-between px-4 shadow-lg"
        style={{ background: `linear-gradient(90deg, ${accent}, #064e3b)` }}
      >
        <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-lg transition">
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <img src={content.brand.logoUrl || '/logo192.png'} alt={content.brand.name} className="w-7 h-7 rounded-lg object-cover" />
          <span className="font-serif font-bold text-base">{content.brand.name}</span>
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

      <aside
        className={`
        fixed top-0 left-0 h-full ${sidebarWidth} bg-gradient-to-b from-emerald-700 via-emerald-800 to-slate-900 text-white z-50
        transform transition-transform duration-300 ease-in-out flex flex-col
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
        style={{ background: portalBackground(portal, content.brand.accent) }}
      >
        <div className="flex-shrink-0 p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src={content.brand.logoUrl || '/logo192.png'} alt={content.brand.name} className="w-10 h-10 rounded-xl object-cover shadow-md" />
            <div>
              <h1 className="font-serif font-bold text-base">{content.brand.name}</h1>
              <p className="text-[10px] text-emerald-200">{portal.name}</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/10 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {portal.showProfileCard && (
          <div className="flex-shrink-0 p-4 border-b border-white/10">
            <NavLink to="/lawyer/profile" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 hover:opacity-80 transition">
              <img
                src={avatarUrl(currentUser)}
                alt={currentUser?.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{currentUser?.name}</h3>
                <p className="text-[10px] text-emerald-200 truncate">{portal.subtitle}</p>
              </div>
            </NavLink>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto overscroll-contain p-3">
          <ul className="space-y-1">
            {navItems.map(item => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive: active }) => `
                    flex items-center gap-3 rounded-xl transition-all duration-200
                    ${compact ? 'px-3 py-2 text-[13px]' : 'px-4 py-2.5 text-sm'}
                    ${active ? 'bg-white/20 text-white shadow-lg' : 'text-emerald-100 hover:bg-white/10 hover:text-white'}
                  `}
                >
                  <item.icon size={compact ? 16 : 18} />
                  <span>{item.label}</span>
                  {item.path === '/lawyer/messages' && unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
            <li className="pt-2 mt-2 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-red-300 hover:bg-red-500/20 rounded-xl transition text-sm"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {location.pathname.startsWith('/lawyer/messages') ? (
        <main className={`${contentOffset} pt-14 lg:pt-0 flex flex-col min-h-0 overflow-x-hidden`}>
          <PortalAnnouncement
            enabled={announcementOpen && portal.announcement.enabled && !!portal.announcement.text}
            text={portal.announcement.text}
            linkLabel={portal.announcement.linkLabel}
            linkTo={portal.announcement.linkTo}
            accent={accent}
            onClose={() => setAnnouncementOpen(false)}
          />
          <Outlet />
        </main>
      ) : (
        <main className={`${contentOffset} pt-14 lg:pt-0 overflow-y-auto min-h-0 scroll-main overflow-x-hidden`}>
          <PortalAnnouncement
            enabled={announcementOpen && portal.announcement.enabled && !!portal.announcement.text}
            text={portal.announcement.text}
            linkLabel={portal.announcement.linkLabel}
            linkTo={portal.announcement.linkTo}
            accent={accent}
            onClose={() => setAnnouncementOpen(false)}
          />
          <div className="p-3 lg:p-6" style={{ minHeight: 'calc(100vh + 2px)' }}>
            <Outlet />
          </div>
        </main>
      )}
    </div>
  );
}

function PortalAnnouncement({ enabled, text, linkLabel, linkTo, accent, onClose }: {
  enabled: boolean;
  text: string;
  linkLabel: string;
  linkTo: string;
  accent: string;
  onClose: () => void;
}) {
  if (!enabled) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-white" style={{ background: accent }}>
      <span className="flex-1">{text}</span>
      {linkLabel && linkTo && (
        <Link to={linkTo} className="underline underline-offset-2 font-semibold hover:opacity-90 shrink-0">
          {linkLabel}
        </Link>
      )}
      <button onClick={onClose} aria-label="Dismiss announcement" className="p-1 rounded hover:bg-white/20 shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}
