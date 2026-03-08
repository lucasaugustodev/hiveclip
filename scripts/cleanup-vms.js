const pg = require("postgres");
const sql = pg("postgresql://hiveclip:hiveclip@localhost:5488/postgres");

async function main() {
  const toDelete = await sql`SELECT id, vultr_instance_id, ip_address FROM vms WHERE provisioning_step IS NULL OR provisioning_step = 'error'`;
  console.log("VMs to delete:", toDelete.length);

  const key = process.env.VULTR_API_KEY || "";
  for (const vm of toDelete) {
    console.log(`Deleting Vultr instance ${vm.vultr_instance_id} (${vm.ip_address})...`);
    try {
      const res = await fetch(`https://api.vultr.com/v2/instances/${vm.vultr_instance_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${key}` },
      });
      console.log(`  Vultr: ${res.status}`);
    } catch (e) {
      console.log(`  Vultr error: ${e.message}`);
    }
  }

  const deleted = await sql`DELETE FROM vms WHERE provisioning_step IS NULL OR provisioning_step = 'error'`;
  console.log(`DB rows deleted: ${deleted.count}`);

  const remaining = await sql`SELECT ip_address, provisioning_step FROM vms`;
  console.log("Remaining VMs:", remaining);

  await sql.end();
}
main();
