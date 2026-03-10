import postgres from 'postgres';
const sql = postgres('postgresql://hiveclip:hiveclip@127.0.0.1:5488/postgres');
const rows = await sql`SELECT admin_password FROM vms WHERE ip_address = '216.238.108.154' LIMIT 1`;
console.log('pass length:', rows[0]?.admin_password?.length);
await sql.end();
