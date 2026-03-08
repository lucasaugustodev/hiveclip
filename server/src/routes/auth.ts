import { Router } from "express";
import bcrypt from "bcryptjs";
import { loginSchema, registerSchema } from "@hiveclip/shared";
import { signToken, requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

// In-memory store for now (will be replaced with DB)
const users: Array<{ id: string; email: string; passwordHash: string; displayName: string | null; role: string; createdAt: string }> = [];

authRouter.post("/register", async (req, res) => {
  const data = registerSchema.parse(req.body);
  if (users.find((u) => u.email === data.email)) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = {
    id: crypto.randomUUID(),
    email: data.email,
    passwordHash,
    displayName: data.displayName ?? null,
    role: users.length === 0 ? "admin" : "user",
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.status(201).json({ token, user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, createdAt: user.createdAt } });
});

authRouter.post("/login", async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = users.find((u) => u.email === data.email);
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.json({ token, user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, createdAt: user.createdAt } });
});

authRouter.get("/me", requireAuth, (req, res) => {
  const user = users.find((u) => u.id === req.user!.id);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: user.id, email: user.email, displayName: user.displayName, role: user.role, createdAt: user.createdAt });
});
