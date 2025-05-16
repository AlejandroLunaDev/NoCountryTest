import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Verificar si el archivo .env existe
const envPath = path.resolve(process.cwd(), '.env');
const envExists = fs.existsSync(envPath);

// Cargar variables de entorno
const result = dotenv.config();

// Información de diagnóstico
console.log('Ruta del .env buscado:', envPath);
console.log('¿Existe el archivo .env?:', envExists);
console.log(
  'Resultado de dotenv.config():',
  result.error ? 'Error: ' + result.error.message : 'Cargado correctamente'
);
console.log(
  'DATABASE_URL en variables de entorno:',
  process.env.DATABASE_URL || 'No definido'
);

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:password@localhost:5432/nocountry',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_KEY || ''
};

// Imprimir la URL que se está usando
console.log('URL de base de datos que se usará:', config.databaseUrl);
