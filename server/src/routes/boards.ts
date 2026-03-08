import { Router } from "express";
import { createBoardSchema, updateBoardSchema } from "@hiveclip/shared";
import { requireAuth } from "../middleware/auth.js";
import type { Board } from "@hiveclip/shared";
export const boardsRouter = Router();
const boards: Board[] = [];
function generatePrefix(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 3).toUpperCase();
}
boardsRouter.get("/", requireAuth, (_req, res) => {
  res.json(boards.filter((b) => b.ownerId === _req.user!.id));
});
boardsRouter.post("/", requireAuth, (req, res) => {
  const data = createBoardSchema.parse(req.body);
  const board: Board = {
    id: crypto.randomUUID(), ownerId: req.user!.id, name: data.name,
    description: data.description ?? null, status: "provisioning", brandColor: null,
    issuePrefix: generatePrefix(data.name), createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(), vm: null,
  };
  boards.push(board);
  res.status(201).json(board);
});
boardsRouter.get("/:id", requireAuth, (req, res) => {
  const board = boards.find((b) => b.id === req.params.id && b.ownerId === req.user!.id);
  if (!board) { res.status(404).json({ error: "Board not found" }); return; }
  res.json(board);
});
boardsRouter.patch("/:id", requireAuth, (req, res) => {
  const data = updateBoardSchema.parse(req.body);
  const board = boards.find((b) => b.id === req.params.id && b.ownerId === req.user!.id);
  if (!board) { res.status(404).json({ error: "Board not found" }); return; }
  if (data.name) board.name = data.name;
  if (data.description !== undefined) board.description = data.description ?? null;
  if (data.brandColor !== undefined) board.brandColor = data.brandColor ?? null;
  board.updatedAt = new Date().toISOString();
  res.json(board);
});
boardsRouter.delete("/:id", requireAuth, (req, res) => {
  const idx = boards.findIndex((b) => b.id === req.params.id && b.ownerId === req.user!.id);
  if (idx === -1) { res.status(404).json({ error: "Board not found" }); return; }
  boards.splice(idx, 1);
  res.status(204).end();
});
