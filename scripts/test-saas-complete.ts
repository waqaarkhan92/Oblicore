/**
 * Complete SaaS Testing Script
 * Tests all major features of the EcoComply platform
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

async function test(name: string, testFn: () => Promise<boolean> | boolean, message?: string) {
  try {
    const passed = await testFn();
    results.push({ name, passed, message: message || (passed ? '✅ Passed' : '❌ Failed') });
    console.log(`${passed ? '✅' : '❌'} ${name}${message ? ': ' + message : ''}`);
  } catch (error: any) {
    results.push({ name, passed: false, message: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function runTests() {
  console.log('🧪 EcoComply SaaS Testing Suite\n');
  console.log('=' .repeat(60));
  console.log();

  // Test 1: Database Connection
  await test('Database Connection', async () => {
    const { error } = await supabase.from('users').select('count').limit(1);
    return !error;
  });

  // Test 2: Core Tables Exist
  await test('Core Tables Exist', async () => {
    const tables = [
      'users', 'companies', 'sites', 'obligations', 
      'deadlines', 'notifications', 'extraction_logs'
    ];
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (error) {
        throw new Error(`Table ${table} missing or inaccessible`);
      }
    }
    return true;
  }, 'All core tables accessible');

  // Test 3: Notification Tables
  await test('Notification Tables', async () => {
    const { error: templatesError } = await supabase
      .from('notification_templates')
      .select('count')
      .limit(1);
    
    const { error: dlqError } = await supabase
      .from('dead_letter_queue')
      .select('count')
      .limit(1);

    // These tables might not exist yet (migration not run)
    if (templatesError && dlqError) {
      return false;
    }
    return true;
  }, 'Run migration if this fails');

  // Test 4: Background Jobs Table
  await test('Background Jobs Table', async () => {
    const { error } = await supabase.from('background_jobs').select('count').limit(1);
    return !error;
  });

  // Test 5: Check for Test Data
  await test('Has Test Data', async () => {
    const { data: users } = await supabase.from('users').select('id').limit(1);
    return (users?.length || 0) > 0;
  }, 'Create test user if this fails');

  // Test 6: Notification System Files
  await test('Notification Services Exist', async () => {
    const fs = await import('fs');
    const path = await import('path');
    
    const files = [
      'lib/services/notification-preferences-service.ts',
      'lib/services/rate-limit-service.ts',
      'lib/services/escalation-service.ts',
      'lib/jobs/notification-delivery-job.ts',
    ];

    for (const file of files) {
      const filePath = path.join(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File missing: ${file}`);
      }
    }
    return true;
  });

  // Test 7: Environment Variables
  await test('Environment Variables', () => {
    const required = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'RESEND_API_KEY',
    ];
    
    const missing = required.filter(key => !process.env[key] && !process.env[`NEXT_PUBLIC_${key}`]);
    
    if (missing.length > 0) {
      throw new Error(`Missing: ${missing.join(', ')}`);
    }
    return true;
  });

  // Test 8: Redis Connection (if URL provided)
  await test('Redis Configuration', async () => {
    if (!process.env.REDIS_URL) {
      return false; // Redis optional for some features
    }
    
    try {
      const { Redis } = await import('ioredis');
      const redis = new Redis(process.env.REDIS_URL);
      await redis.ping();
      redis.disconnect();
      return true;
    } catch {
      return false;
    }
  }, 'Redis not configured (optional)');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results Summary\n');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}\n`);

  // Failed tests
  const failed = results.filter(r => !r.passed);
  if (failed.length > 0) {
    console.log('❌ Failed Tests:\n');
    failed.forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
    console.log();
  }

  // Recommendations
  console.log('💡 Recommendations:\n');
  
  if (failed.some(r => r.name.includes('Notification Tables'))) {
    console.log('   1. Run migration: See docs/MIGRATION_GUIDE.md');
  }
  
  if (failed.some(r => r.name.includes('Test Data'))) {
    console.log('   2. Create test user: npm run create-test-user');
  }
  
  if (failed.some(r => r.name.includes('Redis'))) {
    console.log('   3. Configure Redis: Set REDIS_URL environment variable');
  }

  console.log('\n📚 Next Steps:');
  console.log('   - Review: docs/COMPLETE_TESTING_GUIDE.md');
  console.log('   - Check: docs/NEXT_STEPS.md');
  console.log('   - Test manually: Follow testing guide\n');

  process.exit(failed.length > 0 ? 1 : 0);
}

runTests().catch(console.error);




