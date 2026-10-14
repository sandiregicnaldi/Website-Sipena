import { db } from "../db";
import { documents } from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const DocumentService = {
    async getAll() {
        return await db.query.documents.findMany({
            where: sql`${documents.deletedAt} IS NULL`,
            orderBy: (documents, { desc }) => [desc(documents.createdAt)],
        });
    },

    async create(data: { name: string; url: string; type?: string; uploadedBy?: string }) {
        const [doc] = await db
            .insert(documents)
            .values({
                name: data.name,
                url: data.url,
                type: data.type || "pdf",
                uploadedBy: data.uploadedBy || null,
            })
            .returning();
        return doc;
    },

    // Soft delete
    async delete(id: string) {
        return await db.update(documents).set({ deletedAt: new Date() }).where(eq(documents.id, id));
    },

    // Hard delete
    async hardDelete(id: string) {
        return await db.delete(documents).where(eq(documents.id, id));
    },

    // Restore
    async restore(id: string) {
        return await db.update(documents).set({ deletedAt: null }).where(eq(documents.id, id));
    },

    // Get deleted documents (Trash)
    async getDeleted() {
        return await db.query.documents.findMany({
            where: sql`${documents.deletedAt} IS NOT NULL`,
            orderBy: (documents, { desc }) => [desc(documents.deletedAt)],
        });
    },

    // Auto clean trash > 30 days
    async autoCleanTrash() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const deletedDocs = await db.query.documents.findMany({
            where: sql`${documents.deletedAt} < ${thirtyDaysAgo}`,
            columns: { id: true, name: true }
        });
        for (const doc of deletedDocs) {
            await this.hardDelete(doc.id);
            console.log(`[Auto-Trash] Hard deleted document ${doc.id} (${doc.name}) - in trash > 30 days.`);
        }
    }
};
