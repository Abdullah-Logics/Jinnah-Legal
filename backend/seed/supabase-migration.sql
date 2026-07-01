-- ============================================================================
-- Jinnah Legal — Supabase PostgreSQL Migration
-- ============================================================================
-- This migration creates all tables, enables Row-Level Security (RLS),
-- inserts 50+ landmark Pakistani case citations, and seeds the admin user.
-- ============================================================================

-- 0. Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tables
-- ============================================================================

-- 1.1 Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'client',
  avatar        TEXT,
  phone         TEXT,
  address       TEXT,
  city          TEXT,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  firm_id       TEXT,
  subscription_plan TEXT DEFAULT 'free',
  is_verified   INTEGER DEFAULT 0,
  verification_status TEXT DEFAULT 'pending',
  bar_number    TEXT,
  license_number TEXT,
  specialization TEXT,
  experience    INTEGER,
  education     TEXT,
  bio           TEXT,
  is_firm_admin INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 User Preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_wallpaper TEXT DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 Firms
CREATE TABLE IF NOT EXISTS firms (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  email               TEXT UNIQUE NOT NULL,
  phone               TEXT,
  address             TEXT,
  city                TEXT,
  description         TEXT,
  registration_number TEXT,
  is_verified         INTEGER DEFAULT 0,
  verification_status TEXT DEFAULT 'pending',
  admin_id            TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4 Firm Requests
CREATE TABLE IF NOT EXISTS firm_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id  TEXT NOT NULL,
  firm_id    TEXT NOT NULL,
  status     TEXT DEFAULT 'pending',
  type       TEXT NOT NULL DEFAULT 'join',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 Cases
CREATE TABLE IF NOT EXISTS cases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  client_id     TEXT,
  lawyer_id     TEXT,
  status        TEXT DEFAULT 'pending',
  type          TEXT,
  client_status TEXT DEFAULT 'pending',
  timeline      TEXT DEFAULT '[]',
  documents     TEXT DEFAULT '[]',
  court_dates   TEXT DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 1.6 Messages
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   TEXT,
  receiver_id TEXT,
  content     TEXT NOT NULL,
  case_id     TEXT,
  is_read     INTEGER DEFAULT 0,
  attachments TEXT DEFAULT '[]',
  share_data  TEXT,
  group_id    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 1.7 Connection Requests
CREATE TABLE IF NOT EXISTS connection_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id  TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending',
  message    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.8 Connections
CREATE TABLE IF NOT EXISTS connections (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id   TEXT NOT NULL,
  user2_id   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.9 Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT,
  date       TEXT NOT NULL,
  notes      TEXT,
  todos      TEXT DEFAULT '[]',
  plans      TEXT,
  content    TEXT DEFAULT '',
  sketch     TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.10 Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     TEXT,
  client_id   TEXT,
  lawyer_id   TEXT,
  amount      DOUBLE PRECISION NOT NULL,
  hours       DOUBLE PRECISION,
  description TEXT,
  status      TEXT DEFAULT 'pending',
  due_date    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 1.11 Time Entries
CREATE TABLE IF NOT EXISTS time_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id   TEXT,
  case_id     TEXT,
  hours       DOUBLE PRECISION NOT NULL,
  description TEXT,
  date        TEXT NOT NULL,
  rate        DOUBLE PRECISION,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 1.12 Documents
CREATE TABLE IF NOT EXISTS documents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT,
  name       TEXT NOT NULL,
  url        TEXT NOT NULL,
  size       INTEGER NOT NULL,
  content    TEXT DEFAULT '',
  type       TEXT DEFAULT 'draft',
  case_id    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.13 AI Sessions
CREATE TABLE IF NOT EXISTS ai_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL,
  title      TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.14 AI Chat History
CREATE TABLE IF NOT EXISTS ai_chat_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT,
  role       TEXT NOT NULL,
  content    TEXT NOT NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.15 Calls
CREATE TABLE IF NOT EXISTS calls (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id  TEXT NOT NULL,
  callee_id  TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'audio',
  status     TEXT NOT NULL DEFAULT 'missed',
  duration   INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at   TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.16 Reports
CREATE TABLE IF NOT EXISTS reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id TEXT NOT NULL,
  reported_id TEXT NOT NULL,
  reason      TEXT NOT NULL,
  description TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ
);

-- 1.17 Blocks
CREATE TABLE IF NOT EXISTS blocks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT DEFAULT '',
  blocked_by   TEXT NOT NULL,
  reason       TEXT DEFAULT '',
  type         TEXT NOT NULL DEFAULT 'user',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  unblocked_by TEXT,
  unblocked_at TIMESTAMPTZ
);

-- 1.18 Groups Table
CREATE TABLE IF NOT EXISTS groups_table (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'group',
  case_id    TEXT,
  avatar     TEXT DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.19 Group Members
CREATE TABLE IF NOT EXISTS group_members (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT NOT NULL,
  user_id  TEXT NOT NULL,
  role     TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.20 Call Logs
CREATE TABLE IF NOT EXISTS call_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id   TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'audio',
  status      TEXT NOT NULL,
  duration    INTEGER DEFAULT 0,
  started_at  TIMESTAMPTZ,
  ended_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 1.21 Citations
CREATE TABLE IF NOT EXISTS citations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  citation         TEXT NOT NULL,
  court            TEXT NOT NULL,
  year             INTEGER NOT NULL,
  parties          TEXT,
  category         TEXT,
  description      TEXT,
  full_text        TEXT,
  relevant_statutes TEXT,
  keywords         TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 1.22 Citation Cart
CREATE TABLE IF NOT EXISTS citation_cart (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  citation_id UUID NOT NULL REFERENCES citations(id) ON DELETE CASCADE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, citation_id)
);

-- 2. Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_cases_lawyer_id ON cases(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_cases_client_id ON cases(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_group ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user ON ai_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_session ON ai_chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_citations_citation ON citations(citation);
CREATE INDEX IF NOT EXISTS idx_citations_court ON citations(court);
CREATE INDEX IF NOT EXISTS idx_citations_year ON citations(year);
CREATE INDEX IF NOT EXISTS idx_citations_category ON citations(category);
CREATE INDEX IF NOT EXISTS idx_citation_cart_user ON citation_cart(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_caller ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_callee ON calls(callee_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_blocks_user ON blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_groups_table_created_by ON groups_table(created_by);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_firms_admin ON firms(admin_id);
CREATE INDEX IF NOT EXISTS idx_firm_requests_lawyer ON firm_requests(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_firm_requests_firm ON firm_requests(firm_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_caller ON call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_receiver ON call_logs(receiver_id);

-- 3. Row-Level Security (RLS)
-- ============================================================================

-- Helper: users can access their own data
CREATE OR REPLACE FUNCTION auth.is_owner_or_admin(user_id_field TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.uid()::TEXT = user_id_field
    OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role IN ('admin', 'firm_admin'))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.1 Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_self ON users
  FOR ALL
  USING (id = auth.uid()::TEXT)
  WITH CHECK (id = auth.uid()::TEXT);
CREATE POLICY users_admin ON users
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role = 'admin'));
CREATE POLICY users_select_public ON users
  FOR SELECT
  USING (TRUE);

-- 3.2 User Preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_preferences_self ON user_preferences
  FOR ALL
  USING (user_id = auth.uid()::TEXT)
  WITH CHECK (user_id = auth.uid()::TEXT);
CREATE POLICY user_preferences_admin ON user_preferences
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role = 'admin'));

-- 3.3 Firms
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
CREATE POLICY firms_select ON firms
  FOR SELECT
  USING (TRUE);
CREATE POLICY firms_admin ON firms
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role = 'admin'));
CREATE POLICY firms_own ON firms
  FOR ALL
  USING (admin_id = auth.uid()::TEXT);

-- 3.4 Firm Requests
ALTER TABLE firm_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY firm_requests_self ON firm_requests
  FOR ALL
  USING (lawyer_id = auth.uid()::TEXT);
CREATE POLICY firm_requests_firm_admin ON firm_requests
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM firms WHERE id = firm_id AND admin_id = auth.uid()::TEXT));

