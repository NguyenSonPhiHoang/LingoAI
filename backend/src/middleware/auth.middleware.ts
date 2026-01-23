import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { RoleRepository } from "../repositories/role.repository";

export interface AuthRequest extends Request {
  user?: any;
}

export function authenticateJWT(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ error: "unauthorized" });
  const token = auth.substring(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as any;
    req.user = payload;
    next();
  } catch (err: any) {
    // Log verification error for debugging
    console.error(
      "JWT verification failed:",
      err && err.message ? err.message : err
    );
    return res.status(401).json({ error: "invalid token" });
  }
}

// Alias for authenticateJWT
export const requireAuth = authenticateJWT;

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const roleId = req.user?.roleId;
    if (!roleId) return res.status(403).json({ error: "forbidden" });
    // allowedRoles are role names or role ids; assume role ids passed like 'role_admin'
    if (allowedRoles.includes(roleId)) return next();
    return res.status(403).json({ error: "forbidden" });
  };
}

// Middleware to check role by name (Admin, Teacher, Student)
export function requireRole(...allowedRoleNames: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const roleId = req.user?.roleId;
    if (!roleId) return res.status(403).json({ error: "forbidden - no role" });

    try {
      const role = await RoleRepository.findById(roleId);
      if (!role)
        return res.status(403).json({ error: "forbidden - role not found" });

      // Check if user's role name is in allowed list (case insensitive)
      const userRoleName = role.name.toLowerCase();
      const allowed = allowedRoleNames.some(
        (r) => r.toLowerCase() === userRoleName
      );

      if (allowed) return next();
      return res
        .status(403)
        .json({ error: "forbidden - insufficient permissions" });
    } catch (err) {
      console.error("Role check error:", err);
      return res.status(500).json({ error: "role check failed" });
    }
  };
}
