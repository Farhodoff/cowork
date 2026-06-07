import type { Request } from "express";

// Simplified password policy for testing: min 6 characters
export function isStrongPassword(pw: string): boolean {
  if (typeof pw !== "string") return false;
  return pw.length >= 6;
}

export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 6 characters";

export function hasJsonContentType(req: Request): boolean {
  const ct = String(req.headers["content-type"] || "");
  return ct.includes("application/json");
}