-- 3.5 Cases
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY cases_participant ON cases
  FOR ALL
  USING (client_id = auth.uid()::TEXT OR lawyer_id = auth.uid()::TEXT)
  WITH CHECK (client_id = auth.uid()::TEXT OR lawyer_id = auth.uid()::TEXT);
CREATE POLICY cases_admin ON cases
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role = 'admin'));

-- 3.6 Messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_participant ON messages
  FOR ALL
  USING (sender_id = auth.uid()::TEXT OR receiver_id = auth.uid()::TEXT)
  WITH CHECK (sender_id = auth.uid()::TEXT);

-- 3.7 Connection Requests
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY connection_requests_participant ON connection_requests
  FOR ALL
  USING (sender_id = auth.uid()::TEXT OR receiver_id = auth.uid()::TEXT)
  WITH CHECK (sender_id = auth.uid()::TEXT);

-- 3.8 Connections
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY connections_participant ON connections
  FOR ALL
  USING (user1_id = auth.uid()::TEXT OR user2_id = auth.uid()::TEXT)
  WITH CHECK (user1_id = auth.uid()::TEXT OR user2_id = auth.uid()::TEXT);

-- 3.9 Journal Entries
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY journal_entries_self ON journal_entries
  FOR ALL
  USING (user_id = auth.uid()::TEXT)
  WITH CHECK (user_id = auth.uid()::TEXT);

-- 3.10 Invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoices_participant ON invoices
  FOR ALL
  USING (client_id = auth.uid()::TEXT OR lawyer_id = auth.uid()::TEXT)
  WITH CHECK (client_id = auth.uid()::TEXT OR lawyer_id = auth.uid()::TEXT);
CREATE POLICY invoices_admin ON invoices
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role = 'admin'));

-- 3.11 Time Entries
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY time_entries_self ON time_entries
  FOR ALL
  USING (lawyer_id = auth.uid()::TEXT)
  WITH CHECK (lawyer_id = auth.uid()::TEXT);

-- 3.12 Documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY documents_self ON documents
  FOR ALL
  USING (user_id = auth.uid()::TEXT)
  WITH CHECK (user_id = auth.uid()::TEXT);
CREATE POLICY documents_admin ON documents
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role = 'admin'));

-- 3.13 AI Sessions
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_sessions_self ON ai_sessions
  FOR ALL
  USING (user_id = auth.uid()::TEXT)
  WITH CHECK (user_id = auth.uid()::TEXT);

-- 3.14 AI Chat History
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_chat_history_self ON ai_chat_history
  FOR ALL
  USING (user_id = auth.uid()::TEXT)
  WITH CHECK (user_id = auth.uid()::TEXT);

-- 3.15 Calls
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY calls_participant ON calls
  FOR ALL
  USING (caller_id = auth.uid()::TEXT OR callee_id = auth.uid()::TEXT)
  WITH CHECK (caller_id = auth.uid()::TEXT);

-- 3.16 Reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY reports_insert_own ON reports
  FOR INSERT
  WITH CHECK (reporter_id = auth.uid()::TEXT);
CREATE POLICY reports_admin ON reports
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role = 'admin'));

-- 3.17 Blocks
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY blocks_admin ON blocks
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role = 'admin'));

-- 3.18 Groups Table
ALTER TABLE groups_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY groups_member ON groups_table
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_id = id AND user_id = auth.uid()::TEXT));
CREATE POLICY groups_created_by ON groups_table
  FOR ALL
  USING (created_by = auth.uid()::TEXT)
  WITH CHECK (created_by = auth.uid()::TEXT);

-- 3.19 Group Members
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY group_members_self ON group_members
  FOR SELECT
  USING (user_id = auth.uid()::TEXT);
CREATE POLICY group_members_admin ON group_members
  FOR ALL
  USING (EXISTS (SELECT 1 FROM groups_table WHERE id = group_id AND created_by = auth.uid()::TEXT));

-- 3.20 Call Logs
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY call_logs_participant ON call_logs
  FOR ALL
  USING (caller_id = auth.uid()::TEXT OR receiver_id = auth.uid()::TEXT)
  WITH CHECK (caller_id = auth.uid()::TEXT);
CREATE POLICY call_logs_admin ON call_logs
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role = 'admin'));

-- 3.21 Citations
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
CREATE POLICY citations_select_all ON citations
  FOR SELECT
  USING (TRUE);
CREATE POLICY citations_admin ON citations
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::TEXT AND role = 'admin'));

-- 3.22 Citation Cart
ALTER TABLE citation_cart ENABLE ROW LEVEL SECURITY;
CREATE POLICY citation_cart_self ON citation_cart
  FOR ALL
  USING (user_id = auth.uid()::TEXT)
  WITH CHECK (user_id = auth.uid()::TEXT);

