import sql from 'mssql';

const config = {
  server: process.env.MSSQL_SERVER,
  database: process.env.MSSQL_DATABASE || 'JinnahLegal',
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  port: parseInt(process.env.MSSQL_PORT || '1433'),
  options: {
    encrypt: process.env.MSSQL_ENCRYPT !== 'false',
    trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true',
    enableArithAbort: true,
  },
  pool: { max: 10, min: 2, idleTimeoutMillis: 30000, acquireTimeoutMillis: 10000 },
};

export class MssqlAdapter {
  constructor() {
    this.pool = null;
  }

  async connect() {
    this.pool = await sql.connect(config);
    this.pool.on('error', err => {
      console.error('MSSQL pool error:', err.message);
    });
    console.log(`✅  MSSQL connected → ${config.server}/${config.database}`);
    await this._createSchema();
  }

  _buildQuery(sqlText, params = []) {
    let i = 0;
    const msSql = sqlText.replace(/\?/g, () => `@p${++i}`);
    return { msSql, params };
  }

  async run(sqlText, params = []) {
    this._ensureConnected();
    const { msSql, params: p } = this._buildQuery(sqlText, params);
    const req = this.pool.request();
    p.forEach((v, i) => req.input(`p${i + 1}`, v ?? null));
    await req.query(msSql);
  }

  async query(sqlText, params = []) {
    this._ensureConnected();
    const { msSql, params: p } = this._buildQuery(sqlText, params);
    const req = this.pool.request();
    p.forEach((v, i) => req.input(`p${i + 1}`, v ?? null));
    const result = await req.query(msSql);
    return result.recordset || [];
  }

  async queryOne(sqlText, params = []) {
    const rows = await this.query(sqlText, params);
    return rows[0] ?? null;
  }

  async close() {
    if (this.pool) {
      try {
        await this.pool.close();
        console.log('✅ MSSQL pool closed');
      } catch (err) {
        console.error('Error closing MSSQL pool:', err.message);
      }
      this.pool = null;
    }
  }

  _ensureConnected() {
    if (!this.pool || !this.pool.connected) {
      throw new Error('Database not connected');
    }
  }

