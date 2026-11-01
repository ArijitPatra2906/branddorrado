import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { env } from '../config/env.js';
import * as schema from './schema.js';
export const libsql = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
export const db = drizzle(libsql, { schema });
export const pingDb = async () => { await libsql.execute('select 1'); };
