import { Router } from "express";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { notFound } from "../middleware/error-handler.js";
import { vms } from "@hiveclip/db";
import { VultrClient } from "@hiveclip/vultr";
import type { Db } from "../app.js";

const VULTR_API_KEY = process.env.VULTR_API_KEY || "";
const WINDOWS_OS_ID = 501; // Windows 2022 Standard x64
const DEFAULT_REGION = "sao"; // São Paulo
const WINDOWS_PLAN = "vc2-2c-4gb"; // 2 vCPUs, 4GB RAM, $20/mo
const STARTUP_SCRIPT_ID = "d2f602f1-11fa-4cf2-bc4f-e90998926898"; // Installs TightVNC + WinRM

const vultr = new VultrClient(VULTR_API_KEY);

export function createVmsRouter(db: Db) {
  const router = Router();

  router.get("/boards/:boardId/vm", requireAuth, async (req, res) => {
    const [vm] = await db.select().from(vms).where(eq(vms.boardId, req.params.boardId)).limit(1);
    if (!vm) {
      res.status(404).json({ error: "No VM provisioned yet" });
      return;
    }
    // Refresh status from Vultr if we have an instance ID
    if (vm.vultrInstanceId) {
      try {
        const instance = await vultr.getInstance(vm.vultrInstanceId);
        await db.update(vms).set({
          ipAddress: instance.main_ip !== "0.0.0.0" ? instance.main_ip : vm.ipAddress,
          vultrStatus: instance.status,
          powerStatus: instance.power_status,
          serverStatus: instance.server_status,
          updatedAt: new Date(),
        }).where(eq(vms.id, vm.id));
        vm.ipAddress = instance.main_ip !== "0.0.0.0" ? instance.main_ip : vm.ipAddress;
        vm.vultrStatus = instance.status;
        vm.powerStatus = instance.power_status;
        vm.serverStatus = instance.server_status;
      } catch { /* use cached data */ }
    }
    res.json(vm);
  });

  router.post("/boards/:boardId/vm/provision", requireAuth, async (req, res) => {
    const { boardId } = req.params;
    const existing = await db.select().from(vms).where(eq(vms.boardId, boardId)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "VM already provisioned for this board" });
      return;
    }

    try {
      const instance = await vultr.createInstance({
        label: `hiveclip-${boardId.slice(0, 8)}`,
        region: DEFAULT_REGION,
        plan: WINDOWS_PLAN,
        os_id: WINDOWS_OS_ID,
        hostname: `hc-${boardId.slice(0, 8)}`,
        script_id: STARTUP_SCRIPT_ID,
      });

      const [vm] = await db.insert(vms).values({
        boardId,
        vultrInstanceId: instance.id,
        region: DEFAULT_REGION,
        plan: WINDOWS_PLAN,
        os: "Windows 2022 Standard",
        hostname: instance.label,
        adminPassword: instance.default_password,
        vultrStatus: instance.status,
        powerStatus: instance.power_status,
        serverStatus: instance.server_status,
      }).returning();

      res.status(202).json({
        message: "VM provisioning started",
        vm,
      });
    } catch (err: any) {
      res.status(502).json({ error: `Provisioning failed: ${err.message}` });
    }
  });

  router.post("/boards/:boardId/vm/start", requireAuth, async (req, res) => {
    const [vm] = await db.select().from(vms).where(eq(vms.boardId, req.params.boardId)).limit(1);
    if (!vm?.vultrInstanceId) throw notFound("No VM for this board");
    try {
      await vultr.startInstance(vm.vultrInstanceId);
      res.json({ message: "VM starting" });
    } catch (err: any) {
      res.status(502).json({ error: `Start failed: ${err.message}` });
    }
  });

  router.post("/boards/:boardId/vm/stop", requireAuth, async (req, res) => {
    const [vm] = await db.select().from(vms).where(eq(vms.boardId, req.params.boardId)).limit(1);
    if (!vm?.vultrInstanceId) throw notFound("No VM for this board");
    try {
      await vultr.stopInstance(vm.vultrInstanceId);
      res.json({ message: "VM stopping" });
    } catch (err: any) {
      res.status(502).json({ error: `Stop failed: ${err.message}` });
    }
  });

  router.post("/boards/:boardId/vm/reboot", requireAuth, async (req, res) => {
    const [vm] = await db.select().from(vms).where(eq(vms.boardId, req.params.boardId)).limit(1);
    if (!vm?.vultrInstanceId) throw notFound("No VM for this board");
    try {
      await vultr.rebootInstance(vm.vultrInstanceId);
      res.json({ message: "VM rebooting" });
    } catch (err: any) {
      res.status(502).json({ error: `Reboot failed: ${err.message}` });
    }
  });

  router.delete("/boards/:boardId/vm", requireAuth, async (req, res) => {
    const [vm] = await db.select().from(vms).where(eq(vms.boardId, req.params.boardId)).limit(1);
    if (!vm?.vultrInstanceId) throw notFound("No VM for this board");
    try {
      await vultr.deleteInstance(vm.vultrInstanceId);
      await db.delete(vms).where(eq(vms.id, vm.id));
      res.status(204).end();
    } catch (err: any) {
      res.status(502).json({ error: `Delete failed: ${err.message}` });
    }
  });

  return router;
}
