const fs = require('fs')

try {
  const pkgPath = 'package.json'
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const ver = pkg.version || '1.0'
  const parts = ver.split('.')
  const major = parseInt(parts[0] || '1', 10)
  const minor = parseInt(parts[1] || '0', 10)
  const newMinor = minor + 1
  const newVersion = `${major}.${newMinor}`
  pkg.version = newVersion
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  console.log(`Bumped version: ${ver} -> ${newVersion}`)
} catch (err) {
  console.error('Error bumping version:', err.message)
  process.exit(1)
}
