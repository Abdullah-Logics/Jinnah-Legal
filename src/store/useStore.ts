import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'lawyer' | 'client' | 'admin' | 'firm_admin';
export type SubscriptionPlan = 'free' | 'student' | 'starter' | 'pro' | 'firm';
export type CaseStatus = 'pending' | 'active' | 'closed' | 'won' | 'lost';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface Firm {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  description?: string;
  registrationNumber?: string;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  adminId?: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  address?: string;
  city?: string;
  firmId?: string;
  coordinates?: { lat: number; lng: number };
  subscriptionPlan: SubscriptionPlan;
  isVerified: boolean;
  verificationStatus?: VerificationStatus;
  credentials?: {
    barNumber?: string;
    licenseNumber?: string;
    specialization?: string[];
    experience?: number;
    education?: string;
    documents?: string[];
  };
  createdAt: string;
}

export interface Case {
  id: string;
  title: string;
  description: string;
  clientId: string;
  lawyerId: string;
  status: CaseStatus;
  type: string;
  clientStatus: string;
  timeline: { date: string; event: string; description: string }[];
  documents: { id: string; name: string; url: string; uploadedAt: string }[];
  createdAt: string;
  updatedAt: string;
  courtDates: { date: string; court: string; notes: string }[];
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  caseId?: string;
  attachments?: string;
}

export interface ConnectionRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  message: string;
  created_at: string;
  updated_at: string;
  sender_name?: string;
  sender_avatar?: string;
  receiver_name?: string;
  receiver_avatar?: string;
}

export interface Connection {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  connected_name: string;
  connected_avatar: string;
  connected_role: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  date: string;
  notes: string;
  todos: { id: string; text: string; completed: boolean }[];
  plans: string;
  content: string;
  createdAt?: string;
}

export interface Invoice {
  id: string;
  caseId: string;
  clientId: string;
  lawyerId: string;
  amount: number;
  hours: number;
  description: string;
  status: 'pending' | 'paid' | 'overdue';
  dueDate: string;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  lawyerId: string;
  caseId: string;
  hours: number;
  description: string;
  date: string;
  rate: number;
}

const API = import.meta.env.DEV
  ? 'http://localhost:3001'
  : 'https://indianapolis-reseller-moreover-columns.trycloudflare.com';

function normalizeJournalEntry(e: Record<string, unknown>): JournalEntry {
  const ts = (e.created_at || e.createdAt) as string | undefined;
  return {
    id: e.id as string,
    userId: (e.user_id || e.userId) as string,
    date: e.date as string,
    notes: e.notes as string,
    todos: e.todos as { id: string; text: string; completed: boolean }[] || [],
    plans: e.plans as string || '',
    content: (e.content as string) || '',
    createdAt: ts ? (ts.includes('Z') ? ts : ts + 'Z') : undefined,
  };
}

function normalizeFirm(f: Record<string, unknown>): Firm {
  return {
    id: f.id as string,
    name: f.name as string,
    email: f.email as string,
    phone: f.phone as string | undefined,
    address: f.address as string | undefined,
    city: f.city as string | undefined,
    description: f.description as string | undefined,
    registrationNumber: (f.registration_number || f.registrationNumber) as string | undefined,
    isVerified: !!(f.is_verified ?? f.isVerified),
    verificationStatus: (f.verification_status || f.verificationStatus || 'pending') as VerificationStatus,
    adminId: (f.admin_id || f.adminId) as string | undefined,
    createdAt: (f.created_at || f.createdAt) as string,
  };
}

async function apiFetch(path: string, opts: RequestInit = {}, token?: string | null) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const msg = err.error || 'Request failed';
    if (err.details && Array.isArray(err.details)) {
      throw new Error(`${msg}: ${err.details.map((d: {field:string,message:string}) => `${d.field}: ${d.message}`).join('; ')}`);
    }
    throw new Error(msg);
  }
  return res.json();
}

interface AppState {
  // Auth
  currentUser: User | null;
  isAuthenticated: boolean;
  token: string | null;

  // Cached data (loaded from API)
  users: User[];
  firms: Firm[];
  cases: Case[];
  clients: User[];
  messages: Message[];
  journals: JournalEntry[];
  invoices: Invoice[];
  timeEntries: TimeEntry[];

