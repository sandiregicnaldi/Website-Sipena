
import { Router } from "express";
import { ProjectController } from "./controllers/projectController";
import { StageController } from "./controllers/stageController";
import { NipController } from "./controllers/nipController";
import { NotificationController } from "./controllers/notificationController";
import { AdminController } from "./controllers/adminController";
import { DocumentController } from "./controllers/documentController";
import { ProfileController } from "./controllers/profileController";
import { TelegramController } from "./controllers/telegramController";
import { UploadController } from "./controllers/uploadController";
import { LogController } from "./controllers/logController";
import { SettingsController } from "./controllers/settingsController";
import { RankingsController } from "./controllers/rankingsController";
import { ChatController } from "./controllers/chatController";
import { requireAdmin, requirePJOrAdmin, requireAuth } from "./middlewares/auth";
import { auth } from "./auth";
import { toNodeHandler } from "better-auth/node";

const router = Router();

// Auth Routes are now handled in index.ts directly

// Projects
router.get("/projects", ProjectController.getAll);
router.post("/projects", ProjectController.create);
router.get("/projects/archived", ProjectController.getArchived);
router.get("/projects/trash", ProjectController.getTrash);
router.post("/projects/:id/duplicate", requireAuth, ProjectController.duplicate);
router.get("/projects/:id", ProjectController.getOne);
router.patch("/projects/:id/restore", ProjectController.restore);
router.delete("/projects/:id/hard-delete", requireAdmin, ProjectController.hardDelete);
router.patch("/projects/:id", ProjectController.update);
router.delete("/projects/:id", ProjectController.delete);

// Stages
router.post("/stages", StageController.create);
router.post("/stages/:id/claim", requireAuth, StageController.claim);
router.patch("/stages/:id", StageController.update);
router.delete("/stages/:id", requireAuth, StageController.delete);
router.patch("/stages/:id/notes", requirePJOrAdmin, StageController.addNote);
router.patch("/stages/:id/request-revision", requireAuth, StageController.requestRevision);
router.patch("/stages/:id/result-link", requireAdmin, StageController.updateResultLink);
router.get("/stages/candidates-by-label", StageController.getCandidatesByLabel);
router.get("/stages/:id/candidates", StageController.getCandidates);
router.post("/stages/auto-assign-preview", requireAuth, StageController.autoAssignPreview);


// NIP
router.get("/nip/history", NipController.getHistory);
router.post("/nip/generate", NipController.generate);
router.delete("/nip/:id", NipController.deleteOne);
router.post("/nip/reset", requireAdmin, NipController.reset);

// Notifications
router.get("/notifications", NotificationController.getForUser);
router.patch("/notifications/:id/read", NotificationController.markRead);
router.patch("/notifications/read-all", NotificationController.markAllRead);

// Admin - User Management
router.get("/admin/users", requireAdmin, AdminController.getUsers);
router.patch("/admin/users/:id", requireAdmin, AdminController.updateUser);
router.post("/admin/users/:id/set-password", requireAdmin, AdminController.setPassword);
router.delete("/admin/users/:id", requireAdmin, AdminController.deleteUser);

// Admin - Logs
router.get("/admin/logs", requireAdmin, LogController.getLogs);

// Documents
router.get("/documents", DocumentController.getAll);
router.post("/documents", requireAdmin, DocumentController.create);
router.get("/documents/trash/all", DocumentController.getTrash); // Use /trash/all to avoid conflict with :id if needed, but /trash is fine since it's above :id if we put it above. Wait, /documents/:id doesn't exist for GET, so /documents/trash is fine.
router.patch("/documents/:id/restore", requireAdmin, DocumentController.restore);
router.delete("/documents/:id/hard-delete", requireAdmin, DocumentController.hardDelete);
router.delete("/documents/:id", requireAdmin, DocumentController.delete);

// Profile
router.get("/profile", requireAuth, ProfileController.getProfile);
router.patch("/profile", requireAuth, ProfileController.updateProfile);
router.patch("/profile/skills", requireAuth, ProfileController.updateSkills);
router.post("/profile/change-password", requireAuth, ProfileController.changePassword);

// Uploads
router.post("/upload", requireAuth, UploadController.uploadSingle, UploadController.handleUpload);