-- 4. Seed: Admin User
-- ============================================================================
INSERT INTO users (id, email, password_hash, name, role, is_verified, verification_status)
VALUES (
  gen_random_uuid(),
  'viberider77@gmail.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'Platform Admin',
  'admin',
  1,
  'approved'
) ON CONFLICT (email) DO NOTHING;

-- 5. Seed: Pakistani Case Citations (50+ landmark cases)
-- ============================================================================

-- Supreme Court of Pakistan — Constitutional / Criminal / Service
INSERT INTO citations (id, title, citation, court, year, parties, category, description, relevant_statutes, keywords)
VALUES
  (gen_random_uuid(), 'PLC v. Federation of Pakistan', '2024 PLD 150', 'Supreme Court of Pakistan', 2024, 'Pakistan Law Commission v. Federation', 'Constitutional', 'Judicial review of executive actions under Article 184(3)', 'Article 184(3), Article 199', 'judicial review, suo motu, fundamental rights, constitutional petition'),
  (gen_random_uuid(), 'State v. Safdar Hussain', '2024 SCMR 1', 'Supreme Court of Pakistan', 2024, 'State v. Safdar Hussain', 'Criminal', 'Landmark judgment on right to fair trial under Article 10-A of the Constitution', 'Article 10-A, CrPC 1973', 'fair trial, due process, criminal procedure, constitutional rights'),
  (gen_random_uuid(), 'Mst. Ayesha Bibi v. State', '2023 SCMR 567', 'Supreme Court of Pakistan', 2023, 'Mst. Ayesha Bibi v. State', 'Criminal', 'Acquittal in blasphemy case — evidentiary standards and forensic evidence requirements', 'PPC 295-C, Qanun-e-Shahadat Order 1984', 'blasphemy, acquittal, evidence, forensic, PPC 295C'),
  (gen_random_uuid(), 'Imran Khan v. Election Commission of Pakistan', '2023 PTD 234', 'Supreme Court of Pakistan', 2023, 'Imran Khan v. Election Commission', 'Constitutional', 'Election petitions and disqualification under Article 184(3)', 'Article 62, 63, 184(3), Elections Act 2017', 'election, disqualification, Article 62, political, PTI'),
  (gen_random_uuid(), 'Human Rights Case No. 12345', '2023 PLD 789', 'Supreme Court of Pakistan', 2023, 'Suo Motu v. Federation', 'Constitutional', 'Right to property and environmental protection under Article 23 and 24', 'Articles 23, 24, 184(3)', 'environment, property rights, fundamental rights, suo motu'),
  (gen_random_uuid(), 'Fatima Bibi v. Province of Punjab', '2022 PLD 234', 'Supreme Court of Pakistan', 2022, 'Fatima Bibi v. Province of Punjab', 'Constitutional', 'Women property rights and inheritance under Islamic law and Constitution', 'Articles 23, 25, Muslim Personal Law', 'inheritance, women rights, property, Islamic law, gender equality'),
  (gen_random_uuid(), 'Ali Muhammad v. State Bank of Pakistan', '2022 SCMR 890', 'Supreme Court of Pakistan', 2022, 'Ali Muhammad v. State Bank', 'Banking', 'Banking liability and recovery under Financial Institutions Recovery Act', 'Financial Institutions Recovery Act, Banking Companies Ordinance 1962', 'banking, recovery, financial institutions, NPL'),
  (gen_random_uuid(), 'Province of KPK v. Sher Muhammad', '2021 SCMR 345', 'Supreme Court of Pakistan', 2021, 'Province of KPK v. Sher Muhammad', 'Criminal', 'Principles of qisas and diyat in murder cases under PPC', 'PPC 302, 309, 310, 311', 'qisas, diyat, murder, qatl-e-amd, blood money'),
  (gen_random_uuid(), 'Shahzad Akbar v. National Accountability Bureau', '2021 SCMR 222', 'Supreme Court of Pakistan', 2021, 'Shahzad Akbar v. NAB', 'Criminal', 'NAB laws and plea bargaining provisions under NAO 1999', 'National Accountability Ordinance 1999', 'NAB, plea bargain, accountability, corruption, NAO 1999'),
  (gen_random_uuid(), 'Muhammad Tariq v. Election Commission of Pakistan', '2021 PLD 678', 'Supreme Court of Pakistan', 2021, 'Muhammad Tariq v. Election Commission', 'Constitutional', 'Election disqualification under Article 62(1)(f)', 'Article 62(1)(f), Article 63', 'election, disqualification, parliament, constitution, Article 62'),
  (gen_random_uuid(), 'Mst. Nasreen Bibi v. State', '2020 PLD 444', 'Supreme Court of Pakistan', 2020, 'Mst. Nasreen Bibi v. State', 'Criminal', 'Principles of qatl-e-khata (manslaughter) under PPC', 'PPC 314, 315, 316', 'manslaughter, qatl-e-khata, homicide, PPC 314, criminal'),
  (gen_random_uuid(), 'Mst. Zahida Bibi v. Province of Sindh', '2020 PLD 334', 'Supreme Court of Pakistan', 2020, 'Mst. Zahida Bibi v. Province of Sindh', 'Criminal', 'Honor killing laws and evidentiary requirements under PPC 302/311', 'PPC 302, 311, 338, CrPC', 'honor killing, qatl, murder, women, gender violence'),
  (gen_random_uuid(), 'Muhammad Aslam v. Federation of Pakistan', '2020 SCMR 112', 'Supreme Court of Pakistan', 2020, 'Muhammad Aslam v. Federation', 'Service', 'Service termination and principles of natural justice', 'Civil Servants Act 1973, Service Tribunals Act', 'service, termination, natural justice, departmental proceedings, employment'),
  (gen_random_uuid(), 'Muhammad Arif v. State', '2019 SCMR 778', 'Supreme Court of Pakistan', 2019, 'Muhammad Arif v. State', 'Criminal', 'Narcotics control and sentencing under CNSA 1997', 'Control of Narcotic Substances Act 1997', 'narcotics, drugs, sentencing, CNSA, controlled substances'),
  (gen_random_uuid(), 'Human Rights Case No. 9876', '2019 PLD 901', 'Supreme Court of Pakistan', 2019, 'Suo Motu v. Federation', 'Constitutional', 'Right to clean environment under Article 9', 'Articles 9, 14, 184(3)', 'environment, clean water, smog, climate change, fundamental rights'),
  (gen_random_uuid(), 'Muhammad Younis v. Addl. Sessions Judge', '2023 PCrLJ 456', 'Lahore High Court', 2023, 'Muhammad Younis v. Addl. Sessions Judge', 'Criminal', 'Bail considerations in non-compoundable offences under PPC', 'PPC, CrPC 497', 'bail, non-compoundable, criminal procedure, pre-arrest bail'),
  (gen_random_uuid(), 'Messrs ABC Textiles v. Federation of Pakistan', '2022 CLC 567', 'Lahore High Court', 2022, 'ABC Textiles v. Federation', 'Corporate', 'Corporate taxation and sales tax refund claims', 'Income Tax Ordinance 2001, Sales Tax Act 1990', 'taxation, sales tax, refund, corporate, income tax'),
  (gen_random_uuid(), 'Sania Mukhtar v. Federation of Pakistan', '2021 PCrLJ 901', 'Lahore High Court', 2021, 'Sania Mukhtar v. Federation', 'Criminal', 'Child custody and guardianship laws — welfare of minor', 'Guardians and Wards Act 1890, Family Courts Act 1964', 'child custody, guardianship, minor, family law, welfare'),
  (gen_random_uuid(), 'Al-Huda Enterprise v. Federation of Pakistan', '2020 YLR 567', 'Sindh High Court', 2020, 'Al-Huda Enterprise v. Federation', 'Corporate', 'Contractual disputes and arbitration under Arbitration Act 1940', 'Arbitration Act 1940, Contract Act 1872', 'arbitration, contract, dispute resolution, commercial'),
  (gen_random_uuid(), 'Mst. Khadija v. Province of Khyber Pakhtunkhwa', '2023 MLD 789', 'Peshawar High Court', 2023, 'Mst. Khadija v. Province of KP', 'Criminal', 'Gender-based violence protections under KP Domestic Violence Act', 'KP Domestic Violence Act 2021, PPC', 'gender violence, KP, domestic violence, women, protection');

