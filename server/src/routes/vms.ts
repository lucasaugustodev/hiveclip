import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
export const vmsRouter = Router();
vmsRouter.get("/boards/:boardId/vm", requireAuth, (_req, res) => {
  res.status(404).json({ error: "No VM provisioned yet" });
});
vmsRouter.post("/boards/:boardId/vm/provision", requireAuth, (_req, res) => { res.status(202).json({ message: "Provisioning started" }); });
vmsRouter.post("/boards/:boardId/vm/start", requireAuth, (_req, res) => { res.json({ message: "VM starting" }); });
vmsRouter.post("/boards/:boardId/vm/stop", requireAuth, (_req, res) => { res.json({ message: "VM stopping" }); });
vmsRouter.post("/boards/:boardId/vm/reboot", requireAuth, (_req, res) => { res.json({ message: "VM rebooting" }); });
vmsRouter.delete("/boards/:boardId/vm", requireAuth, (_req, res) => { res.status(204).end(); });
