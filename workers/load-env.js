// Load environment variables using require (executes before ES6 imports)
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const currentDir = process.cwd();
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