  // Auth actions
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  register: (user: Omit<User, 'id' | 'createdAt' | 'isVerified' | 'verificationStatus'> & { password: string }) => Promise<boolean>;
  logout: () => void;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;

  // Case actions
  loadCases: () => Promise<void>;
  addCase: (caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCase: (caseId: string, updates: Partial<Case>) => Promise<void>;
  deleteCase: (caseId: string) => Promise<void>;
  createCaseWithClient: (data: {
    email: string; password: string; name: string; phone?: string; city?: string;
    title: string; description?: string; type?: string; lawyerId: string;
  }) => Promise<any>;
  respondToCase: (caseId: string, clientStatus: 'approved' | 'rejected') => Promise<void>;
  loadClients: () => Promise<void>;

  // Message actions
  loadMessages: (withUserId?: string) => Promise<void>;
  sendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'read'> & { attachments?: string }) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;

  // Journal actions
  loadJournals: () => Promise<void>;
  addJournalEntry: (entry: Omit<JournalEntry, 'id'>) => Promise<void>;
  updateJournalEntry: (entryId: string, updates: Partial<JournalEntry>) => Promise<void>;
  deleteJournalEntry: (entryId: string) => Promise<void>;

  // Connection request actions
  requests: { sent: ConnectionRequest[]; received: ConnectionRequest[] };
  connections: Connection[];
  loadRequests: () => Promise<void>;
  sendRequest: (receiverId: string, message?: string) => Promise<void>;
  respondToRequest: (requestId: string, status: 'accepted' | 'declined') => Promise<void>;
  loadConnections: () => Promise<void>;

  // Invoice actions
  loadInvoices: () => Promise<void>;
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => Promise<void>;
  updateInvoice: (invoiceId: string, updates: Partial<Invoice>) => Promise<void>;

  // Time tracking
  loadTimeEntries: () => Promise<void>;
  addTimeEntry: (entry: Omit<TimeEntry, 'id'>) => Promise<void>;

  // Admin actions
  verifyLawyer: (lawyerId: string, status: VerificationStatus) => Promise<void>;
  loadUsers: () => Promise<void>;
  loadFirms: () => Promise<void>;
  registerFirm: (data: {
    name: string; email: string; password: string;
    phone?: string; city?: string; address?: string;
    description?: string; registrationNumber?: string;
    adminName?: string; adminPhone?: string;
  }) => Promise<{ firm: Firm; user: User }>;
  verifyFirm: (firmId: string, status: VerificationStatus) => Promise<void>;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      token: null,
      users: [],
      firms: [],
      cases: [],
      clients: [],
      messages: [],
      journals: [],
      requests: { sent: [], received: [] },
      connections: [],
      invoices: [],
      timeEntries: [],

