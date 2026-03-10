import postgres from 'postgres';
const sql = postgres('postgresql://hiveclip:hiveclip@127.0.0.1:5488/postgres');
await sql`UPDATE vms SET admin_password = ')A5kXG*q78br(nki', provisioning_step = 'wait_boot', provisioning_progress = 0, vultr_status = 'pending', power_status = 'stopped', server_status = 'none', updated_at = NOW() WHERE ip_address = '216.238.108.154'`;
console.log('Updated password and reset provisioning status');
await sql.end();