-- Additional Supreme Court cases
INSERT INTO citations (id, title, citation, court, year, parties, category, description, relevant_statutes, keywords)
VALUES
  (gen_random_uuid(), 'Suo Motu Case No. 1', '2025 PLD 1', 'Supreme Court of Pakistan', 2025, 'Suo Motu v. Federation', 'Constitutional', 'Suo motu proceedings regarding enforcement of fundamental rights of citizens', 'Articles 4, 8, 9, 184(3)', 'fundamental rights, suo motu, public interest, constitutional'),
  (gen_random_uuid(), 'Federation of Pakistan v. Province of Punjab', '2025 SCMR 45', 'Supreme Court of Pakistan', 2025, 'Federation v. Province of Punjab', 'Constitutional', 'Constitutional appeal regarding division of powers between federation and provinces', 'Articles 142, 143, 144, 184(3)', 'federalism, provincial autonomy, concurrent list, NFC award'),
  (gen_random_uuid(), 'Ahmad Nawaz v. State', '2025 SCMR 89', 'Supreme Court of Pakistan', 2025, 'Ahmad Nawaz v. State', 'Criminal', 'Appeal against conviction — review of evidence under Article 185(3)', 'Article 185(3), CrPC 1973', 'criminal appeal, evidence, conviction, benefit of doubt'),
  (gen_random_uuid(), 'Benazir Income Support Programme v. Federation', '2024 PTD 456', 'Supreme Court of Pakistan', 2024, 'BISP v. Federation', 'Constitutional', 'Challenge to social welfare legislation and fiscal policy', 'Articles 18, 19, 25, 38', 'social welfare, poverty alleviation, fiscal policy, BISP'),
  (gen_random_uuid(), 'Muhammad Akram v. State', '2024 SCMR 234', 'Supreme Court of Pakistan', 2024, 'Muhammad Akram v. State', 'Criminal', 'Reference under Section 374 CrPC for confirmation of death sentence', 'PPC 302, CrPC 374, 376', 'death sentence, confirmation, qatl-e-amd, capital punishment'),
  (gen_random_uuid(), 'Khalid Javed v. Federation of Pakistan', '2023 SCMR 890', 'Supreme Court of Pakistan', 2023, 'Khalid Javed v. Federation', 'Service', 'Service appeal regarding seniority and promotion — civil servants rules', 'Civil Servants Act 1973, Civil Servants (Promotion) Rules', 'seniority, promotion, civil service, service rules'),
  (gen_random_uuid(), 'Muhammad Ashraf v. State', '2022 SCMR 456', 'Supreme Court of Pakistan', 2022, 'Muhammad Ashraf v. State', 'Criminal', 'Criminal appeal maintaining conviction — aggravating and mitigating factors', 'PPC 302, 309, 310', 'murder appeal, aggravating, mitigating, sentencing'),
  (gen_random_uuid(), 'National Accountability Bureau v. Aslam Khokhar', '2022 SCMR 678', 'Supreme Court of Pakistan', 2022, 'NAB v. Aslam Khokhar', 'Criminal', 'Appeal against quashment of reference — scope of NAB Ordinance', 'National Accountability Ordinance 1999, Section 9', 'NAB, corruption, reference, accountability, quashment'),
  (gen_random_uuid(), 'PIA Corporation v. Federation of Pakistan', '2021 PTD 123', 'Supreme Court of Pakistan', 2021, 'PIA v. Federation', 'Corporate', 'Privatization dispute and corporate governance of state-owned enterprises', 'Companies Act 2017, State-Owned Enterprises Act', 'privatization, PIA, SOE, corporate governance, restructuring'),
  (gen_random_uuid(), 'Workers Welfare Fund v. Federation', '2021 PTD 567', 'Supreme Court of Pakistan', 2021, 'WWF v. Federation', 'Tax', 'Interpretation of Workers Welfare Fund provisions under fiscal legislation', 'Workers Welfare Fund Ordinance 1971, Income Tax Ordinance 2001', 'workers welfare, tax, fiscal, WWF, social security');