      login: async (email, _password, _role) => {
        const data = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password: _password }),
        });
        localStorage.setItem('token', data.token);
        set({ currentUser: data.user, isAuthenticated: true, token: data.token });
        return true;
      },

      register: async (userData) => {
        const data = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: userData.email,
            password: (userData as any).password,
            name: userData.name,
            role: userData.role,
            phone: userData.phone || null,
            city: userData.city || null,
            firmId: (userData as any).firmId || undefined,
            subscriptionPlan: (userData as any).subscriptionPlan || 'free',
            specialization: (userData as any).specialization || (userData as any).credentials?.specialization?.join(',') || null,
            barNumber: (userData as any).barNumber || (userData as any).credentials?.barNumber || null,
            licenseNumber: (userData as any).licenseNumber || (userData as any).credentials?.licenseNumber || null,
            experience: (userData as any).experience ?? (userData as any).credentials?.experience ?? null,
            education: (userData as any).education || (userData as any).credentials?.education || null,
          }),
        });
        set({ currentUser: data.user, isAuthenticated: true, token: data.token });
        return true;
      },

      logout: () => set({ currentUser: null, isAuthenticated: false, token: null, cases: [], messages: [], journals: [], invoices: [], timeEntries: [] }),

      updateUser: async (userId, updates) => {
        const { token } = get();
        const updated = await apiFetch(`/api/users/${userId}`, { method: 'PATCH', body: JSON.stringify(updates) }, token);
        set(state => ({
          users: state.users.map(u => u.id === userId ? updated : u),
          currentUser: state.currentUser?.id === userId ? updated : state.currentUser,
        }));
      },

      loadCases: async () => {
        const { token } = get();
        try {
          const cases = await apiFetch('/api/cases', {}, token);
          set({ cases });
        } catch {}
      },

      addCase: async (caseData) => {
        const { token } = get();
        const newCase = await apiFetch('/api/cases', { method: 'POST', body: JSON.stringify(caseData) }, token);
        set(state => ({ cases: [newCase, ...state.cases] }));
      },

      updateCase: async (caseId, updates) => {
        const { token } = get();
        const updated = await apiFetch(`/api/cases/${caseId}`, { method: 'PATCH', body: JSON.stringify(updates) }, token);
        set(state => ({ cases: state.cases.map(c => c.id === caseId ? updated : c) }));
      },

      deleteCase: async (caseId) => {
        const { token } = get();
        await apiFetch(`/api/cases/${caseId}`, { method: 'DELETE' }, token);
        set(state => ({ cases: state.cases.filter(c => c.id !== caseId) }));
      },

      createCaseWithClient: async (data) => {
        const { token } = get();
        const result = await apiFetch('/api/cases/with-client', { method: 'POST', body: JSON.stringify(data) }, token);
        set(state => ({ cases: [result.case, ...state.cases], users: [result.client, ...state.users] }));
        return result;
      },

      respondToCase: async (caseId, clientStatus) => {
        const { token } = get();
        const updated = await apiFetch(`/api/cases/${caseId}/respond`, { method: 'PATCH', body: JSON.stringify({ clientStatus }) }, token);
        set(state => ({ cases: state.cases.map(c => c.id === caseId ? updated : c) }));
      },

      loadClients: async () => {
        const { token } = get();
        try {
          const clients = await apiFetch('/api/users/clients', {}, token);
          set({ clients });
        } catch {}
      },

      loadMessages: async (withUserId) => {
        const { token, messages: existing } = get();
        try {
          const path = withUserId ? `/api/messages?with=${withUserId}` : '/api/messages';
          const msgs = await apiFetch(path, {}, token);
          const normalised = msgs.map((m: any) => ({
            id: m.id,
            senderId: m.sender_id ?? m.senderId,
            receiverId: m.receiver_id ?? m.receiverId,
            content: m.content,
            timestamp: (m.created_at || m.timestamp || '').includes('Z') ? (m.created_at ?? m.timestamp) : (m.created_at ?? m.timestamp) + 'Z',
            read: !!(m.is_read ?? m.read),
            caseId: m.case_id ?? m.caseId,
            attachments: m.attachments,
          }));
          if (withUserId) {
            const other = existing.filter(m => m.senderId !== withUserId && m.receiverId !== withUserId);
            set({ messages: [...other, ...normalised] });
          } else {
            set({ messages: normalised });
          }
        } catch {}
      },

      sendMessage: async (message) => {
        const { token } = get();
        const msg = await apiFetch('/api/messages', {
          method: 'POST',
          body: JSON.stringify({ receiverId: message.receiverId, content: message.content, caseId: message.caseId, attachments: message.attachments }),
        }, token);
        const ts = (msg.created_at || '').includes('Z') ? msg.created_at : msg.created_at + 'Z';
        const norm = {
          id: msg.id,
          senderId: msg.sender_id,
          receiverId: msg.receiver_id,
          content: msg.content,
          timestamp: ts,
          read: false,
          caseId: msg.case_id,
          attachments: msg.attachments,
        };
        set(state => ({ messages: [...state.messages, norm] }));
      },

      markAsRead: async (messageId) => {
        const { token } = get();
        await apiFetch(`/api/messages/${messageId}/read`, { method: 'PATCH', body: '{}' }, token);
        set(state => ({ messages: state.messages.map(m => m.id === messageId ? { ...m, read: true } : m) }));
      },

      loadJournals: async () => {
        const { token } = get();
        try {
          const j = await apiFetch('/api/journal', {}, token);
          set({ journals: (j as Record<string, unknown>[]).map(normalizeJournalEntry) });
        } catch {}
      },

      addJournalEntry: async (entry) => {
        const { token } = get();
        const newEntry = await apiFetch('/api/journal', { method: 'POST', body: JSON.stringify(entry) }, token);
        set(state => ({ journals: [normalizeJournalEntry(newEntry as Record<string, unknown>), ...state.journals] }));
      },

      updateJournalEntry: async (entryId, updates) => {
        const { token } = get();
        const updated = await apiFetch(`/api/journal/${entryId}`, { method: 'PATCH', body: JSON.stringify(updates) }, token);
        set(state => ({ journals: state.journals.map(j => j.id === entryId ? normalizeJournalEntry(updated as Record<string, unknown>) : j) }));
      },

      deleteJournalEntry: async (entryId) => {
        const { token } = get();
        await apiFetch(`/api/journal/${entryId}`, { method: 'DELETE' }, token);
        set(state => ({ journals: state.journals.filter(j => j.id !== entryId) }));
      },

      loadRequests: async () => {
        const { token } = get();
        try {
          const data = await apiFetch('/api/requests', {}, token) as { sent: ConnectionRequest[]; received: ConnectionRequest[] };
          set({ requests: data });
        } catch {}
      },

      sendRequest: async (receiverId, message) => {
        const { token } = get();
        await apiFetch('/api/requests', { method: 'POST', body: JSON.stringify({ receiverId, message: message || '' }) }, token);
        get().loadRequests();
      },

      respondToRequest: async (requestId, status) => {
        const { token } = get();
        await apiFetch(`/api/requests/${requestId}`, { method: 'PATCH', body: JSON.stringify({ status }) }, token);
        get().loadRequests();
        if (status === 'accepted') get().loadConnections();
      },

      loadConnections: async () => {
        const { token } = get();
        try {
          const data = await apiFetch('/api/connections', {}, token) as Connection[];
          set({ connections: data });
        } catch {}
      },

      loadInvoices: async () => {
        const { token } = get();
        try {
          const inv = await apiFetch('/api/invoices', {}, token);
          set({ invoices: inv });
        } catch {}
      },

      addInvoice: async (invoice) => {
        const { token } = get();
        const newInv = await apiFetch('/api/invoices', { method: 'POST', body: JSON.stringify(invoice) }, token);
        set(state => ({ invoices: [newInv, ...state.invoices] }));
      },

      updateInvoice: async (invoiceId, updates) => {
        const { token } = get();
        const updated = await apiFetch(`/api/invoices/${invoiceId}`, { method: 'PATCH', body: JSON.stringify(updates) }, token);
        set(state => ({ invoices: state.invoices.map(i => i.id === invoiceId ? updated : i) }));
      },

      loadTimeEntries: async () => {
        const { token } = get();
        try {
          const t = await apiFetch('/api/time-entries', {}, token);
          set({ timeEntries: t });
        } catch {}
      },

      addTimeEntry: async (entry) => {
        const { token } = get();
        const newEntry = await apiFetch('/api/time-entries', { method: 'POST', body: JSON.stringify(entry) }, token);
        set(state => ({ timeEntries: [newEntry, ...state.timeEntries] }));
      },

      verifyLawyer: async (lawyerId, status) => {
        const { token } = get();
        await apiFetch(`/api/admin/verify-lawyer/${lawyerId}`, { method: 'PATCH', body: JSON.stringify({ status }) }, token);
        set(state => ({
          users: state.users.map(u => u.id === lawyerId ? { ...u, verificationStatus: status, isVerified: status === 'approved' } : u),
        }));
      },

      loadUsers: async () => {
        const { token, currentUser } = get();
        try {
          if (currentUser?.role === 'admin') {
            const users = await apiFetch('/api/admin/users', {}, token);
            set({ users });
          } else {
            const users = await apiFetch('/api/users/all', {}, token);
            set({ users });
          }
        } catch {}
      },

      loadFirms: async () => {
        const { token } = get();
        try {
          const firms = await apiFetch('/api/firms', {}, token);
          set({ firms: firms.map(normalizeFirm) });
        } catch {}
      },

      registerFirm: async (data) => {
        const result = await apiFetch('/api/firms/register', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        return result;
      },

      verifyFirm: async (firmId, status) => {
        const { token } = get();
        await apiFetch(`/api/admin/verify-firm/${firmId}`, { method: 'PATCH', body: JSON.stringify({ status }) }, token);
        set(state => ({
          firms: state.firms.map(f => f.id === firmId ? { ...f, verificationStatus: status, isVerified: status === 'approved' } : f),
        }));
      },
    }),
    {
      name: 'jinnah-legal-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        token: state.token,
      }),
    }
  )
);
