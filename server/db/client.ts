import { Pool } from 'pg';
import { config } from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  config({ path: '.env.local' });
}
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // requis pour Neon / Render
      },
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'cyna_chat',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
export const db = {
  query: async (text: string, params?: any[]) => {
    const res = await pool.query(text, params);
    return res;
  },
  
  getClient: async () => {
    return pool.connect();
  },
  
  end: async () => {
    await pool.end();
  },
};