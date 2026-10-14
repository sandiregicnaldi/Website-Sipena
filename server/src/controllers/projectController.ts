
import { Request, Response } from "express";
import { ProjectService } from "../services/projectService";
import { z } from "zod";
import { CATEGORIES } from "../data/categories";
import { writeAuditLog } from "../services/logService";

const createProjectSchema = z.object({
    title: z.string().min(3),
    category: z.string().min(1),
    type: z.string().min(1),
    description: z.string().optional(),
    gdriveLink: z.string().optional(),
    score: z.number().optional().default(0),
    pageCount: z.number().optional().default(0),
    assignMode: z.enum(['manual', 'auto']).optional().default('manual'),
    stages: z.array(z.object({
        label: z.string(),
        description: z.string().nullable().optional(),
        order: z.number(),
        pjId: z.string().optional(),
        deadline: z.string().optional(),
        status: z.enum(['draft', 'active', 'review', 'revision', 'done', 'archived']).optional(),
        progress: z.number().min(0).max(100).optional(),
        score: z.number().optional().default(0),
    })).optional(),
});


export const ProjectController = {
    async getAll(req: Request, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const isAdmin = req.user.role === 'admin' || req.user.isReviewer === true || req.user.role === 'reviewer';
            console.log(`[getAll] userId=${req.user.id}, role=${req.user.role}, isReviewer=${req.user.isReviewer}, isAdmin=${isAdmin}`);
            const projects = isAdmin
                ? await ProjectService.getAllProjects()
                : await ProjectService.getProjectsForUser(req.user.id);
            res.json(projects);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch projects" });
        }
    },

    async getOne(req: Request, res: Response) {
        try {
            const project = await ProjectService.getProjectById(String(req.params.id));
            if (!project) return res.status(404).json({ error: "Project not found" });
            res.json(project);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch project" });
        }
    },

    async getArchived(req: Request, res: Response) {
        try {
            const isAdmin = req.user?.role === 'admin' || req.user?.isReviewer === true || req.user?.role === 'reviewer';
            const userId = req.user?.id;
            const archived = await ProjectService.getArchivedProjects(isAdmin ? undefined : userId);
            res.json(archived);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch archived projects" });
        }
    },

    async create(req: Request, res: Response) {
        try {
            const data = createProjectSchema.parse(req.body);
            const project = await ProjectService.createProject({ ...data, createdBy: req.user?.id } as any);
            res.status(201).json(project);
            writeAuditLog({
                userId: req.user?.id,
                action: 'create_project',
                target: data.title,
                targetId: project.id,
                meta: { category: data.category, type: data.type },
                ipAddress: req.ip,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to create project" });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const [project] = await ProjectService.updateProject(String(req.params.id), req.body);
            res.json(project);
            writeAuditLog({
                userId: req.user?.id,
                action: 'update_project',
                target: project?.title || '—',
                targetId: project?.id || String(req.params.id),
                meta: req.body,
                ipAddress: req.ip,
            });
        } catch (error) {
            res.status(500).json({ error: "Failed to update project" });
        }
    },

    async delete(req: Request, res: Response) {
        try {
            await ProjectService.deleteProject(String(req.params.id));
            res.json({ message: "Project deleted" });
            writeAuditLog({
                userId: req.user?.id,
                action: 'delete_project',
                targetId: String(req.params.id),
                ipAddress: req.ip,
            });
        } catch (error) {
            res.status(500).json({ error: "Failed to delete project" });
        }
    },

    async getTrash(req: Request, res: Response) {
        try {
            const isAdmin = req.user?.role === 'admin';
            const userId = req.user?.id;
            const trashed = await ProjectService.getDeletedProjects(isAdmin ? undefined : userId);
            res.json(trashed);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch trashed projects" });
        }
    },

    async restore(req: Request, res: Response) {
        try {
            await ProjectService.restoreProject(String(req.params.id));
            res.json({ message: "Project restored" });
        } catch (error) {
            res.status(500).json({ error: "Failed to restore project" });
        }
    },

    async hardDelete(req: Request, res: Response) {
        try {
            if (req.user?.role !== 'admin') {
                return res.status(403).json({ error: "Only admins can permanently delete projects" });
            }
            await ProjectService.hardDeleteProject(String(req.params.id));
            res.json({ message: "Project permanently deleted" });
        } catch (error) {
            res.status(500).json({ error: "Failed to permanently delete project" });
        }
    },

    async duplicate(req: Request, res: Response) {
        try {
            const sourceId = String(req.params.id);
            const schema = z.object({ title: z.string().min(3) });
            const { title } = schema.parse(req.body);
            const newProject = await ProjectService.duplicateProject(sourceId, title, req.user?.id);
            res.status(201).json(newProject);
            writeAuditLog({
                userId: req.user?.id,
                action: 'duplicate_project',
                target: title,
                targetId: sourceId,
                ipAddress: req.ip,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Gagal menduplikasi proyek" });
        }
    }
};
