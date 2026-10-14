
import { Request, Response } from "express";
import { NipService } from "../services/nipService";
import { z } from "zod";

export const NipController = {
    async getHistory(req: Request, res: Response) {
        try {
            const limit = req.query.limit ? Number(req.query.limit) : undefined;
            const history = await NipService.getNipHistory(limit);
            res.json(history);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch NIP history" });
        }
    },

    async generate(req: Request, res: Response) {
        try {
            const schema = z.object({
                ddcCode: z.string().length(3),
                date: z.string(),
                sourceCode: z.string().length(1),
                formatCode: z.string(),
                wilayahCode: z.string().length(4).optional(),
                title: z.string().min(1, "Judul buku wajib diisi"),
            });

            const data = schema.parse(req.body);
            const nip = await NipService.generateNip(data);
            res.status(201).json(nip);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to generate NIP" });
        }
    },

    async deleteOne(req: Request, res: Response) {
        try {
            const id = req.params.id as string;
            await NipService.deleteNip(id);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: "Gagal menghapus NIP" });
        }
    },

    async reset(req: Request, res: Response) {
        try {
            await NipService.resetNip();
            res.json({ success: true, message: "Nomor urut NIP telah direset ke 001" });
        } catch (error) {
            res.status(500).json({ error: "Gagal mereset NIP" });
        }
    }
};
