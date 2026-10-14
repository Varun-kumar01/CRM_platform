import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    companyId: number;
    role: string;
  };
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 32) {
      throw new Error("JWT_SECRET is not configured securely");
    }

    const payload = jwt.verify(token, secret) as JwtPayload;

    const id = Number(payload.sub);
    const companyId = Number(payload.companyId);
    const role = payload.role;

    if (
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      !Number.isSafeInteger(companyId) ||
      companyId <= 0 ||
      !["company_admin", "sales_manager", "sales_executive"].includes(role)
    ) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = { id, companyId, role };
    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}