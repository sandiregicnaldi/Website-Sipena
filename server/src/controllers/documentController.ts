import { Request, Response } from "express";
import { DocumentService } from "../services/documentService";
import { z } from "zod";
import { writeAuditLog } from "../services/logService";

const createDocSchema = z.object({
    name: z.string().min(1),
    url: z.string().min(1),
    type: z.string().optional(),
});

export const DocumentController = {
    async getAll(req: Request, res: Response) {
        try {
            const docs = await DocumentService.getAll();
            res.json(docs);
        } catch (error) {
            console.error("DocumentController.getAll error:", error);
            res.status(500).json({ error: "Failed to fetch documents" });
        }
    },

    async create(req: Request, res: Response) {
        try {
            const data = createDocSchema.parse(req.body);
            const doc = await DocumentService.create({
                ...data,
                uploadedBy: req.user?.id,
            });
            res.status(201).json(doc);
            writeAuditLog({
                userId: req.user?.id,
                action: 'upload_document',
                target: data.name,
                targetId: doc.id,
                ipAddress: req.ip,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            console.error("DocumentController.create error:", error);
            res.status(500).json({ error: "Failed to create document" });
        }
    },

    async delete(req: Request, res: Response) {
        try {
            const id = String(req.params.id);
            await DocumentService.delete(id);
            res.json({ message: "Document deleted" });
            writeAuditLog({
                userId: req.user?.id,
                action: 'delete_document',
                targetId: id,
                ipAddress: req.ip,
            });
        } catch (error) {
            console.error("DocumentController.delete error:", error);
            res.status(500).json({ error: "Failed to delete document" });
        }
    },

    async getTrash(req: Request, res: Response) {
        try {
            const docs = await DocumentService.getDeleted();
            res.json(docs);
        } catch (error) {
            console.error("DocumentController.getTrash error:", error);
            res.status(500).json({ error: "Failed to fetch trashed documents" });
        }
    },

    async restore(req: Request, res: Response) {
        try {
            await DocumentService.restore(String(req.params.id));
            res.json({ message: "Document restored" });
        } catch (error) {
            console.error("DocumentController.restore error:", error);
            res.status(500).json({ error: "Failed to restore document" });
        }
    },

    async hardDelete(req: Request, res: Response) {
        try {
            if (req.user?.role !== 'admin') {
                return res.status(403).json({ error: "Only admins can permanently delete documents" });
            }
            await DocumentService.hardDelete(String(req.params.id));
            res.json({ message: "Document permanently deleted" });
        } catch (error) {
            console.error("DocumentController.hardDelete error:", error);
            res.status(500).json({ error: "Failed to permanently delete document" });
        }
    },
};
