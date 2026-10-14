import { Request, Response, NextFunction } from "express";
import { auth } from "../auth";
import { fromNodeHeaders } from "better-auth/node";

// Extend Express Request to include user info
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                name: string;
                email: string;
                role?: string;
                status?: string;
                isReviewer?: boolean;
                isSuperAdmin?: boolean;
            };
        }
    }
}

/**
 * Auth middleware that extracts user from Better Auth session.
 * Attaches user info to req.user for downstream handlers.
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (session?.user) {
            const role = (session.user as any).role || "personil";
            const isReviewer = (session.user as any).isReviewer === true || role === "admin" || role === "reviewer";
            const isSuperAdmin = role === "admin";

            req.user = {
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
                role,
                status: (session.user as any).status || "pending",
                isReviewer,
                isSuperAdmin,
            };
        }
    } catch (e) {
        // No valid session — that's okay for some routes
    }

    next();
}

/**
 * Middleware that requires authentication.
 * Returns 401 if no valid session.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

/**
 * Middleware that requires Super Admin role (role === 'admin').
 * Strictly used for user management, role elevation, and system-level privileges.
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    if (!req.user.isSuperAdmin) {
        return res.status(403).json({ error: "Forbidden: Super Administrator access required" });
    }
    next();
}

/**
 * Middleware that requires admin role (Super Admin).
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    return requireSuperAdmin(req, res, next);
}

/**
 * Middleware that requires reviewer rights (Super Admin OR isReviewer === true).
 */
export function requireReviewerOrAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    if (!req.user.isReviewer) {
        return res.status(403).json({ error: "Forbidden: Reviewer or Admin access required" });
    }
    next();
}

/**
 * Middleware that requires staff role (admin, personil, pegawai, reviewer).
 */
export function requirePJOrAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const isStaff = req.user.role === "admin" || req.user.role === "personil" || req.user.role === "pegawai" || req.user.role === "reviewer";
    if (!isStaff) {
        return res.status(403).json({ error: "Forbidden: Staff access required" });
    }
    next();
}