// Telegram
router.get("/telegram/status", requireAuth, TelegramController.getStatus);
router.get("/telegram/link-token", requireAuth, TelegramController.getLinkToken);
router.delete("/telegram/unlink", requireAuth, TelegramController.unlink);
router.post("/telegram/webhook", TelegramController.webhook); // Public — called by Telegram servers

// Settings (categories, dll) — DISIMPAN DI DATABASE, bukan localStorage
router.get("/settings/categories", requireAuth, SettingsController.getCategories);
router.put("/settings/categories", requireAdmin, SettingsController.saveCategories);
router.get("/settings/stage-deadlines", requireAuth, SettingsController.getStageDeadlines);
router.put("/settings/stage-deadlines", requireAdmin, SettingsController.saveStageDeadlines);


// Rankings — data produktivitas global, dapat diakses semua user login
router.get("/rankings/productivity", requireAuth, RankingsController.getProductivityRankings);
router.get("/rankings/workload", requireAuth, RankingsController.getWorkload);

import { 
    SipenaContentController, 
    SipenaBooksController, 
    SipenaManuscriptsController, 
    SipenaEventsController,
    SipenaAuthorsController 
} from "./controllers/sipenaController";

// Chat & Messaging
router.get("/chat/conversations", requireAuth, ChatController.getConversations);
router.post("/chat/direct", requireAuth, ChatController.getOrCreateDirectConversation);
router.post("/chat/groups", requireAuth, ChatController.createGroup);
router.delete("/chat/conversations/:id", requireAuth, ChatController.deleteConversation);
router.get("/chat/conversations/:id/messages", requireAuth, ChatController.getMessages);
router.post("/chat/conversations/:id/messages", requireAuth, ChatController.sendMessage);
router.delete("/chat/messages/:id", requireAuth, ChatController.deleteMessage);
router.get("/chat/unread-summary", requireAuth, ChatController.getUnreadSummary);
router.get("/chat/users", requireAuth, ChatController.getUsersForChat);

// ==========================================
// SIPENA ROUTES (Website Public & Admin SiPena)
// ==========================================

// Web Content (Banner, Tentang, FAQ, Panduan)
router.get("/sipena/content/:key", SipenaContentController.getSettings); // Public access
router.put("/sipena/content/:key", requirePJOrAdmin, SipenaContentController.saveSettings); // Admin only

// Katalog Buku
router.get("/sipena/books", SipenaBooksController.getAll); // Public access
router.get("/sipena/books/:id", SipenaBooksController.getOne); // Public access
router.get("/sipena/books/:id/related", SipenaBooksController.getRelated); // Public access
router.post("/sipena/books/:id/rating", requireAuth, SipenaBooksController.rate); // Logged in user only
router.post("/sipena/books/:id/download", SipenaBooksController.recordDownload); // Public or logged in
router.post("/sipena/books", requirePJOrAdmin, SipenaBooksController.create);
router.patch("/sipena/books/:id", requirePJOrAdmin, SipenaBooksController.update);
router.delete("/sipena/books/:id", requirePJOrAdmin, SipenaBooksController.delete);

// Pengajuan Naskah
router.get("/sipena/manuscripts", requirePJOrAdmin, SipenaManuscriptsController.getAll); // Admin views all
router.post("/sipena/manuscripts", requireAuth, SipenaManuscriptsController.create); // Any logged in user (penulis/pengunjung)
router.patch("/sipena/manuscripts/:id/status", requirePJOrAdmin, SipenaManuscriptsController.updateStatus);

// Kegiatan (Events)
router.get("/sipena/events", SipenaEventsController.getAll); // Public access
router.post("/sipena/events", requirePJOrAdmin, SipenaEventsController.create);
router.patch("/sipena/events/:id", requirePJOrAdmin, SipenaEventsController.update);
router.delete("/sipena/events/:id", requirePJOrAdmin, SipenaEventsController.delete);

// Penulis (Authors)
router.get("/sipena/authors", SipenaAuthorsController.getAll); // Public access
router.get("/sipena/authors/:id", SipenaAuthorsController.getOne); // Public access
router.post("/sipena/author-request", requireAuth, SipenaAuthorsController.submitRequest); // User submits verification
router.patch("/sipena/author-profile", requireAuth, SipenaAuthorsController.updateAuthorProfile); // Author updates profile

export default router;

