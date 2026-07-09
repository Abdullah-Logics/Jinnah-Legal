import { Component, type ReactNode, type ErrorInfo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { AnimatePresence } from 'framer-motion';
import { CallProvider } from './context/CallContext';
import CallOverlay from './components/CallOverlay';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; info: ErrorInfo | null }> {
  state = { error: null, info: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { this.setState({ info }); console.error('Boundary:', error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
        <div className="max-w-xl w-full bg-white rounded-2xl p-8 shadow-lg border border-red-100">
          <h2 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h2>
          <p className="text-slate-600 mb-4 text-sm">{this.state.error.message}</p>
          <details className="text-xs text-slate-400">
            <summary className="cursor-pointer font-medium text-slate-500 mb-1">Component Stack</summary>
            <pre className="whitespace-pre-wrap bg-slate-50 p-3 rounded-lg max-h-48 overflow-auto">{(this.state.info as ErrorInfo | null)?.componentStack || ''}</pre>
          </details>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition">Reload Page</button>
        </div>
      </div>
    );
  }
}


// Pages
import Landing from './pages/Landing';
import WeeklyReport from './pages/WeeklyReport';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Lawyer Portal
import LawyerDashboard from './pages/lawyer/Dashboard';
import LawyerCases from './pages/lawyer/Cases';
import LawyerCaseDetail from './pages/lawyer/CaseDetail';
import LawyerJournal from './pages/lawyer/Journal';
import LawyerResearch from './pages/lawyer/Research';
import LawyerDocuments from './pages/lawyer/Documents';
import LawyerTimeTracking from './pages/lawyer/TimeTracking';
import LawyerClients from './pages/lawyer/Clients';
import LawyerRequests from './pages/lawyer/Requests';
import LawyerCalendar from './pages/lawyer/Calendar';
import LawyerMessages from './pages/lawyer/Messages';
import LawyerProfile from './pages/lawyer/Profile';
import LawyerAIBrain from './pages/lawyer/AIBrain';
import LawyerCitations from './pages/lawyer/Citations';


import ConstitutionReader from './pages/lawyer/Constitution';
import LawyerGroups from './pages/lawyer/Groups';

import CallLogs from './pages/CallLogs';

// Client Portal
import ClientDashboard from './pages/client/Dashboard';
import ClientCases from './pages/client/Cases';
import ClientCaseDetail from './pages/client/CaseDetail';
import ClientFindLawyer from './pages/client/FindLawyer';
import ClientLawyerProfile from './pages/client/LawyerProfile';
import ClientBilling from './pages/client/Billing';
import ClientMessages from './pages/client/Messages';
import ClientCalendar from './pages/client/Calendar';
import ClientProfile from './pages/client/Profile';
import ClientAIAssistant from './pages/client/AIAssistant';
import ClientDocuments from './pages/client/Documents';
import ClientRequests from './pages/client/Requests';
import ClientGroups from './pages/client/Groups';

// Admin Portal
import AdminDashboard from './pages/admin/Dashboard';
import AdminLawyers from './pages/admin/Lawyers';
import AdminClients from './pages/admin/Clients';
import AdminVerification from './pages/admin/Verification';
import AdminReports from './pages/admin/Reports';
import AdminBlocks from './pages/admin/Blocks';
import AdminMessagesView from './pages/admin/MessagesAdmin';
import AdminCallLogs from './pages/admin/CallLogs';
import AdminSubscriptions from './pages/admin/Subscriptions';
import AdminAnalytics from './pages/admin/Analytics';
import AdminSettings from './pages/admin/Settings';

// Layouts
import LawyerLayout from './layouts/LawyerLayout';
import ClientLayout from './layouts/ClientLayout';
import AdminLayout from './layouts/AdminLayout';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { isAuthenticated, currentUser } = useStore();
  
  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const currentUser = useStore(s => s.currentUser);
  return (
    <Router>
      <CallProvider userId={currentUser?.id || null}>
      <CallOverlay />
      <ErrorBoundary>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Lawyer Portal */}
          <Route path="/lawyer" element={
            <ProtectedRoute allowedRoles={['lawyer']}>
              <LawyerLayout />
            </ProtectedRoute>
          }>
            <Route index element={<LawyerDashboard />} />
            <Route path="cases" element={<LawyerCases />} />
            <Route path="cases/:id" element={<LawyerCaseDetail />} />
            <Route path="journal" element={<LawyerJournal />} />
            <Route path="research" element={<LawyerResearch />} />
            <Route path="documents" element={<LawyerDocuments />} />
            <Route path="time-tracking" element={<LawyerTimeTracking />} />
            <Route path="clients" element={<LawyerClients />} />
            <Route path="requests" element={<LawyerRequests />} />
            <Route path="calendar" element={<LawyerCalendar />} />
            <Route path="weekly-report" element={<WeeklyReport />} />
            <Route path="messages" element={<LawyerMessages />} />
            <Route path="profile" element={<LawyerProfile />} />
            <Route path="ai-brain" element={<LawyerAIBrain />} />
            <Route path="citations" element={<LawyerCitations />} />
            <Route path="call-logs" element={<CallLogs />} />


            <Route path="constitution" element={<ConstitutionReader />} />
            <Route path="groups" element={<LawyerGroups />} />
          </Route>

          {/* Client Portal */}
          <Route path="/client" element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ClientDashboard />} />
            <Route path="cases" element={<ClientCases />} />
            <Route path="cases/:id" element={<ClientCaseDetail />} />
            <Route path="find-lawyer" element={<ClientFindLawyer />} />
            <Route path="lawyer/:id" element={<ClientLawyerProfile />} />
            <Route path="billing" element={<ClientBilling />} />
            <Route path="messages" element={<ClientMessages />} />
            <Route path="requests" element={<ClientRequests />} />
            <Route path="calendar" element={<ClientCalendar />} />
            <Route path="weekly-report" element={<WeeklyReport />} />
            <Route path="profile" element={<ClientProfile />} />
            <Route path="ai-assistant" element={<ClientAIAssistant />} />
            <Route path="call-logs" element={<CallLogs />} />
            <Route path="documents" element={<ClientDocuments />} />
            <Route path="groups" element={<ClientGroups />} />
          </Route>

          {/* Admin Portal */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin', 'firm_admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="lawyers" element={<AdminLawyers />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="verification" element={<AdminVerification />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="blocks" element={<AdminBlocks />} />
            <Route path="messages" element={<AdminMessagesView />} />
            <Route path="call-logs" element={<AdminCallLogs />} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
      </ErrorBoundary>
      </CallProvider>
    </Router>
  );
}

export default App;
