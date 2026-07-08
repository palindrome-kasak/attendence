import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
const backendUrl = (process.env.BACKEND_URL || '').replace(/\/$/, '');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const lines = [];

if (backendUrl) {
  lines.push(`/api/*  ${backendUrl}/api/:splat  200!`);
  lines.push(`/uploads/*  ${backendUrl}/uploads/:splat  200!`);
} else {
  console.warn(
    'BACKEND_URL is not set — API proxy redirects skipped. Set BACKEND_URL in Netlify env vars.'
  );
}

lines.push('/*  /index.html  200');

fs.writeFileSync(path.join(publicDir, '_redirects'), `${lines.join('\n')}\n`);
console.log('Generated Netlify _redirects');