  async _createSchema() {
    const tables = [
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
      CREATE TABLE users (
        id NVARCHAR(36) PRIMARY KEY,
        email NVARCHAR(255) UNIQUE NOT NULL,
        password_hash NVARCHAR(255) NOT NULL,
        name NVARCHAR(255) NOT NULL,
        role NVARCHAR(50) NOT NULL,
        avatar NVARCHAR(500), phone NVARCHAR(50),
        address NVARCHAR(500), city NVARCHAR(100),
        lat FLOAT, lng FLOAT,
        firm_id NVARCHAR(36),
        subscription_plan NVARCHAR(50) DEFAULT 'free',
        is_verified BIT DEFAULT 0,
        verification_status NVARCHAR(50) DEFAULT 'pending',
        bar_number NVARCHAR(100), license_number NVARCHAR(100),
        specialization NVARCHAR(500), experience INT, education NVARCHAR(1000),
        is_firm_admin BIT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE()
      )`,
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='firms' AND xtype='U')
      CREATE TABLE firms (
        id NVARCHAR(36) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        email NVARCHAR(255) UNIQUE NOT NULL,
        phone NVARCHAR(50), address NVARCHAR(500), city NVARCHAR(100),
        description NVARCHAR(MAX),
        registration_number NVARCHAR(100),
        is_verified BIT DEFAULT 0,
        verification_status NVARCHAR(50) DEFAULT 'pending',
        admin_id NVARCHAR(36),
        created_at DATETIME2 DEFAULT GETDATE()
      )`,
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='cases' AND xtype='U')
      CREATE TABLE cases (
        id NVARCHAR(36) PRIMARY KEY,
        title NVARCHAR(500) NOT NULL, description NVARCHAR(MAX),
        client_id NVARCHAR(36), lawyer_id NVARCHAR(36),
        status NVARCHAR(50) DEFAULT 'pending', type NVARCHAR(100),
        timeline NVARCHAR(MAX) DEFAULT '[]',
        documents NVARCHAR(MAX) DEFAULT '[]',
        court_dates NVARCHAR(MAX) DEFAULT '[]',
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      )`,
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='messages' AND xtype='U')
      CREATE TABLE messages (
        id NVARCHAR(36) PRIMARY KEY,
        sender_id NVARCHAR(36), receiver_id NVARCHAR(36),
        content NVARCHAR(MAX) NOT NULL, case_id NVARCHAR(36),
        is_read BIT DEFAULT 0,
        attachments NVARCHAR(MAX) DEFAULT '[]',
        created_at DATETIME2 DEFAULT GETDATE()
      )`,
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='messages_share' AND xtype='U')
      BEGIN
        ALTER TABLE messages ADD share_data NVARCHAR(MAX);
      END`,
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='connection_requests' AND xtype='U')
      CREATE TABLE connection_requests (
        id NVARCHAR(36) PRIMARY KEY,
        sender_id NVARCHAR(36) NOT NULL, receiver_id NVARCHAR(36) NOT NULL,
        status NVARCHAR(50) NOT NULL DEFAULT 'pending',
        message NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
      )`,
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='connections' AND xtype='U')
      CREATE TABLE connections (
        id NVARCHAR(36) PRIMARY KEY,
        user1_id NVARCHAR(36) NOT NULL, user2_id NVARCHAR(36) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE()
      )`,
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='journal_entries' AND xtype='U')
      CREATE TABLE journal_entries (
        id NVARCHAR(36) PRIMARY KEY, user_id NVARCHAR(36),
        date NVARCHAR(20) NOT NULL, notes NVARCHAR(MAX),
        todos NVARCHAR(MAX) DEFAULT '[]', plans NVARCHAR(MAX), content NVARCHAR(MAX) DEFAULT '',
        created_at DATETIME2 DEFAULT GETDATE()
      )`,
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='invoices' AND xtype='U')
      CREATE TABLE invoices (
        id NVARCHAR(36) PRIMARY KEY,
        case_id NVARCHAR(36), client_id NVARCHAR(36), lawyer_id NVARCHAR(36),
        amount FLOAT NOT NULL, hours FLOAT, description NVARCHAR(1000),
        status NVARCHAR(50) DEFAULT 'pending', due_date NVARCHAR(20),
        created_at DATETIME2 DEFAULT GETDATE()
      )`,
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='time_entries' AND xtype='U')
      CREATE TABLE time_entries (
        id NVARCHAR(36) PRIMARY KEY, lawyer_id NVARCHAR(36), case_id NVARCHAR(36),
        hours FLOAT NOT NULL, description NVARCHAR(1000),
        date NVARCHAR(20) NOT NULL, rate FLOAT,
        created_at DATETIME2 DEFAULT GETDATE()
      )`,
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ai_sessions' AND xtype='U')
      CREATE TABLE ai_sessions (
        id NVARCHAR(36) PRIMARY KEY, user_id NVARCHAR(36) NOT NULL,
        title NVARCHAR(500) NOT NULL DEFAULT 'New Chat',
        created_at DATETIME2 DEFAULT GETDATE()
      )`,
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ai_chat_history' AND xtype='U')
      CREATE TABLE ai_chat_history (
        id NVARCHAR(36) PRIMARY KEY, user_id NVARCHAR(36),
        role NVARCHAR(20) NOT NULL, content NVARCHAR(MAX) NOT NULL,
        session_id NVARCHAR(36),
        created_at DATETIME2 DEFAULT GETDATE()
      )`,
    ];

    for (const t of tables) {
      await this.pool.request().query(t);
    }
    console.log('✅  MSSQL schema ready');
  }
}
