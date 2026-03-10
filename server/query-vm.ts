import postgres from 'postgres';
const sql = postgres('postgresql://hiveclip:hiveclip@127.0.0.1:5488/postgres');
const rows = await sql`SELECT id, vultr_instance_id, admin_password FROM vms WHERE ip_address = '216.238.108.154' LIMIT 1`;
console.log('vmId:', rows[0]?.id);
console.log('vultrId:', rows[0]?.vultr_instance_id);
console.log('dbPass:', rows[0]?.admin_password);
await sql.end();
