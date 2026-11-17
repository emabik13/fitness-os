#!/usr/bin/env node
/**
 * Builds the installable web app (PWA) into dist/.
 *   EXPO_PUBLIC_BASE_URL=/fitness-os node scripts/build-web.js   (GitHub Pages)
 *   node scripts/build-web.js                                    (served at domain root)
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const base = (process.env.EXPO_PUBLIC_BASE_URL || '').replace(/\/$/, '');
const out = path.resolve(__dirname, '..', 'dist');
const buildId = Date.now().toString(36);

execSync('npx expo export --platform web --output-dir dist --clear', {
  stdio: 'inherit',
  env: { ...process.env, EXPO_PUBLIC_BASE_URL: base },
});

for (const file of ['index.html', 'manifest.json', 'sw.js']) {
  const p = path.join(out, file);
  const s = fs.readFileSync(p, 'utf8').replaceAll('%BASE_URL%', base).replaceAll('%BUILD_ID%', buildId);
  fs.writeFileSync(p, s);
}
// Static hosts without SPA rewrites (GitHub Pages) serve 404.html for deep links.
fs.copyFileSync(path.join(out, 'index.html'), path.join(out, '404.html'));
// Disable Jekyll on GitHub Pages so the `_expo/` folder is published.
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`\nPWA lista en dist/ (base "${base || '/'}", build ${buildId})`);