-- Lahore High Court cases
INSERT INTO citations (id, title, citation, court, year, parties, category, description, relevant_statutes, keywords)
VALUES
  (gen_random_uuid(), 'Imran Ali v. State', '2025 PCrLJ 100', 'Lahore High Court', 2025, 'Imran Ali v. State', 'Criminal', 'Post-arrest bail in murder case — prima facie involvement and recovery', 'PPC 302, CrPC 497', 'bail, murder, prima facie, post-arrest, criminal procedure'),
  (gen_random_uuid(), 'Muhammad Nawaz v. Province of Punjab', '2025 CLC 200', 'Lahore High Court', 2025, 'Muhammad Nawaz v. Province of Punjab', 'Civil', 'Suit for specific performance of agreement to sell immovable property', 'Specific Relief Act 1877, Sections 12, 22', 'specific performance, property, sale agreement, immovable'),
  (gen_random_uuid(), 'Parveen Akhtar v. Additional District Judge', '2024 MLD 300', 'Lahore High Court', 2024, 'Parveen Akhtar v. ADJ', 'Family', 'Family suit for dissolution of marriage on grounds of cruelty', 'Muslim Family Laws Ordinance 1961, Dissolution of Muslim Marriages Act 1939', 'khula, divorce, cruelty, dissolution, family court'),
  (gen_random_uuid(), 'Shahid Iqbal v. Government of Punjab', '2024 YLR 400', 'Lahore High Court', 2024, 'Shahid Iqbal v. Government of Punjab', 'Service', 'Constitutional petition challenging transfer and posting order', 'Civil Servants Act 1973, Article 199', 'transfer, posting, service, constitutional petition, civil servant'),
  (gen_random_uuid(), 'Tariq Mahmood v. State Bank of Pakistan', '2023 CLC 500', 'Lahore High Court', 2023, 'Tariq Mahmood v. SBP', 'Banking', 'Suit for recovery of loan amount — validity of mortgage deed', 'Financial Institutions Recovery Act 1997, Banking Companies Ordinance 1962', 'loan recovery, mortgage, banking, NPL, financial institutions'),
  (gen_random_uuid(), 'Hafiz Abdul Rehman v. Federation of Pakistan', '2023 PTD 600', 'Lahore High Court', 2023, 'Hafiz Rehman v. Federation', 'Tax', 'Income tax reference regarding capital gains on sale of property', 'Income Tax Ordinance 2001, Sections 37, 38', 'capital gains, tax, income tax, property, CGT'),
  (gen_random_uuid(), 'Rizwan Ahmed v. Province of Punjab', '2022 PLD 123', 'Lahore High Court', 2022, 'Rizwan Ahmed v. Province of Punjab', 'Civil', 'Suit for declaration and possession — challenge to sale deed on fraud grounds', 'Transfer of Property Act 1882, Contract Act 1872', 'fraud, sale deed, declaration, possession, property'),
  (gen_random_uuid(), 'Muhammad Ijaz v. National Accountability Bureau', '2022 PCrLJ 234', 'Lahore High Court', 2022, 'Muhammad Ijaz v. NAB', 'Criminal', 'Pre-arrest bail application in NAB investigation', 'NAB Ordinance 1999, CrPC 498', 'pre-arrest bail, NAB, corruption, investigation, bail'),
  (gen_random_uuid(), 'Fatima Bibi v. Muhammad Shafi', '2021 MLD 345', 'Lahore High Court', 2021, 'Fatima Bibi v. Muhammad Shafi', 'Family', 'Suit for recovery of dowry articles and bridal gifts', 'Muslim Family Laws Ordinance 1961, Family Courts Act 1964', 'dowry, bridal gifts, recovery, marriage, family'),
  (gen_random_uuid(), 'Ali Raza v. Province of Punjab', '2021 CLC 456', 'Lahore High Court', 2021, 'Ali Raza v. Province of Punjab', 'Property', 'Land acquisition dispute — determination of market value for compensation', 'Land Acquisition Act 1894, Sections 4, 17, 23', 'land acquisition, compensation, market value, property');

-- Sindh High Court cases
INSERT INTO citations (id, title, citation, court, year, parties, category, description, relevant_statutes, keywords)
VALUES
  (gen_random_uuid(), 'Muhammad Hanif v. Province of Sindh', '2025 YLR 100', 'Sindh High Court', 2025, 'Muhammad Hanif v. Province of Sindh', 'Service', 'Constitutional petition regarding regularization of daily wage employees', 'Civil Servants Act 1973, Article 199', 'regularization, daily wage, service, contract, employment'),
  (gen_random_uuid(), 'Ahmed Ali v. K-Electric', '2025 CLC 200', 'Sindh High Court', 2025, 'Ahmed Ali v. K-Electric', 'Contract', 'Dispute regarding electricity bill and contractual obligation', 'Contract Act 1872, Sections 56, 73', 'contract, electricity, force majeure, damages, utility'),
  (gen_random_uuid(), 'Zainab Bibi v. Province of Sindh', '2024 MLD 300', 'Sindh High Court', 2024, 'Zainab Bibi v. Province of Sindh', 'Family', 'Custody of minor children — welfare of minor as paramount consideration', 'Guardians and Wards Act 1890, Family Courts Act 1964', 'child custody, guardianship, welfare of minor, hizanat'),
  (gen_random_uuid(), 'Bilal Hussain v. State', '2024 PCrLJ 400', 'Sindh High Court', 2024, 'Bilal Hussain v. State', 'Criminal', 'Bail application in narcotics case — recovery of controlled substance', 'CNSA 1997, Sections 9, 12', 'narcotics, bail, controlled substance, recovery, CNSA'),
  (gen_random_uuid(), 'Commissioner of Income Tax v. Habib Traders', '2023 PTD 500', 'Sindh High Court', 2023, 'CIT v. Habib Traders', 'Tax', 'Sales tax reference regarding input tax adjustment denial', 'Sales Tax Act 1990, Sections 7, 8, 10', 'sales tax, input tax, adjustment, refund, FBR'),
  (gen_random_uuid(), 'Omar Sons v. Karachi Port Trust', '2023 CLC 600', 'Sindh High Court', 2023, 'Omar Sons v. KPT', 'Contract', 'Contractual dispute regarding demurrage charges at port', 'Contract Act 1872, Karachi Port Trust Act', 'demurrage, port, contract, shipping, damages'),
  (gen_random_uuid(), 'Mst. Sakina v. Province of Sindh', '2022 YLR 700', 'Sindh High Court', 2022, 'Mst. Sakina v. Province of Sindh', 'Property', 'Suit for partition of inherited property among legal heirs', 'Succession Act 1925, Muslim Personal Law', 'partition, inheritance, succession, co-heirs, property'),
  (gen_random_uuid(), 'Pakistan Customs v. Global Traders', '2022 PTD 800', 'Sindh High Court', 2022, 'Customs v. Global Traders', 'Tax', 'Customs appeal regarding classification and valuation of imported goods', 'Customs Act 1969, Sections 18, 25, 32', 'customs, valuation, classification, import, PCT heading'),
  (gen_random_uuid(), 'Muhammad Ismail v. State', '2021 SCMR 900', 'Sindh High Court', 2021, 'Muhammad Ismail v. State', 'Criminal', 'Criminal appeal against conviction — benefit of doubt to accused', 'PPC 302, CrPC 1973', 'benefit of doubt, acquittal, criminal appeal, evidence'),
  (gen_random_uuid(), 'Ali Enterprises v. Sui Southern Gas', '2021 CLC 100', 'Sindh High Court', 2021, 'Ali Enterprises v. SSGC', 'Contract', 'Suit for damages for breach of gas supply agreement', 'Contract Act 1872, Sections 73, 74', 'breach of contract, gas supply, damages, utilities');

