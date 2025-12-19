import { config } from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not found'); process.exit(1); }

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  // Get all tables
  const { rows: tables } = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  console.log('=== EXISTING TABLES IN DATABASE ===\n');
  console.log(tables.map((t: any) => t.table_name).join('\n'));
  console.log('\nTotal: ' + tables.length + ' tables');

  // Check for specific tables from failing migrations
  const advancedTables = [
    'corrective_actions',
    'runtime_monitoring',
    'escalation_workflows',
    'recurring_tasks',
    'recurrence_trigger_rules',
    'recurrence_events',
    'permit_workflows',
    'monthly_statements',
    'condition_evidence',
    'condition_permissions',
    'consent_states',
    'regulation_thresholds',
    'evidence_gaps',
    'compliance_risk_scores'
  ];

  console.log('\n=== ADVANCED TABLES (from failing migrations) ===\n');
  for (const tableName of advancedTables) {
    const exists = tables.some((t: any) => t.table_name === tableName);
    console.log((exists ? '✅ EXISTS: ' : '❌ MISSING: ') + tableName);
  }

  // Core tables check
  const coreTables = [
    'companies', 'users', 'sites', 'user_roles',
    'documents', 'obligations', 'evidence', 'evidence_items',
    'audit_packs', 'modules', 'module_activations',
    'review_queue', 'notifications', 'webhooks'
  ];

  console.log('\n=== CORE TABLES (essential for SaaS) ===\n');
  for (const tableName of coreTables) {
    const exists = tables.some((t: any) => t.table_name === tableName);
    console.log((exists ? '✅ EXISTS: ' : '❌ MISSING: ') + tableName);
  }

  await client.end();
}

run().catch(console.error);
