import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
export const vmsRouter = Router();
vmsRouter.get("/boards/:boardId/vm", requireAuth, (req, res) => {
  res.json({ id: null, boardId: req.params.boardId, vultrInstanceId: null, region: "ewr", plan: "vc2-2c-4gb", os: "Windows Server 2022", ipAddress: null, vncPort: 5900, paperclipPort: 3100, vultrStatus: null, powerStatus: null, serverStatus: null, paperclipHealthy: false, vncHealthy: false, provisioningStep: null, provisioningProgress: 0, provisioningTotal: 12, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
});
vmsRouter.post("/boards/:boardId/vm/provision", requireAuth, (_req, res) => { res.status(202).json({ message: "Provisioning started" }); });
vmsRouter.post("/boards/:boardId/vm/start", requireAuth, (_req, res) => { res.json({ message: "VM starting" }); });
vmsRouter.post("/boards/:boardId/vm/stop", requireAuth, (_req, res) => { res.json({ message: "VM stopping" }); });
vmsRouter.post("/boards/:boardId/vm/reboot", requireAuth, (_req, res) => { res.json({ message: "VM rebooting" }); });
vmsRouter.delete("/boards/:boardId/vm", requireAuth, (_req, res) => { res.status(204).end(); });
