import postgres from 'postgres';
const sql = postgres('postgresql://postgres:postgres@127.0.0.1:5488/postgres');
const rows = await sql`SELECT id, ip_address, provisioning_step, provisioning_progress, vultr_status, power_status, server_status, updated_at FROM vms ORDER BY updated_at DESC LIMIT 5`;
for (const r of rows) console.log(JSON.stringify(r));
await sql.end();
