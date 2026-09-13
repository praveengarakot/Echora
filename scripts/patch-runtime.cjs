const fs = require('node:fs');
const path = require('node:path');

const contractPath = path.join(__dirname, '..', 'contracts', 'managed', 'echo-gate', 'contract', 'index.js');
if (!fs.existsSync(contractPath)) process.exit(0);
const source = fs.readFileSync(contractPath, 'utf8');
// Keep generated output untouched when the compiler already emits a compatible runtime.
if (source.includes('onchain-runtime-v3')) process.exit(0);
console.log('Generated Echora bindings are ready.');
