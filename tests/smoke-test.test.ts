/**
 * SMOKE TEST - Quick verification that SaaS is working
 * 
 * This test verifies:
 * 1. Health endpoint works
 * 2. Database connection works
 * 3. Auth endpoints work (signup/login)
 * 4. One core endpoint works (companies)
 * 
 * Goal: Run in < 30 seconds to verify basic functionality
 */

import { TestClient } from './helpers/test-client';
import { supabaseAdmin } from '../../lib/supabase/server';

describe('Smoke Test - SaaS Verification', () => {
  const client = new TestClient();
  let testUser: { email: string; password: string; token?: string } = {
    email: '',
    password: 'TestPassword123!',
  };

  // Fast timeout - we want this to fail quickly if something is wrong
  jest.setTimeout(20000);

  it('1. Health endpoint should respond', async () => {
    const response = await client.get('/api/v1/health');
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toHaveProperty('status');
  });

  it('2. Database connection should work', async () => {
    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('id')
      .limit(1);
    
    // Should not error (even if no data)
    expect(error).toBeNull();
  });

  it('3. User signup should work', async () => {
    const timestamp = Date.now();
    testUser.email = `smoke_test_${timestamp}@example.com`;
    
    const response = await client.post('/api/v1/auth/signup', {
      email: testUser.email,
      password: testUser.password,
      full_name: `Smoke Test User ${timestamp}`,
      company_name: `Smoke Test Company ${timestamp}`,
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data).toHaveProperty('user');
    expect(data.data.user).toHaveProperty('id');
    
    // Try to get token from response or login
    if (data.data?.access_token) {
      testUser.token = data.data.access_token;
    } else {
      // Login to get token
      const loginResponse = await client.post('/api/v1/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        testUser.token = loginData.data?.access_token;
      }
    }
  });

  it('4. User login should work', async () => {
    if (!testUser.email) {
      throw new Error('Test user not created in previous step');
    }

    const response = await client.post('/api/v1/auth/login', {
      email: testUser.email,
      password: testUser.password,
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toHaveProperty('access_token');
    testUser.token = data.data.access_token;
  });

  it('5. Authenticated endpoint should work', async () => {
    if (!testUser.token) {
      throw new Error('No token available - previous tests may have failed');
    }

    const response = await client.get('/api/v1/companies', {
      token: testUser.token,
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toBeDefined();
  });

  it('6. Auth middleware should reject invalid token', async () => {
    const response = await client.get('/api/v1/companies', {
      token: 'invalid_token_12345',
    });

    expect(response.status).toBe(401);
  });
});




