import { libsql } from '../db/client.js';

async function run() {
  const target = 'https://branddorrado-api.onrender.com';
  console.log(`Updating database media URLs to point to ${target}...`);

  const r1 = await libsql.execute({
    sql: "UPDATE projects SET cover_image_url = replace(cover_image_url, 'http://localhost:4000', ?) WHERE cover_image_url LIKE '%localhost:4000%'",
    args: [target]
  });
  console.log('Updated projects cover_image_url:', r1.rowsAffected);

  const r2 = await libsql.execute({
    sql: "UPDATE projects SET video_url = replace(video_url, 'http://localhost:4000', ?) WHERE video_url LIKE '%localhost:4000%'",
    args: [target]
  });
  console.log('Updated projects video_url:', r2.rowsAffected);

  const r3 = await libsql.execute({
    sql: "UPDATE blog_posts SET featured_image_url = replace(featured_image_url, 'http://localhost:4000', ?) WHERE featured_image_url LIKE '%localhost:4000%'",
    args: [target]
  });
  console.log('Updated blog_posts featured_image_url:', r3.rowsAffected);

  const r4 = await libsql.execute({
    sql: "UPDATE blog_posts SET video_url = replace(video_url, 'http://localhost:4000', ?) WHERE video_url LIKE '%localhost:4000%'",
    args: [target]
  });
  console.log('Updated blog_posts video_url:', r4.rowsAffected);

  const r5 = await libsql.execute({
    sql: "UPDATE blog_posts SET content = replace(content, 'http://localhost:4000', ?) WHERE content LIKE '%localhost:4000%'",
    args: [target]
  });
  console.log('Updated blog_posts content:', r5.rowsAffected);

  console.log('All URLs successfully migrated!');
  libsql.close();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
