// Read-only diagnostic: finds uploaded-file links (/media/<id>.<ext>) saved anywhere in the database
// and reports which ones have no file in the media table (those are the ones that return 404).
// Run from the server folder:  npm run check:media
import { libsql } from '../db/client.js';
import { env } from '../config/env.js';

const LINK = /\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([a-z0-9]+)/gi;
const host = env.TURSO_DATABASE_URL.startsWith('file:') ? env.TURSO_DATABASE_URL : new URL(env.TURSO_DATABASE_URL.replace('libsql:', 'https:')).host;
console.log(`Database: ${host}`);

const have = new Map();
for (const r of (await libsql.execute('select id, ext, size, chunk_count from media')).rows) have.set(r.id, r);
console.log(`Files stored in the media table: ${have.size}`);

const tables = (await libsql.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%' and name not like '\\_%' escape '\\'")).rows.map((r) => r.name).filter((n) => n !== 'media' && n !== 'media_chunks');
const refs = [];
for (const t of tables) {
    const cols = (await libsql.execute(`pragma table_info("${t}")`)).rows.filter((c) => /text|char|clob|json/i.test(c.type) || c.type === '').map((c) => c.name);
    for (const c of cols) {
        const rows = (await libsql.execute(`select rowid as rid, "${c}" as v from "${t}" where "${c}" like '%/media/%'`)).rows;
        for (const row of rows) for (const m of String(row.v).matchAll(LINK)) refs.push({ table: t, column: c, row: row.rid, id: m[1], ext: m[2] });
    }
}
const missing = refs.filter((r) => !have.has(r.id) || have.get(r.id).ext !== r.ext);
console.log(`Links to uploaded files found in content: ${refs.length}`);
if (!missing.length) console.log('All linked files exist in this database.');
else {
    console.log(`Missing (these return 404): ${missing.length}`);
    for (const m of missing) console.log(`  ${m.table}.${m.column} (row ${m.row})  ${m.id}.${m.ext}`);
}
const used = new Set(refs.map((r) => r.id));
const orphans = (await libsql.execute('select * from media')).rows.filter((r) => !used.has(r.id));
if (orphans.length) {
    console.log(`Stored files not linked from any content: ${orphans.length}`);
    for (const r of orphans) console.log(`  ${r.id}.${r.ext}  ${r.kind}  ${Math.round(r.size / 1024)} KB  name: ${r.original_name ?? '-'}  saved: ${r.created_at ?? '-'}`);
}
const broken = [...have.values()].filter((r) => Number(r.chunk_count) > 0);
if (broken.length) {
    const have2 = new Set((await libsql.execute('select media_id, count(*) n from media_chunks group by media_id')).rows.map((r) => `${r.media_id}:${r.n}`));
    const bad = broken.filter((r) => !have2.has(`${r.id}:${r.chunk_count}`));
    if (bad.length) { console.log(`Files whose pieces are incomplete: ${bad.length}`); bad.forEach((r) => console.log(`  ${r.id}.${r.ext}`)); }
}
process.exit(0);
