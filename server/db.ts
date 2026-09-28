import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Migration {
  version: string;
  name: string;
  up: (db: Database.Database) => void;
}

export interface EntitlementRecord {
  id?: number;
  user_id: string;
  customer_id?: string;
  subscription_id?: string;
  plan: string;
  tier: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  current_period_end?: string;
  updated_at?: string;
}

export interface DatabaseBackup {
  version: string;
  timestamp: string;
  checksum: string;
  tables: {
    users: any[];
    waitlist: any[];
    entitlements: any[];
    stripe_events: any[];
    experiments_store: any[];
  };
}

let dbInstance: Database.Database | null = null;
let resolvedDbPath: string = '';

export function getResolvedDbPath(): string {
  if (resolvedDbPath) return resolvedDbPath;

  // 1. Explicit environment path
  if (process.env.DATABASE_PATH) {
    resolvedDbPath = process.env.DATABASE_PATH;
    return resolvedDbPath;
  }

  // 2. Persistent volume mount (e.g. Cloud Run mounted Cloud Storage / Filestore volume)
  if (process.env.PERSISTENT_DATA_DIR && fs.existsSync(process.env.PERSISTENT_DATA_DIR)) {
    resolvedDbPath = path.join(process.env.PERSISTENT_DATA_DIR, 'hypatia_pro.db');
    return resolvedDbPath;
  }

  // 3. /data mount if present
  if (fs.existsSync('/data')) {
    try {
      const testFile = path.join('/data', '.test_write');
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);
      resolvedDbPath = '/data/hypatia_pro.db';
      return resolvedDbPath;
    } catch {
      // not writable, fall through
    }
  }

  // 4. Test current directory writability
  const rootDir = path.resolve(__dirname, '..');
  let isRootWritable = false;
  try {
    const testFile = path.join(rootDir, '.write_test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    isRootWritable = true;
  } catch {
    isRootWritable = false;
  }

  const isCloudRun = !!process.env.K_SERVICE || process.env.NODE_ENV === 'production';
  if (isCloudRun || !isRootWritable) {
    resolvedDbPath = '/tmp/hypatia_pro.db';
  } else {
    resolvedDbPath = path.join(rootDir, 'hypatia_pro.db');
  }

  return resolvedDbPath;
}

const migrations: Migration[] = [
  {
    version: '001_initial_schema',
    name: 'Create users and waitlist tables',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE,
          email TEXT UNIQUE,
          password TEXT,
          geminiKey TEXT,
          role TEXT DEFAULT 'researcher',
          tier TEXT DEFAULT 'free_byo_llm',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS waitlist (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE,
          platform TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
  },
  {
    version: '002_stripe_and_entitlements',
    name: 'Create Stripe idempotency events and entitlements store',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS stripe_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id TEXT UNIQUE NOT NULL,
          event_type TEXT NOT NULL,
          payload TEXT,
          processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS entitlements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          customer_id TEXT,
          subscription_id TEXT UNIQUE,
          plan TEXT NOT NULL,
          tier TEXT NOT NULL,
          status TEXT NOT NULL,
          current_period_end DATETIME,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          correlation_id TEXT,
          action TEXT NOT NULL,
          actor TEXT,
          details TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
  },
  {
    version: '003_experiments_persistence',
    name: 'Create server-side research experiment persistence',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS experiments_store (
          id TEXT PRIMARY KEY,
          user_email TEXT NOT NULL,
          title TEXT NOT NULL,
          data TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_experiments_user ON experiments_store(user_email);
      `);
    }
  }
];

export function initDatabase(): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = getResolvedDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`[Durable Storage] Initializing SQLite database at: ${dbPath}`);
  
  const db = new Database(dbPath);

  // Production performance and reliability pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');

  // Migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT UNIQUE NOT NULL,
      name TEXT,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Run pending migrations
  const appliedRows = db.prepare('SELECT version FROM schema_migrations').all() as { version: string }[];
  const appliedVersions = new Set(appliedRows.map(r => r.version));

  for (const m of migrations) {
    if (!appliedVersions.has(m.version)) {
      console.log(`[Migrations] Applying migration: ${m.version} - ${m.name}`);
      const runInTx = db.transaction(() => {
        m.up(db);
        db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(m.version, m.name);
      });
      runInTx();
      console.log(`[Migrations] Applied ${m.version} successfully.`);
    }
  }

  dbInstance = db;
  return db;
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

export function checkDatabaseHealth(): { healthy: boolean; details: any } {
  try {
    const db = getDatabase();
    const result = db.prepare('SELECT 1 as alive').get() as any;
    const migrationsCount = db.prepare('SELECT count(*) as count FROM schema_migrations').get() as any;
    return {
      healthy: result?.alive === 1,
      details: {
        path: getResolvedDbPath(),
        migrationsApplied: migrationsCount?.count || 0,
        walMode: true
      }
    };
  } catch (err: any) {
    return {
      healthy: false,
      details: {
        error: err.message
      }
    };
  }
}

export function createDatabaseBackup(): DatabaseBackup {
  const db = getDatabase();
  const users = db.prepare('SELECT id, username, email, role, tier, createdAt FROM users').all();
  const waitlist = db.prepare('SELECT * FROM waitlist').all();
  const entitlements = db.prepare('SELECT * FROM entitlements').all();
  const stripe_events = db.prepare('SELECT id, event_id, event_type, processed_at FROM stripe_events').all();
  const experiments_store = db.prepare('SELECT id, user_email, title, updated_at FROM experiments_store').all();

  const timestamp = new Date().toISOString();
  const rawContent = JSON.stringify({ users, entitlements, experiments_store });
  
  // Simple deterministic checksum
  let hash = 0;
  for (let i = 0; i < rawContent.length; i++) {
    hash = ((hash << 5) - hash) + rawContent.charCodeAt(i);
    hash |= 0;
  }

  return {
    version: '2.5.0',
    timestamp,
    checksum: `sha_${Math.abs(hash).toString(16)}`,
    tables: {
      users,
      waitlist,
      entitlements,
      stripe_events,
      experiments_store
    }
  };
}

export function restoreDatabaseBackup(backup: DatabaseBackup): { success: boolean; restoredCounts: Record<string, number> } {
  const db = getDatabase();
  const restoredCounts: Record<string, number> = {};

  const tx = db.transaction(() => {
    if (Array.isArray(backup.tables?.entitlements)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO entitlements (user_id, customer_id, subscription_id, plan, tier, status, current_period_end, updated_at)
        VALUES (@user_id, @customer_id, @subscription_id, @plan, @tier, @status, @current_period_end, @updated_at)
      `);
      for (const ent of backup.tables.entitlements) {
        stmt.run(ent);
      }
      restoredCounts.entitlements = backup.tables.entitlements.length;
    }

    if (Array.isArray(backup.tables?.experiments_store)) {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO experiments_store (id, user_email, title, data, updated_at)
        VALUES (@id, @user_email, @title, @data, @updated_at)
      `);
      for (const exp of backup.tables.experiments_store) {
        stmt.run({
          id: exp.id,
          user_email: exp.user_email,
          title: exp.title,
          data: typeof exp.data === 'string' ? exp.data : JSON.stringify(exp.data),
          updated_at: exp.updated_at || new Date().toISOString()
        });
      }
      restoredCounts.experiments = backup.tables.experiments_store.length;
    }
  });

  tx();
  return { success: true, restoredCounts };
}