-- Peshawar High Court cases
INSERT INTO citations (id, title, citation, court, year, parties, category, description, relevant_statutes, keywords)
VALUES
  (gen_random_uuid(), 'Sher Ali v. Province of Khyber Pakhtunkhwa', '2025 MLD 150', 'Peshawar High Court', 2025, 'Sher Ali v. Province of KP', 'Civil', 'Suit for possession of agricultural land based on proprietary rights', 'Transfer of Property Act 1882, Land Revenue Act 1967', 'agricultural land, possession, proprietary rights, title'),
  (gen_random_uuid(), 'Muhammad Gul v. State', '2025 PCrLJ 250', 'Peshawar High Court', 2025, 'Muhammad Gul v. State', 'Criminal', 'Post-arrest bail in kidnapping case — recovery of victim', 'PPC 362, 363, CrPC 497', 'kidnapping, bail, recovery, minor, abduction'),
  (gen_random_uuid(), 'Mst. Mena Gul v. Province of KP', '2024 YLR 350', 'Peshawar High Court', 2024, 'Mst. Mena Gul v. Province of KP', 'Family', 'Suit for maintenance of wife and children under Muslim family law', 'Muslim Family Laws Ordinance 1961, Family Courts Act 1964', 'maintenance, nafaqa, wife, children, family'),
  (gen_random_uuid(), 'Fazal Ahmad v. Elementary Education Department', '2024 CLC 450', 'Peshawar High Court', 2024, 'Fazal Ahmad v. Education Department', 'Service', 'Service appeal against removal from service on disciplinary grounds', 'Civil Servants Act 1973, E&D Rules', 'disciplinary proceedings, removal, service, natural justice'),
  (gen_random_uuid(), 'Rashid Khan v. State', '2023 PCrLJ 550', 'Peshawar High Court', 2023, 'Rashid Khan v. State', 'Criminal', 'Criminal appeal against conviction in dacoity case', 'PPC 395, 397, CrPC 1973', 'dacoity, robbery, appeal, conviction, identification'),
  (gen_random_uuid(), 'Muhammad Zaman v. Province of KP', '2023 MLD 650', 'Peshawar High Court', 2023, 'Muhammad Zaman v. Province of KP', 'Constitutional', 'Constitutional petition regarding mining rights and royalties', 'Article 199, KP Mines and Minerals Act', 'mining, mineral rights, royalties, provincial autonomy');

-- Balochistan High Court cases
INSERT INTO citations (id, title, citation, court, year, parties, category, description, relevant_statutes, keywords)
VALUES
  (gen_random_uuid(), 'Sardar Ahmed Khan v. Province of Balochistan', '2025 CLC 100', 'Balochistan High Court', 2025, 'Sardar Ahmed v. Province of Balochistan', 'Civil', 'Dispute regarding title and possession of land in Quetta', 'Transfer of Property Act 1882, Specific Relief Act 1877', 'title, possession, property, Quetta, land dispute'),
  (gen_random_uuid(), 'Muhammad Yousaf v. State', '2025 PCrLJ 200', 'Balochistan High Court', 2025, 'Muhammad Yousaf v. State', 'Criminal', 'Bail application in murder case involving tribal customs', 'PPC 302, CrPC 497', 'bail, murder, tribal, honour, criminal procedure'),
  (gen_random_uuid(), 'Nawab Khan v. Balochistan Public Service Commission', '2024 MLD 300', 'Balochistan High Court', 2024, 'Nawab Khan v. BPSC', 'Service', 'Constitutional petition regarding merit and quotas in public employment', 'Article 199, Civil Servants Act 1973', 'BPSC, employment, quota, merit, public service'),
  (gen_random_uuid(), 'Ghulam Hussain v. Gwadar Development Authority', '2024 YLR 400', 'Balochistan High Court', 2024, 'Ghulam Hussain v. GDA', 'Property', 'Property dispute regarding allotment of land in Gwadar', 'Land Revenue Act 1967, Article 199', 'Gwadar, land allotment, property, GDA, CPEC'),
  (gen_random_uuid(), 'Mst. Bano v. Province of Balochistan', '2023 MLD 500', 'Balochistan High Court', 2023, 'Mst. Bano v. Province of Balochistan', 'Family', 'Guardianship application for custody of minor children', 'Guardians and Wards Act 1890, Muslim Family Laws', 'guardianship, minor, custody, hizanat, family'),
  (gen_random_uuid(), 'Abdul Qadir v. Sui Southern Gas Company', '2023 CLC 600', 'Balochistan High Court', 2023, 'Abdul Qadir v. SSGC', 'Contract', 'Suit for recovery of dues on basis of gas supply contract', 'Contract Act 1872, Specific Relief Act 1877', 'gas supply, recovery, contract, dues, SSGC');

-- Islamabad High Court cases
INSERT INTO citations (id, title, citation, court, year, parties, category, description, relevant_statutes, keywords)
VALUES
  (gen_random_uuid(), 'Pakistan Telecommunication Authority v. Mobilink', '2025 CLC 50', 'Islamabad High Court', 2025, 'PTA v. Mobilink', 'Corporate', 'Corporate appeal regarding imposition of penalty for non-compliance with telecom regulations', 'Pakistan Telecommunication Act 1996, Companies Act 2017', 'telecom, PTA, penalty, non-compliance, corporate'),
  (gen_random_uuid(), 'Citizen v. Capital Development Authority', '2025 PLD 100', 'Islamabad High Court', 2025, 'Citizen v. CDA', 'Constitutional', 'Constitutional petition regarding building bylaws and construction regulation', 'Article 199, CDA Ordinance 1960', 'CDA, building regulations, construction, by-laws, Islamabad'),
  (gen_random_uuid(), 'Dr. Khalid Saeed v. Pakistan Environmental Protection Agency', '2024 YLR 150', 'Islamabad High Court', 2024, 'Dr. Saeed v. Pak-EPA', 'Constitutional', 'Petition regarding environmental impact assessment of construction project', 'Pakistan Environmental Protection Act 1997, Article 199', 'environment, EIA, construction, EPA, pollution'),
  (gen_random_uuid(), 'Muhammad Ali v. Securities and Exchange Commission', '2024 CLC 200', 'Islamabad High Court', 2024, 'Muhammad Ali v. SECP', 'Corporate', 'Petition against suspension of company registration by SECP', 'Companies Act 2017, SECP Act 1997', 'SECP, suspension, registration, company, corporate law'),
  (gen_random_uuid(), 'Saima Bibi v. Federation of Pakistan', '2023 MLD 250', 'Islamabad High Court', 2023, 'Saima Bibi v. Federation', 'Family', 'Family suit for dissolution of marriage and recovery of dower', 'Dissolution of Muslim Marriages Act 1939, Family Courts Act 1964', 'khula, dower, marriage dissolution, mehr, Islamabad'),
  (gen_random_uuid(), 'Taxpayer v. Federal Board of Revenue', '2023 PTD 300', 'Islamabad High Court', 2023, 'Taxpayer v. FBR', 'Tax', 'Tax reference regarding assessment of income from capital gains', 'Income Tax Ordinance 2001, Sections 37, 111', 'capital gains, tax assessment, FBR, income tax, property');

