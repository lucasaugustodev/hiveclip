import "dotenv/config";
import { startDb } from "./db.js";
import { users, boards, vms } from "@hiveclip/db";

async function main() {
  const { db } = await startDb();
  const allUsers = await db.select().from(users);
  console.log("Users:", allUsers.map(u => `${u.id} ${u.email}`));
  const allBoards = await db.select().from(boards);
  console.log("Boards:", allBoards.map(b => `${b.id} ${b.name} owner=${b.ownerId} status=${b.status}`));
  const allVms = await db.select().from(vms);
  console.log("VMs:", allVms.map(v => `${v.id} board=${v.boardId} ip=${v.ipAddress} step=${v.provisioningStep} pass=${v.adminPassword?.slice(0,3)}...`));
  process.exit(0);
}
main();
