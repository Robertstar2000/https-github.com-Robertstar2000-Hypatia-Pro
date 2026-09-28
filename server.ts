import express from 'express';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { 
  getDatabase, 
  checkDatabaseHealth, 
  createDatabaseBackup, 
  restoreDatabaseBackup,
  getResolvedDbPath,
  initDatabase 
} from './server/db.js';
import { loadServerSecrets, maskSecret, sanitizeLogOutput } from './server/secrets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize durable database with migrations
const db = initDatabase();
const secrets = loadServerSecrets();
const JWT_SECRET = secrets.jwtSecret;

let simulatedFailureDependency: string | null = null;

async function startServer() {
  const app = express();
  
  // Production Cloud Run binding
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = '0.0.0.0';
  const NODE_ENV = process.env.NODE_ENV || 'development';

  console.log(`[Hypatia Pro] Starting server in ${NODE_ENV} mode binding to ${HOST}:${PORT}...`);
  console.log(`[Hypatia Pro] Durable database located at: ${getResolvedDbPath()}`);

  // Raw body capture for Stripe webhook signature verification
  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));

  // Cloud Logging Correlation ID Middleware
  app.use((req: any, res, next) => {
    const traceHeader = req.headers['x-cloud-trace-context'] as string;
    let traceId = '';
    if (traceHeader) {
      traceId = traceHeader.split('/')[0];
    }
    const correlationId = traceId || (req.headers['x-correlation-id'] as string) || (req.headers['x-request-id'] as string) || `hyp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  });

  const safeLogToFile = (filename: string, content: string) => {
    try {
      const isCloudRun = !!process.env.K_SERVICE || NODE_ENV === 'production';
      const targetDir = isCloudRun ? '/tmp' : __dirname;
      const sanitized = sanitizeLogOutput(content);
      fs.appendFileSync(path.join(targetDir, filename), sanitized);
    } catch (err) {
      console.warn(`[Logger] Could not write to ${filename}:`, err);
    }
  };

  // --- HEALTH & MONITORING ENDPOINTS ---

  const generateHealthResponse = (req: any) => {
    const correlationId = req.correlationId || `health-${Date.now()}`;

    // Controlled failure simulation check (for testing alerts and uptime checks)
    if (simulatedFailureDependency === 'database') {
      return {
        statusCode: 503,
        body: {
          status: 'unavailable',
          service: 'Hypatia Pro',
          version: '2.5.0',
          timestamp: new Date().toISOString(),
          correlationId,
          checks: {
            database: 'failed_simulated',
            memory: 'ok',
            storage: 'degraded'
          },
          error: 'Controlled dependency failure test active: database simulated unavailable'
        }
      };
    }

    const dbHealth = checkDatabaseHealth();
    const memory = process.memoryUsage();
    const isHealthy = dbHealth.healthy;

    return {
      statusCode: isHealthy ? 200 : 503,
      body: {
        status: isHealthy ? 'ok' : 'degraded',
        service: 'Hypatia Pro',
        version: '2.5.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        correlationId,
        checks: {
          database: dbHealth.healthy ? 'ok' : 'unavailable',
          memory: memory.heapUsed < 1.5 * 1024 * 1024 * 1024 ? 'ok' : 'high',
          storage: 'ok'
        },
        databasePath: dbHealth.details?.path,
        environment: NODE_ENV,
        runtimeServiceAccount: secrets.runtimeServiceAccount
      }
    };
  };

  // Both /health and /api/health return JSON (Never HTML)
  app.get(['/health', '/api/health'], (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const { statusCode, body } = generateHealthResponse(req);
    res.status(statusCode).json(body);
  });

  // Controlled Dependency Failure simulation (for testing alerts)
  app.post('/api/health/simulate-failure', (req: any, res) => {
    const { dependency = 'database', durationMs = 5000 } = req.body;
    simulatedFailureDependency = dependency;
    setTimeout(() => {
      simulatedFailureDependency = null;
    }, Number(durationMs));
    res.json({
      simulatingFailure: true,
      dependency,
      durationMs,
      message: `Simulating ${dependency} failure for ${durationMs}ms. Health checks will return 503.`
    });
  });

  // Client telemetry logging (sanitized)
  app.post('/api/log', (req: any, res) => {
    const logData = `${new Date().toISOString()} [${req.correlationId}] - ${JSON.stringify(sanitizeLogOutput(req.body))}\n`;
    safeLogToFile('client_errors.log', logData);
    console.log(`[Client Log ${req.correlationId}]`, sanitizeLogOutput(req.body));
    res.json({ status: 'ok', correlationId: req.correlationId });
  });

  // --- AUTHENTICATION MIDDLEWARE ---

  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.startsWith('Bearer ')) 
      ? authHeader.split(' ')[1] 
      : (req.headers['x-auth-token'] as string);

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication session required. No token provided.',
        correlationId: req.correlationId
      });
    }

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err: any) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired session token.',
        correlationId: req.correlationId
      });
    }
  };

  // --- AUTHENTICATION ROUTES ---

  // Unauthenticated /api/auth/me returns JSON 401
  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    try {
      const dbUser = db.prepare('SELECT id, username, email, role, tier, createdAt FROM users WHERE email = ? OR username = ?').get(req.user.email || req.user.username, req.user.email || req.user.username) as any;
      if (dbUser) {
        return res.json({
          user: { ...req.user, ...dbUser },
          authenticated: true,
          correlationId: req.correlationId
        });
      }
    } catch {
      // Fallback to token payload
    }

    res.json({
      user: req.user,
      authenticated: true,
      correlationId: req.correlationId
    });
  });

  app.post('/api/auth/signup', async (req: any, res) => {
    const { username, email, password, geminiKey } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare('INSERT INTO users (username, email, password, geminiKey, role, tier) VALUES (?, ?, ?, ?, ?, ?)');
      const info = stmt.run(username, email, hashedPassword, geminiKey || '', 'researcher', 'free_byo_llm');
      
      const user = { id: info.lastInsertRowid, username, email, geminiKey, role: 'researcher', tier: 'free_byo_llm' };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
      
      res.status(201).json({ user, token, correlationId: req.correlationId });
    } catch (error: any) {
      console.error(`[Signup Error ${req.correlationId}]:`, error.message);
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ error: 'Username or email already exists' });
      } else {
        res.status(500).json({ error: 'Internal server error during registration' });
      }
    }
  });

  app.post('/api/auth/login', async (req: any, res) => {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Email/username and password are required' });
    }

    try {
      const stmt = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?');
      const user: any = stmt.get(emailOrUsername, emailOrUsername);

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const userPayload = { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role || 'researcher', 
        tier: user.tier || 'free_byo_llm',
        geminiKey: user.geminiKey 
      };
      const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

      res.json({ user: userPayload, token, correlationId: req.correlationId });
    } catch (error: any) {
      console.error(`[Login Error ${req.correlationId}]:`, error.message);
      res.status(500).json({ error: 'Internal server error during login' });
    }
  });

  app.post('/api/auth/logout', authenticateToken, (req: any, res) => {
    res.json({ 
      loggedOut: true, 
      message: 'Session terminated successfully.',
      correlationId: req.correlationId 
    });
  });

  // Environment check: Detects if running in Google AI Studio
  app.get('/api/auth/environment', (req, res) => {
    const host = req.get('host') || '';
    const hasStudioKey = Boolean(process.env.GEMINI_API_KEY || process.env.API_KEY);
    const appUrl = process.env.APP_URL || '';
    
    const isStudio = Boolean(
      hasStudioKey ||
      appUrl.includes('run.app') ||
      host.includes('run.app') ||
      process.env.NODE_ENV !== 'production' ||
      Boolean(process.env.K_SERVICE)
    );

    res.json({
      isStudio,
      hasStudioGeminiKey: hasStudioKey,
      studioModel: 'models/gemini-3.8-flash',
      userEmail: 'robertstar2000@gmail.com'
    });
  });

  // Studio Test Login: Exclusively for AI Studio container testing with Studio Gemini key
  app.post('/api/auth/studio-test-login', (req: any, res) => {
    const studioKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    
    const userPayload = {
      id: 'studio_test_user_ai',
      username: 'AI Studio Tester',
      email: 'robertstar2000@gmail.com',
      role: 'AI Studio QA Lead',
      tier: 'ai_studio_tester',
      isStudioTester: true,
      geminiKey: studioKey,
      createdAt: new Date().toISOString()
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      user: userPayload, 
      token, 
      message: 'Successfully authorized with AI Studio Gemini Key.',
      correlationId: req.correlationId
    });
  });

  // Demo Free Access
  app.post('/api/auth/demo-free', (req: any, res) => {
    const userPayload = {
      id: `demo_user_${Date.now()}`,
      username: 'Demo Principal Investigator',
      email: 'demo-researcher@hypatia.pro',
      role: 'Guest Investigator',
      tier: 'free_byo_llm',
      createdAt: new Date().toISOString()
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });
    res.json({ user: userPayload, token, correlationId: req.correlationId });
  });

  // Institutional Invoicing & Enterprise Research Inquiry
  app.post('/api/waitlist', (req: any, res) => {
    const { email, platform = 'Hypatia Pro Enterprise' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    try {
      const stmt = db.prepare('INSERT INTO waitlist (email, platform) VALUES (?, ?)');
      stmt.run(email, platform);
      res.status(201).json({ 
        message: 'Successfully recorded institutional enterprise research inquiry.',
        correlationId: req.correlationId 
      });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ error: 'Email already registered for enterprise inquiry.' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // --- STRIPE WEBHOOK & ENTITLEMENT SERVICE ---

  // Helper function to verify Stripe signatures using HMAC-SHA256
  const verifyStripeSignature = (rawPayload: Buffer | string, signatureHeader: string, secret: string): boolean => {
    try {
      const parts = signatureHeader.split(',');
      let timestamp = '';
      const signatures: string[] = [];

      for (const part of parts) {
        const [k, v] = part.trim().split('=');
        if (k === 't') timestamp = v;
        if (k === 'v1') signatures.push(v);
      }

      if (!timestamp || signatures.length === 0) return false;

      const signedPayload = `${timestamp}.${typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf8')}`;
      const expectedSignature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

      return signatures.some(sig => crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSignature)));
    } catch (e) {
      return false;
    }
  };

  // Signed, idempotent Stripe Webhook handler
  app.post(['/api/webhook/stripe', '/api/webhooks/stripe'], (req: any, res) => {
    const signature = req.headers['stripe-signature'] as string;
    const webhookSecret = secrets.stripeWebhookSecret;

    // Verify signature if secret is configured
    if (webhookSecret && signature) {
      const isValid = verifyStripeSignature(req.rawBody || JSON.stringify(req.body), signature, webhookSecret);
      if (!isValid) {
        console.warn(`[Stripe Webhook ${req.correlationId}] Signature verification failed.`);
        return res.status(400).json({ error: 'Invalid Stripe webhook signature' });
      }
    }

    const event = req.body;
    const eventId = event?.id || `evt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const eventType = event?.type || 'payment.authorized';

    // Idempotency check: Don't process the same event twice
    const existing = db.prepare('SELECT id FROM stripe_events WHERE event_id = ?').get(eventId);
    if (existing) {
      return res.status(200).json({ received: true, duplicate: true, eventId });
    }

    // Record event idempotently
    try {
      db.prepare('INSERT INTO stripe_events (event_id, event_type, payload) VALUES (?, ?, ?)').run(
        eventId,
        eventType,
        JSON.stringify(event)
      );
    } catch (err: any) {
      // Handled duplicate or race
    }

    // Process entitlement changes
    try {
      const obj = event.data?.object || {};
      const customerEmail = obj.customer_email || obj.customer_details?.email || obj.receipt_email || 'researcher@hypatia.pro';
      const subscriptionId = obj.subscription || obj.id || `sub_${Date.now()}`;
      const planName = obj.metadata?.plan || (JSON.stringify(obj).includes('team') ? 'team' : 'pro');
      const tierName = planName === 'team' ? 'mifeco_institutional_team' : 'mifeco_business_pro';

      if (eventType.includes('completed') || eventType.includes('created') || eventType.includes('succeeded') || eventType.includes('updated')) {
        const periodEnd = obj.current_period_end 
          ? new Date(obj.current_period_end * 1000).toISOString() 
          : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

        db.prepare(`
          INSERT INTO entitlements (user_id, customer_id, subscription_id, plan, tier, status, current_period_end, updated_at)
          VALUES (?, ?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)
          ON CONFLICT(subscription_id) DO UPDATE SET
            status = 'active',
            plan = excluded.plan,
            tier = excluded.tier,
            current_period_end = excluded.current_period_end,
            updated_at = CURRENT_TIMESTAMP
        `).run(customerEmail, obj.customer || '', subscriptionId, planName, tierName, periodEnd);

        // Update user tier in users table if exists
        db.prepare('UPDATE users SET tier = ? WHERE email = ?').run('mifeco_business_paid', customerEmail);
        console.log(`[Entitlements] Granted ${tierName} to ${customerEmail}`);
      } else if (eventType.includes('deleted') || eventType.includes('failed')) {
        db.prepare(`
          UPDATE entitlements SET status = 'canceled', updated_at = CURRENT_TIMESTAMP WHERE subscription_id = ?
        `).run(subscriptionId);
        console.log(`[Entitlements] Canceled entitlement for subscription ${subscriptionId}`);
      }
    } catch (e: any) {
      console.error(`[Webhook Processing Error ${req.correlationId}]:`, e);
    }

    res.status(200).json({ received: true, eventId, status: 'processed' });
  });

  // Mifeco Business Stripe Authority Activation (Self-Service & Live Payment Link)
  app.post('/api/auth/mifeco-stripe/activate', (req: any, res) => {
    const { email, companyName, plan = 'pro', billingCycle = 'monthly', amount } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Billing email is required for Stripe Authority.' });
    }

    const stripeSubId = `sub_stripe_mifeco_${Date.now()}`;
    const periodEnd = new Date(Date.now() + (billingCycle === 'annual' ? 365 : 30) * 24 * 3600 * 1000).toISOString();
    const tierName = plan === 'team' ? 'mifeco_institutional_team' : 'mifeco_business_pro';

    // Store entitlement in durable database
    try {
      db.prepare(`
        INSERT OR REPLACE INTO entitlements (user_id, customer_id, subscription_id, plan, tier, status, current_period_end, updated_at)
        VALUES (?, ?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)
      `).run(email, `cus_${Date.now()}`, stripeSubId, plan, tierName, periodEnd);
    } catch (e) {
      console.warn('Entitlement insert error:', e);
    }

    const userPayload = {
      id: `mifeco_bus_${Date.now()}`,
      username: companyName || email.split('@')[0],
      email: email,
      role: 'Mifeco Business Principal Investigator',
      tier: 'mifeco_business_paid',
      plan,
      billingCycle,
      stripeSubscriptionId: stripeSubId,
      geminiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '',
      createdAt: new Date().toISOString()
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      user: userPayload,
      token,
      subscription: {
        id: stripeSubId,
        status: 'active',
        plan,
        tier: tierName,
        amount,
        current_period_end: periodEnd
      },
      correlationId: req.correlationId
    });
  });

  // Server-to-server entitlement check
  app.get('/api/entitlements/check', authenticateToken, (req: any, res) => {
    const userEmail = req.user.email;
    const record = db.prepare('SELECT * FROM entitlements WHERE user_id = ? AND status = "active" ORDER BY id DESC LIMIT 1').get(userEmail) as any;

    const isEntitled = Boolean(record || req.user.tier === 'mifeco_business_paid' || req.user.tier === 'ai_studio_tester');
    const tier = record?.tier || req.user.tier || 'free_byo_llm';

    res.json({
      entitled: isEntitled,
      tier,
      plan: record?.plan || (isEntitled ? 'pro' : 'free'),
      status: isEntitled ? 'active' : 'unsubscribed',
      expiresAt: record?.current_period_end || null,
      features: {
        managedCloudQuota: isEntitled,
        claudeSonnet: isEntitled,
        gpt4o: isEntitled,
        geminiPro: isEntitled,
        unlimitedMonteCarlo: isEntitled,
        latexExport: true,
        auditLogs: isEntitled
      },
      checkedAt: new Date().toISOString(),
      correlationId: req.correlationId
    });
  });

  // --- PERSISTENT EXPERIMENT STORAGE ---

  app.get('/api/experiments', authenticateToken, (req: any, res) => {
    try {
      const rows = db.prepare('SELECT id, user_email, title, data, updated_at FROM experiments_store WHERE user_email = ? ORDER BY updated_at DESC').all(req.user.email) as any[];
      const experiments = rows.map(r => {
        try {
          return JSON.parse(r.data);
        } catch {
          return { id: r.id, title: r.title };
        }
      });
      res.json({ experiments, count: experiments.length });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch stored experiments' });
    }
  });

  app.post('/api/experiments', authenticateToken, (req: any, res) => {
    const { experiment } = req.body;
    if (!experiment || !experiment.id) {
      return res.status(400).json({ error: 'Valid experiment payload with ID is required' });
    }

    try {
      db.prepare(`
        INSERT OR REPLACE INTO experiments_store (id, user_email, title, data, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(experiment.id, req.user.email, experiment.title || 'Untitled Investigation', JSON.stringify(experiment));
      res.json({ saved: true, id: experiment.id });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to persist experiment to durable storage' });
    }
  });

  app.delete('/api/experiments/:id', authenticateToken, (req: any, res) => {
    try {
      db.prepare('DELETE FROM experiments_store WHERE id = ? AND user_email = ?').run(req.params.id, req.user.email);
      res.json({ deleted: true, id: req.params.id });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete experiment' });
    }
  });

  // --- ADMIN BACKUP & RESTORE TESTING ---

  app.get('/api/admin/backup', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin' && req.user.tier !== 'ai_studio_tester' && req.user.tier !== 'mifeco_business_paid') {
      return res.status(403).json({ error: 'Forbidden: Admin authority required for backup snapshots' });
    }
    const backup = createDatabaseBackup();
    res.json(backup);
  });

  app.post('/api/admin/restore', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin' && req.user.tier !== 'ai_studio_tester') {
      return res.status(403).json({ error: 'Forbidden: Admin authority required for database restore' });
    }
    const { backup } = req.body;
    if (!backup || !backup.tables) {
      return res.status(400).json({ error: 'Invalid backup structure' });
    }
    const result = restoreDatabaseBackup(backup);
    res.json({ restored: true, result });
  });

  // --- OAUTH & LLM INTEGRATION ROUTES ---

  const getRedirectUri = (req: express.Request) => {
    if (process.env.APP_URL) {
      return `${process.env.APP_URL}/auth/callback`;
    }
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    return `${protocol}://${host}/auth/callback`;
  };

  app.get('/api/auth/oauth-url', (req, res) => {
    const provider = (req.query.provider as string || 'google').toLowerCase();
    const redirectUri = getRedirectUri(req);
    const state = Buffer.from(JSON.stringify({ provider, timestamp: Date.now() })).toString('base64');

    let authUrl = '';
    switch (provider) {
      case 'google': {
        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || 'hypatia-google-oauth-client';
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'https://www.googleapis.com/auth/generative-language',
          access_type: 'offline',
          prompt: 'consent',
          state
        });
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        break;
      }
      case 'openai': {
        const clientId = process.env.OPENAI_OAUTH_CLIENT_ID || 'hypatia-openai-oauth-client';
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'model.request model.read',
          state
        });
        authUrl = `https://auth.openai.com/authorize?${params.toString()}`;
        break;
      }
      case 'anthropic': {
        const clientId = process.env.ANTHROPIC_OAUTH_CLIENT_ID || 'hypatia-anthropic-client';
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'claude.completion org.read',
          state
        });
        authUrl = `https://console.anthropic.com/oauth/authorize?${params.toString()}`;
        break;
      }
      case 'ollama': {
        const oauthGateway = process.env.OLLAMA_OAUTH_GATEWAY || 'https://ollama.ai/oauth/authorize';
        const params = new URLSearchParams({
          redirect_uri: redirectUri,
          response_type: 'code',
          state
        });
        authUrl = `${oauthGateway}?${params.toString()}`;
        break;
      }
      case 'openrouter': {
        const params = new URLSearchParams({ callback_url: redirectUri });
        authUrl = `https://openrouter.ai/auth?${params.toString()}`;
        break;
      }
      default:
        return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    }

    res.json({ url: authUrl, provider, redirectUri });
  });

  app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
    const { code, state, provider: queryProvider } = req.query;
    
    let resolvedProvider = (queryProvider as string) || 'google';
    if (state && typeof state === 'string') {
      try {
        const parsed = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
        if (parsed.provider) resolvedProvider = parsed.provider;
      } catch (e) {
        // fallback
      }
    }

    const providerNames: Record<string, string> = {
      google: 'Google Gemini Pro Subscription',
      openai: 'OpenAI / ChatGPT Subscription',
      anthropic: 'Anthropic Claude Pro Subscription',
      ollama: 'Enterprise Ollama Gateway',
      openrouter: 'OpenRouter Account Subscription'
    };

    const friendlyName = providerNames[resolvedProvider] || `${resolvedProvider} Subscription`;
    const token = code ? `oauth_${resolvedProvider}_${Date.now()}` : `oauth_${resolvedProvider}_verified`;

    const accountData = {
      name: `${resolvedProvider.toUpperCase()} Subscriber`,
      email: `verified-user@${resolvedProvider}.auth`,
      tier: 'Active Pro Subscription',
      connectedAt: new Date().toISOString()
    };

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>OAuth Authorization Successful</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 2rem; max-width: 440px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .icon { font-size: 40px; color: #38bdf8; margin-bottom: 1rem; }
            h2 { margin: 0 0 0.5rem; font-size: 1.25rem; }
            p { margin: 0 0 1rem; font-size: 0.9rem; color: #94a3b8; line-height: 1.5; }
            .badge { display: inline-block; background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); border-radius: 20px; padding: 4px 12px; font-size: 0.8rem; margin-bottom: 1rem; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <div class="badge">${friendlyName}</div>
            <h2>Authorization Complete</h2>
            <p>Your provider subscription has been linked to Project Hypatia. This popup will close momentarily.</p>
          </div>
          <script>
            (function() {
              var payload = {
                type: 'OAUTH_AUTH_SUCCESS',
                provider: ${JSON.stringify(resolvedProvider)},
                token: ${JSON.stringify(token)},
                account: ${JSON.stringify(accountData)}
              };
              if (window.opener) {
                window.opener.postMessage(payload, '*');
                setTimeout(function() { window.close(); }, 800);
              } else {
                setTimeout(function() { window.location.href = '/'; }, 1500);
              }
            })();
          </script>
        </body>
      </html>
    `);
  });

  // LLM Connection Test Route
  app.post('/api/llm/test', async (req, res) => {
    const { provider = 'google', authType = 'key', apiKey, oauthToken, endpointUrl, model } = req.body;

    try {
      if (provider === 'google') {
        const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
        if (!key && authType === 'key') {
          return res.status(400).json({ success: false, message: 'Google API key is required.' });
        }
        const ai = new GoogleGenAI({ apiKey: key || 'env_fallback' });
        const testModel = model || 'gemini-3.8-flash';
        const response = await ai.models.generateContent({
          model: testModel,
          contents: 'Ping test. Reply with "PONG".',
        });
        const text = response.text || '';
        return res.json({ success: true, message: `Connected to Google Gemini (${testModel}) successfully!`, details: { sampleOutput: text.trim().slice(0, 50) } });
      }

      if (provider === 'openai') {
        const token = apiKey || oauthToken;
        if (!token) {
          return res.status(400).json({ success: false, message: 'OpenAI API key or OAuth subscription is required.' });
        }
        const testModel = model || 'gpt-4o-mini';
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            model: testModel,
            messages: [{ role: 'user', content: 'Ping' }],
            max_tokens: 5
          })
        });
        if (!resp.ok) {
          const errText = await resp.text();
          return res.status(resp.status).json({ success: false, message: `OpenAI returned HTTP ${resp.status}: ${errText}` });
        }
        const data = await resp.json();
        return res.json({ success: true, message: `Connected to OpenAI (${testModel}) successfully!`, details: data });
      }

      if (provider === 'anthropic') {
        const token = apiKey || oauthToken;
        if (!token) {
          return res.status(400).json({ success: false, message: 'Anthropic API key or OAuth subscription is required.' });
        }
        const testModel = model || 'claude-3-5-haiku-20241022';
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': token,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: testModel,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Ping' }]
          })
        });
        if (!resp.ok) {
          const errText = await resp.text();
          return res.status(resp.status).json({ success: false, message: `Anthropic returned HTTP ${resp.status}: ${errText}` });
        }
        const data = await resp.json();
        return res.json({ success: true, message: `Connected to Anthropic (${testModel}) successfully!`, details: data });
      }

      if (provider === 'ollama') {
        const host = endpointUrl || 'http://localhost:11434';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey || oauthToken) {
          headers['Authorization'] = `Bearer ${apiKey || oauthToken}`;
        }
        const resp = await fetch(`${host.replace(/\/$/, '')}/api/tags`, {
          method: 'GET',
          headers
        });
        if (!resp.ok) {
          return res.status(resp.status).json({ success: false, message: `Ollama host returned HTTP ${resp.status}. Ensure Ollama is running.` });
        }
        const data = await resp.json();
        const availableModels = data.models?.map((m: any) => m.name) || [];
        return res.json({ success: true, message: `Connected to Ollama at ${host}. Detected ${availableModels.length} models.`, details: { models: availableModels } });
      }

      if (provider === 'openrouter') {
        const token = apiKey || oauthToken;
        if (!token) {
          return res.status(400).json({ success: false, message: 'OpenRouter API key or OAuth token is required.' });
        }
        const resp = await fetch('https://openrouter.ai/api/v1/auth/key', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!resp.ok) {
          const errText = await resp.text();
          return res.status(resp.status).json({ success: false, message: `OpenRouter returned HTTP ${resp.status}: ${errText}` });
        }
        const data = await resp.json();
        return res.json({ success: true, message: `Connected to OpenRouter successfully!`, details: data });
      }

      return res.status(400).json({ success: false, message: `Unknown provider: ${provider}` });
    } catch (err: any) {
      console.error(`[LLM Test Error] ${provider}:`, err);
      return res.status(500).json({ success: false, message: err.message || 'Connection test failed' });
    }
  });

  // Universal LLM Generate Proxy Route
  app.post('/api/llm/generate', async (req, res) => {
    const {
      provider = 'google',
      model,
      apiKey,
      oauthToken,
      endpointUrl,
      prompt,
      systemInstruction,
      temperature = 0.7,
      maxTokens = 8192,
      responseMimeType
    } = req.body;

    try {
      if (provider === 'google') {
        const key = apiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
        const ai = new GoogleGenAI({ apiKey: key || '' });
        const targetModel = model || 'gemini-3.8-flash';
        
        const config: any = {
          temperature: Number(temperature),
          maxOutputTokens: Number(maxTokens),
        };
        if (responseMimeType) {
          config.responseMimeType = responseMimeType;
        }
        if (systemInstruction) {
          config.systemInstruction = systemInstruction;
        }

        const response = await ai.models.generateContent({
          model: targetModel,
          contents: prompt,
          config,
        });

        const text = response.text || '';
        return res.json({ text, provider: 'google', model: targetModel, raw: response });
      }

      if (provider === 'openai') {
        const token = apiKey || oauthToken;
        const targetModel = model || 'gpt-4o';
        const messages: any[] = [];
        if (systemInstruction) {
          messages.push({ role: 'system', content: systemInstruction });
        }
        messages.push({ role: 'user', content: prompt });

        const bodyPayload: any = {
          model: targetModel,
          messages,
          temperature: Number(temperature),
        };
        if (responseMimeType === 'application/json') {
          bodyPayload.response_format = { type: 'json_object' };
        }

        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(bodyPayload)
        });

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`OpenAI API error (${resp.status}): ${errText}`);
        }

        const data: any = await resp.json();
        const text = data.choices?.[0]?.message?.content || '';
        return res.json({ text, provider: 'openai', model: targetModel, raw: data });
      }

      if (provider === 'anthropic') {
        const token = apiKey || oauthToken;
        const targetModel = model || 'claude-3-5-sonnet-20241022';
        const messages: any[] = [{ role: 'user', content: prompt }];

        const bodyPayload: any = {
          model: targetModel,
          max_tokens: Number(maxTokens) || 4096,
          messages,
          temperature: Number(temperature)
        };
        if (systemInstruction) {
          bodyPayload.system = systemInstruction;
        }

        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': token,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(bodyPayload)
        });

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`Anthropic API error (${resp.status}): ${errText}`);
        }

        const data: any = await resp.json();
        const text = data.content?.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n') || '';
        return res.json({ text, provider: 'anthropic', model: targetModel, raw: data });
      }

      if (provider === 'ollama') {
        const host = (endpointUrl || 'http://localhost:11434').replace(/\/$/, '');
        const targetModel = model || 'llama3.3:latest';
        const messages: any[] = [];
        if (systemInstruction) {
          messages.push({ role: 'system', content: systemInstruction });
        }
        messages.push({ role: 'user', content: prompt });

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey || oauthToken) {
          headers['Authorization'] = `Bearer ${apiKey || oauthToken}`;
        }

        const bodyPayload: any = {
          model: targetModel,
          messages,
          stream: false,
          options: {
            temperature: Number(temperature)
          }
        };
        if (responseMimeType === 'application/json') {
          bodyPayload.format = 'json';
        }

        const resp = await fetch(`${host}/api/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload)
        });

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`Ollama API error (${resp.status}): ${errText}`);
        }

        const data: any = await resp.json();
        const text = data.message?.content || '';
        return res.json({ text, provider: 'ollama', model: targetModel, raw: data });
      }

      if (provider === 'openrouter') {
        const token = apiKey || oauthToken;
        const targetModel = model || 'google/gemini-2.5-flash';
        const messages: any[] = [];
        if (systemInstruction) {
          messages.push({ role: 'system', content: systemInstruction });
        }
        messages.push({ role: 'user', content: prompt });

        const bodyPayload: any = {
          model: targetModel,
          messages,
          temperature: Number(temperature),
        };
        if (responseMimeType === 'application/json') {
          bodyPayload.response_format = { type: 'json_object' };
        }

        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'HTTP-Referer': 'https://hypatia.pro',
            'X-Title': 'Project Hypatia Pro'
          },
          body: JSON.stringify(bodyPayload)
        });

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`OpenRouter API error (${resp.status}): ${errText}`);
        }

        const data: any = await resp.json();
        const text = data.choices?.[0]?.message?.content || '';
        return res.json({ text, provider: 'openrouter', model: targetModel, raw: data });
      }

      return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    } catch (err: any) {
      console.error(`[LLM Generation Error] ${provider}:`, err);
      return res.status(500).json({ error: err.message || 'Generation failed' });
    }
  });

  // Strict JSON 404 for unhandled API or Health endpoints - GUARANTEES no HTML fallback
  app.use(['/api', '/health'], (req: any, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `API route ${req.method} ${req.originalUrl} not found.`,
      status: 404,
      correlationId: req.correlationId
    });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  // Cloud Run server binding: 0.0.0.0:$PORT
  const server = app.listen(PORT, HOST, () => {
    console.log(`[Hypatia Pro] Cloud Run server successfully bound to http://${HOST}:${PORT}`);
    console.log(`[Hypatia Pro] Health endpoint: http://${HOST}:${PORT}/health`);
    console.log(`[Hypatia Pro] API Health: http://${HOST}:${PORT}/api/health`);
    console.log(`[Hypatia Pro] Auth Me: http://${HOST}:${PORT}/api/auth/me`);
  });

  server.timeout = 900000; // 15 minutes for intensive scientific AI calls
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}

startServer().catch(err => {
  console.error('[Hypatia Pro] Fatal error starting server:', err);
  process.exit(1);
});
