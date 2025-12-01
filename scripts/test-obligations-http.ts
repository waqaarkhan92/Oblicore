/**
 * Test script to check obligations API via HTTP
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/v1`;

async function testObligationsHTTP() {
  console.log('🔍 Testing Obligations API via HTTP...\n');
  console.log('Base URL:', API_BASE);

  // First, get auth token (we'll need to login or use a test token)
  // For now, let's try without auth to see what error we get
  const documentId = 'bced4779-96cf-4ef7-b8d6-240e1ac367b7'; // From previous test

  console.log(`\n📡 Calling GET ${API_BASE}/documents/${documentId}/obligations`);

  try {
    const response = await fetch(`${API_BASE}/documents/${documentId}/obligations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('\n📦 Response body:');
    console.log(JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ API call successful!');
      console.log('  Data type:', typeof data.data);
      console.log('  Data is array:', Array.isArray(data.data));
      console.log('  Data count:', Array.isArray(data.data) ? data.data.length : 'not an array');
      console.log('  Pagination:', data.pagination);
      console.log('  Meta:', data.meta);
    } else {
      console.log('\n❌ API call failed!');
      console.log('  Error:', data.error);
    }
  } catch (error: any) {
    console.error('\n❌ Request failed:', error.message);
    console.error('  Stack:', error.stack);
  }
}

testObligationsHTTP().catch(console.error);

