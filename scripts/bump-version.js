#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const pkgPath = path.join(cwd, 'package.json');

console.log('Working directory:', cwd);
console.log('Looking for package.json at:', pkgPath);

if (!fs.existsSync(pkgPath)) {
  console.error('Error: package.json not found at', pkgPath);
  process.exit(1);
}

try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const oldVer = pkg.version || '1.0';
  const parts = oldVer.split('.');
  const major = parseInt(parts[0], 10) || 1;
  const minor = parseInt(parts[1], 10) || 0;
  const newVersion = `${major}.${minor + 1}`;
  
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ Bumped version: ${oldVer} -> ${newVersion}`);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
