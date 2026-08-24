const fs = require('fs');
const path = require('path');

const pkgPath = path.resolve(__dirname, '../node_modules/whatsapp-rust-bridge/package.json');

if (fs.existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.main = './dist/index.js';
    pkg.exports = {
      '.': {
        import: './dist/index.js',
        require: './dist/index.js',
        default: './dist/index.js',
        types: './dist/index.d.ts'
      }
    };
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
    console.log('✅ Successfully patched whatsapp-rust-bridge package.json exports!');
  } catch (err) {
    console.warn('⚠️ Could not patch whatsapp-rust-bridge:', err.message);
  }
} else {
  console.log('ℹ️ whatsapp-rust-bridge not found, skipping patch.');
}
