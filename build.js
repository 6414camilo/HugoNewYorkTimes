// build.js — Genera el archivo .env a partir de las variables de entorno de Vercel
const fs = require('fs');

const API_KEY = process.env.API_KEY || '';
const API_SECRET = process.env.API_SECRET || '';

if (!API_KEY) {
  console.warn('⚠️  WARNING: API_KEY no está definida en las variables de entorno.');
}

const envContent = `API_KEY=${API_KEY}\nAPI_SECRET=${API_SECRET}\n`;

fs.writeFileSync('.env', envContent);
console.log('✅ .env generado correctamente.');