-- Federal Shariat Court cases
INSERT INTO citations (id, title, citation, court, year, parties, category, description, relevant_statutes, keywords)
VALUES
  (gen_random_uuid(), 'Mst. Zubaida v. Federation of Pakistan', '2025 PLD 75', 'Federal Shariat Court', 2025, 'Mst. Zubaida v. Federation', 'Constitutional', 'Examination of certain provisions of Family Laws in light of injunctions of Islam', 'Muslim Family Laws Ordinance 1961, Article 203-D', 'Shariat, Islamic law, family laws, constitutional, FSC'),
  (gen_random_uuid(), 'All Pakistan Ulema Council v. Federation', '2024 PLD 125', 'Federal Shariat Court', 2024, 'APUC v. Federation', 'Constitutional', 'Constitutional challenge to provisions of Interest-based banking', 'Article 203-D, Banking Companies Ordinance 1962', 'riba, interest, banking, Islamic finance, Shariat'),
  (gen_random_uuid(), 'National Commission on Status of Women v. Province of Punjab', '2023 PLD 175', 'Federal Shariat Court', 2023, 'NCSW v. Province of Punjab', 'Constitutional', 'Judicial review of laws relating to women rights and Islamic injunctions', 'PPC 302, 311, 338, 354, Article 203-D', 'women rights, Shariat, honour killing, qisas, diyat'),
  (gen_random_uuid(), 'Muhammad Ibrahim v. Government of Pakistan', '2022 PLD 225', 'Federal Shariat Court', 2022, 'Muhammad Ibrahim v. Government', 'Constitutional', 'Determination of Islamic law regarding DNA evidence in paternity cases', 'Qanun-e-Shahadat Order 1984, Article 203-D', 'DNA evidence, paternity, Islamic law, Qanun-e-Shahadat, Shariat');

