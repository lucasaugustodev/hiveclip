import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { VultrClient } from "@hiveclip/vultr";
import { notFound } from "../middleware/error-handler.js";

export const vmsRouter = Router();

const VULTR_API_KEY = process.env.VULTR_API_KEY || "";
const WINDOWS_OS_ID = 501; // Windows 2022 Standard x64
const DEFAULT_REGION = "sao"; // São Paulo

const vultr = new VultrClient(VULTR_API_KEY);

// In-memory VM store (boardId -> vultr instance id)
const boardVms: Map<string, string> = new Map();

vmsRouter.get("/boards/:boardId/vm", requireAuth, async (req, res) => {
  const instanceId = boardVms.get(req.params.boardId);
  if (!instanceId) {
    res.status(404).json({ error: "No VM provisioned yet" });
    return;
  }
  try {
    const instance = await vultr.getInstance(instanceId);
    res.json({
      id: instance.id,
      boardId: req.params.boardId,
      vultrInstanceId: instance.id,
      region: instance.region,
      plan: instance.plan,
      os: instance.os,
      ipAddress: instance.main_ip,
      hostname: instance.label,
      status: instance.status,
      powerStatus: instance.power_status,
      serverStatus: instance.server_status,
      defaultPassword: instance.default_password,
      createdAt: instance.date_created,
    });
  } catch (err: any) {
    res.status(502).json({ error: `Failed to fetch VM: ${err.message}` });
  }
});

vmsRouter.post("/boards/:boardId/vm/provision", requireAuth, async (req, res) => {
  const { boardId } = req.params;
  if (boardVms.has(boardId)) {
    res.status(409).json({ error: "VM already provisioned for this board" });
    return;
  }

  try {
    // Find best plan for Windows
    const plan = await vultr.getBestWindowsPlan(DEFAULT_REGION);
    if (!plan) {
      res.status(500).json({ error: "No suitable plan found" });
      return;
    }

    const instance = await vultr.createInstance({
      label: `hiveclip-${boardId.slice(0, 8)}`,
      region: DEFAULT_REGION,
      plan: plan.id,
      os_id: WINDOWS_OS_ID,
      hostname: `hc-${boardId.slice(0, 8)}`,
    });

    boardVms.set(boardId, instance.id);

    res.status(202).json({
      message: "VM provisioning started",
      instanceId: instance.id,
      plan: plan.id,
      region: DEFAULT_REGION,
      monthlyCost: plan.monthly_cost,
      ram: plan.ram,
      vcpus: plan.vcpu_count,
    });
  } catch (err: any) {
    res.status(502).json({ error: `Provisioning failed: ${err.message}` });
  }
});

vmsRouter.post("/boards/:boardId/vm/start", requireAuth, async (req, res) => {
  const instanceId = boardVms.get(req.params.boardId);
  if (!instanceId) throw notFound("No VM for this board");
  try {
    await vultr.startInstance(instanceId);
    res.json({ message: "VM starting" });
  } catch (err: any) {
    res.status(502).json({ error: `Start failed: ${err.message}` });
  }
});

vmsRouter.post("/boards/:boardId/vm/stop", requireAuth, async (req, res) => {
  const instanceId = boardVms.get(req.params.boardId);
  if (!instanceId) throw notFound("No VM for this board");
  try {
    await vultr.stopInstance(instanceId);
    res.json({ message: "VM stopping" });
  } catch (err: any) {
    res.status(502).json({ error: `Stop failed: ${err.message}` });
  }
});

vmsRouter.post("/boards/:boardId/vm/reboot", requireAuth, async (req, res) => {
  const instanceId = boardVms.get(req.params.boardId);
  if (!instanceId) throw notFound("No VM for this board");
  try {
    await vultr.rebootInstance(instanceId);
    res.json({ message: "VM rebooting" });
  } catch (err: any) {
    res.status(502).json({ error: `Reboot failed: ${err.message}` });
  }
});

vmsRouter.delete("/boards/:boardId/vm", requireAuth, async (req, res) => {
  const instanceId = boardVms.get(req.params.boardId);
  if (!instanceId) throw notFound("No VM for this board");
  try {
    await vultr.deleteInstance(instanceId);
    boardVms.delete(req.params.boardId);
    res.status(204).end();
  } catch (err: any) {
    res.status(502).json({ error: `Delete failed: ${err.message}` });
  }
});
