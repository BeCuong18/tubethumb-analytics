import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const dirsToClean = [
  path.join(rootDir, 'dist'),
  path.join(rootDir, 'dist_electron')
];

dirsToClean.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`Cleaning ${dir}...`);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

console.log('Clean complete.');
