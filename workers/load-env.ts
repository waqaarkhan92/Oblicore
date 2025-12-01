/**
 * Load environment variables before any other imports
 * This must be imported FIRST in workers/index.ts
 * Uses require() to ensure synchronous execution before ES6 imports
 */

// Use require() which executes synchronously (not hoisted like ES6 imports)
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Get current directory
const currentDir = process.cwd();

// Try multiple possible paths for .env.local
const envPaths = [
  path.resolve(currentDir, '.env.local'),
  path.resolve(currentDir, '..', '.env.local'),
  '.env.local',
];

let loaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.log(`✅ Loaded environment from: ${envPath}`);
      loaded = true;
      break;
    }
  }
}

if (!loaded) {
  console.warn('⚠️ .env.local not found, using system environment variables');
}


