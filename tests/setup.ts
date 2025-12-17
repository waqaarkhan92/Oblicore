/**
 * Global Test Setup
 * Runs once before all tests
 */

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Node environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock environment variables
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-key';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
// @ts-ignore - Setting NODE_ENV for tests
process.env.NODE_ENV = 'test';

// Suppress console logs in tests (unless debugging)
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}

// Global test timeout
jest.setTimeout(30000);
