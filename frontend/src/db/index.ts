import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// For edge environments or serverless, we might use a different driver, 
// but for this Docker-based setup, postgres-js is efficient.
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