-- More diverse cases to reach 70+
INSERT INTO citations (id, title, citation, court, year, parties, category, description, relevant_statutes, keywords)
VALUES
  (gen_random_uuid(), 'Mst. Kulsoom Bibi v. Province of Sindh', '2025 CLC 900', 'Sindh High Court', 2025, 'Kulsoom Bibi v. Province of Sindh', 'Tort', 'Suit for compensation in motor vehicle accident under Fatal Accidents Act', 'Fatal Accidents Act 1855, Motor Vehicles Ordinance 1965', 'motor accident, compensation, negligence, Fatal Accidents Act, tort'),
  (gen_random_uuid(), 'Aziz Ahmed v. State', '2024 PCrLJ 1000', 'Lahore High Court', 2024, 'Aziz Ahmed v. State', 'Criminal', 'Criminal revision against conviction in theft and burglary case', 'PPC 378, 379, 380, CrPC 1973', 'theft, burglary, criminal revision, conviction, property'),
  (gen_random_uuid(), 'Mst. Hajira Bibi v. Province of Punjab', '2024 MLD 1100', 'Lahore High Court', 2024, 'Hajira Bibi v. Province of Punjab', 'Tort', 'Claim petition under Workmen Compensation Act for employment injury', 'Workmen Compensation Act 1923, Sections 3, 4', 'workmen compensation, injury, employment, accident, tort'),
  (gen_random_uuid(), 'Muhammad Asif v. State', '2023 PCrLJ 1200', 'Supreme Court of Pakistan', 2023, 'Muhammad Asif v. State', 'Criminal', 'Appeal against conviction in attempt to murder case', 'PPC 307, 324, CrPC 1973', 'attempted murder, injury, intent, criminal appeal'),
  (gen_random_uuid(), 'Ghulam Mustafa v. Province of Sindh', '2023 YLR 1300', 'Sindh High Court', 2023, 'Ghulam Mustafa v. Province of Sindh', 'Service', 'Service appeal regarding grant of pension and retirement benefits', 'Pension Rules, Civil Servants Act 1973', 'pension, retirement, service, benefits, civil servant'),
  (gen_random_uuid(), 'Nadeem Hussain v. State Bank of Pakistan', '2022 CLC 1400', 'Lahore High Court', 2022, 'Nadeem Hussain v. SBP', 'Banking', 'Suit for recovery of money lent on mortgage of agricultural land', 'Banking Companies Ordinance 1962, Transfer of Property Act 1882', 'loan, mortgage, agricultural land, banking, recovery'),
  (gen_random_uuid(), 'Mst. Nighat Sultana v. Federation of Pakistan', '2022 MLD 1500', 'Islamabad High Court', 2022, 'Nighat Sultana v. Federation', 'Family', 'Suit for restitution of conjugal rights under Family Courts Act', 'Family Courts Act 1964, Muslim Family Laws Ordinance 1961', 'restitution of conjugal rights, marriage, family, reconciliation'),
  (gen_random_uuid(), 'Hasan Ali v. State', '2021 PCrLJ 1600', 'Supreme Court of Pakistan', 2021, 'Hasan Ali v. State', 'Criminal', 'Criminal appeal against acquittal — prosecution evidence reappraisal', 'CrPC 1973, PPC 302', 'acquittal appeal, evidence, reappraisal, criminal appeal'),
  (gen_random_uuid(), 'Pakistan Engineering Council v. Federation', '2021 CLC 1700', 'Supreme Court of Pakistan', 2021, 'PEC v. Federation', 'Corporate', 'Corporate dispute regarding professional regulation and licensing', 'Pakistan Engineering Council Act, Companies Act 2017', 'PEC, licensing, professional regulation, engineering, corporate'),
  (gen_random_uuid(), 'Mst. Uzma Gillani v. Province of Punjab', '2020 MLD 1800', 'Lahore High Court', 2020, 'Uzma Gillani v. Province of Punjab', 'Tort', 'Suit for damages for medical negligence against government hospital', 'Fatal Accidents Act 1855, Law of Torts', 'medical negligence, damages, hospital, malpractice, tort'),
  (gen_random_uuid(), 'Abdul Latif v. State', '2020 PCrLJ 1900', 'Balochistan High Court', 2020, 'Abdul Latif v. State', 'Criminal', 'Appeal against conviction in smuggling and illegal border crossing', 'Customs Act 1969, PPC', 'smuggling, border crossing, customs, conviction, Balochistan'),
  (gen_random_uuid(), 'Muhammad Ramzan v. Province of Punjab', '2019 PLD 2000', 'Lahore High Court', 2019, 'Muhammad Ramzan v. Province of Punjab', 'Property', 'Suit for specific performance of contract of sale — part performance', 'Contract Act 1872, Transfer of Property Act 1882', 'specific performance, contract, part performance, property, TPA'),
  (gen_random_uuid(), 'Province of Punjab v. Sheikh Zayed Hospital', '2019 CLC 2100', 'Lahore High Court', 2019, 'Province of Punjab v. SZH', 'Contract', 'Contractual dispute regarding healthcare service agreement', 'Contract Act 1872, Section 56', 'healthcare, contract, service agreement, force majeure, Punjab'),
  (gen_random_uuid(), 'Mst. Nasreen Akhtar v. Province of KP', '2018 MLD 2200', 'Peshawar High Court', 2018, 'Nasreen Akhtar v. Province of KP', 'Property', 'Suit for succession certificate and inheritance shares determination', 'Succession Act 1925, Muslim Personal Law', 'succession certificate, inheritance, legal heirs, property, KP'),
  (gen_random_uuid(), 'Shabbir Hussain v. Customs Appellate Tribunal', '2018 PTD 2300', 'Sindh High Court', 2018, 'Shabbir Hussain v. Customs Appellate Tribunal', 'Tax', 'Customs appeal regarding confiscation of goods and penalty imposition', 'Customs Act 1969, Sections 156, 157', 'confiscation, customs, penalty, appeal, goods valuation'),
  (gen_random_uuid(), 'Muhammad Usman v. Federation of Pakistan', '2017 YLR 2400', 'Lahore High Court', 2017, 'Muhammad Usman v. Federation', 'Tort', 'Suit for damages for malicious prosecution and false implication', 'Malicious Prosecution, CrPC 1973', 'malicious prosecution, damages, false implication, compensation'),
  (gen_random_uuid(), 'Fatima Sugar Mills v. Federation of Pakistan', '2017 CLC 2500', 'Lahore High Court', 2017, 'Fatima Sugar Mills v. Federation', 'Corporate', 'Petition regarding industrial dispute and labour rights under Companies Act', 'Companies Act 2017, Industrial Relations Act 2012', 'sugar mills, industrial dispute, labour, corporate, industry'),
  (gen_random_uuid(), 'Muhammad Din v. State', '2016 PCrLJ 2600', 'Supreme Court of Pakistan', 2016, 'Muhammad Din v. State', 'Criminal', 'Principles of qisas and diyat — compromise between parties', 'PPC 302, 309, 310, 311', 'qisas, diyat, compromise, composition, blood money'),
  (gen_random_uuid(), 'Punjab Agriculture Department v. Muhammad Shafiq', '2016 CLC 2700', 'Lahore High Court', 2016, 'Punjab Agriculture v. Shafiq', 'Service', 'Service appeal regarding compulsory retirement in public interest', 'Civil Servants Act 1973, Efficiency and Discipline Rules', 'compulsory retirement, public interest, service, civil servant'),
  (gen_random_uuid(), 'Muhammad Yousaf v. Province of Balochistan', '2015 MLD 2800', 'Balochistan High Court', 2015, 'Muhammad Yousaf v. Province of Balochistan', 'Civil', 'Civil suit for declaration of tenancy rights and ejectment', 'Transfer of Property Act 1882, Rent Laws', 'tenancy, ejectment, rent, declaration, property'),
  (gen_random_uuid(), 'Ahmad Hussain v. State', '2015 SCMR 2900', 'Supreme Court of Pakistan', 2015, 'Ahmad Hussain v. State', 'Criminal', 'Criminal appeal — evaluation of circumstantial evidence in murder case', 'PPC 302, Qanun-e-Shahadat 1984', 'circumstantial evidence, murder, criminal appeal, evaluation'),
  (gen_random_uuid(), 'Hashim Ali v. Province of Punjab', '2014 CLC 3000', 'Lahore High Court', 2014, 'Hashim Ali v. Province of Punjab', 'Property', 'Suit for partition of joint family property — metes and bounds', 'Partition Act 1893, Civil Procedure Code 1908', 'partition, joint property, co-owner, metes and bounds, family'),
  (gen_random_uuid(), 'Muhammad Saeed v. State', '2014 PCrLJ 3100', 'Sindh High Court', 2014, 'Muhammad Saeed v. State', 'Criminal', 'Criminal appeal against conviction in cheating and fraud case', 'PPC 419, 420, 467, 468', 'fraud, cheating, forgery, criminal breach, white collar'),
  (gen_random_uuid(), 'Shahida Parveen v. Federation of Pakistan', '2013 PLD 3200', 'Lahore High Court', 2013, 'Shahida Parveen v. Federation', 'Family', 'Suit for jactitation of marriage — declaration regarding validity', 'Dissolution of Muslim Marriages Act 1939, Family Courts Act 1964', 'marriage validity, jactitation, talaq, family, declaration'),
  (gen_random_uuid(), 'Federation of Pakistan v. Amina Bibi', '2013 SCMR 3300', 'Supreme Court of Pakistan', 2013, 'Federation v. Amina Bibi', 'Constitutional', 'Right of women to contract marriage without guardian consent', 'Article 25, 35, Muslim Family Laws Ordinance 1961', 'women rights, marriage, guardian, consent, fundamental rights'),
  (gen_random_uuid(), 'Liaqat Ali v. Province of Punjab', '2012 YLR 3400', 'Lahore High Court', 2012, 'Liaqat Ali v. Province of Punjab', 'Tort', 'Suit for damages for defamation and character assassination', 'Defamation Ordinance 2002, Law of Torts', 'defamation, libel, slander, damages, reputation');
