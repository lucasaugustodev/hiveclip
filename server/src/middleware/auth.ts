import type { Request, Response, NextFunction } from "express";
import { supabase } from "../supabase.js";
import { unauthorized } from "./error-handler.js";

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) throw unauthorized("Missing auth token");

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw unauthorized("Invalid token");

  req.user = { id: user.id, email: user.email!, role: user.user_metadata?.role || "user" };
  next();
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        req.user = { id: user.id, email: user.email!, role: user.user_metadata?.role || "user" };
      }
    } catch { /* ignore */ }
  }
  next();
}
