// build.js — Genera config.js con las variables de entorno de Vercel
const fs = require('fs');

const API_KEY = process.env.API_KEY || '';
const API_SECRET = process.env.API_SECRET || '';

if (!API_KEY) {
  console.warn('⚠️  WARNING: API_KEY no está definida en las variables de entorno.');
}

// Genera un archivo JS que expone las variables como globales
const configContent = `// Auto-generado por build.js — NO EDITAR
window.__ENV__ = {
  API_KEY: "${API_KEY}",
  API_SECRET: "${API_SECRET}"
};
`;

fs.writeFileSync('config.js', configContent);
console.log('✅ config.js generado correctamente.');
