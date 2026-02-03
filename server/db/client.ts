import { Pool } from 'pg';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const isProduction = !!process.env.DATABASE_URL;

const pool = new Pool(
  isProduction
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'cyna_chat',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      }
);

export const db = {
  query: async (text: string, params?: any[]) => {
    return await pool.query(text, params);
  },
  
  getClient: async () => {
    return pool.connect();
  },
  
  end: async () => {
    await pool.end();
  },
};