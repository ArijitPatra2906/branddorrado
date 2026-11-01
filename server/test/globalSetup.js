import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const dbFile = resolve(process.cwd(), 'test.db');
const files = [dbFile, `${dbFile}-wal`, `${dbFile}-shm`, `${dbFile}-journal`];

export function setup() {
    for (const f of files) if (existsSync(f)) rmSync(f);
    try {
        // Safety: the URL is hard-coded to a local file, so a test run can never push the schema to Turso Cloud.
        // drizzle-kit's "turso" dialect insists on a token being present; a local file ignores it, so any non-empty placeholder works.
        execFileSync('npx', ['drizzle-kit', 'push', '--force'], {
            cwd: process.cwd(),
            encoding: 'utf8',
            stdio: 'pipe',
            env: { ...process.env, TURSO_DATABASE_URL: 'file:./test.db', TURSO_AUTH_TOKEN: 'local-file-placeholder' },
        });
    } catch (err) {
        throw new Error(`Could not create the test database schema:\n${err.stdout ?? ''}\n${err.stderr ?? ''}`);
    }
}

export function teardown() {
    for (const f of files) if (existsSync(f)) rmSync(f);
}
