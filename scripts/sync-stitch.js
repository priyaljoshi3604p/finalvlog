import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('----------------------------------------------------');
console.log('   Google Stitch SDK Sync & Asset Exporter Script   ');
console.log('----------------------------------------------------');

const apiKey = process.env.STITCH_API_KEY;
const projectId = process.env.STITCH_PROJECT_ID;

if (!apiKey || apiKey === 'your_stitch_api_key_here') {
  console.warn('\n[!] Warning: STITCH_API_KEY is not configured in your .env file.');
  console.log('    To connect to Google Stitch:');
  console.log('    1. Open or create the ".env" file in your project root.');
  console.log('    2. Add: STITCH_API_KEY=your_actual_api_key');
  console.log('    3. Add: STITCH_PROJECT_ID=your_actual_project_id');
  console.log('    4. Run "npm run sync" again.\n');
  console.log('--> Using fallback design specs and assets for local preview.\n');
  process.exit(0);
}

try {
  console.log(`[+] Initializing Google Stitch SDK with API Key...`);
  const { stitch } = await import('@google/stitch-sdk');
  
  if (projectId && projectId !== 'your_stitch_project_id_or_name') {
    console.log(`[+] Fetching screens and assets for Stitch Project: ${projectId}`);
    const outputDir = path.join(projectRoot, 'assets', 'stitch');
    
    // Download assets using Stitch SDK Project class
    const project = stitch.project(projectId);
    if (project && typeof project.downloadAssets === 'function') {
      const trace = await project.downloadAssets(outputDir);
      console.log(`[✓] Successfully downloaded Stitch assets to: ${outputDir}`);
      console.log(`[✓] Download Trace Count: ${trace ? trace.length : 0}`);
    } else {
      console.log('[+] Fetching project metadata from Stitch...');
      const projects = await stitch.projects();
      console.log(`[✓] Found ${projects.length} available Stitch project(s).`);
    }
  } else {
    console.log('[+] Listing available Stitch Projects for your API key...');
    const projects = await stitch.projects();
    console.log('[✓] Connected to Stitch API successfully!');
    console.log('Available Projects:', projects.map(p => ({ id: p.id, name: p.name })));
  }
} catch (error) {
  console.error('[X] Error communicating with Stitch API:', error.message || error);
  console.log('--> Continuing with local visual rendering.');
}
