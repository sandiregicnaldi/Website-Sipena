import { db } from "../db";
import { auditLogs } from "../db/schema";

export type AuditAction =
    | 'login'
    | 'create_project'
    | 'update_project'
    | 'delete_project'
    | 'duplicate_project'
    | 'approve_stage'
    | 'revise_stage'
    | 'update_user'
    | 'delete_user'
    | 'update_profile'
    | 'change_password'
    | 'set_password'
    | 'upload_document'
    | 'delete_document'
    | 'claim_stage';

interface LogParams {
    userId?: string | null;
    action: AuditAction;
    target?: string;       // Human-readable name (e.g. project title, stage label)
    targetId?: string;     // ID of the affected resource
    meta?: Record<string, any>;
    ipAddress?: string;
}

/**
 * Writes an audit log entry. Runs asynchronously — does NOT block the request.
 */
export function writeAuditLog(params: LogParams): void {
    setImmediate(async () => {
        try {
            await db.insert(auditLogs).values({
                userId: params.userId || null,
                action: params.action,
                target: params.target,
                targetId: params.targetId,
                meta: params.meta || null,
                ipAddress: params.ipAddress,
                createdAt: new Date(),
            });
        } catch (e) {
            console.error("[auditLog] Failed to write log:", e);
        }
    });
}
