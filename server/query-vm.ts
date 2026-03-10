import postgres from 'postgres';
const sql = postgres('postgresql://hiveclip:hiveclip@127.0.0.1:5488/postgres');
const rows = await sql`SELECT id, board_id, vultr_instance_id, admin_password, provisioning_step FROM vms WHERE ip_address = '216.238.108.154' LIMIT 1`;
console.log(JSON.stringify(rows[0]));
await sql.end();
