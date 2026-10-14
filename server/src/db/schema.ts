
import { pgTable, text, timestamp, boolean, uuid, integer, jsonb, date, varchar, serial, doublePrecision, uniqueIndex } from "drizzle-orm/pg-core";

// Global application settings (persisted to DB, not localStorage)
export const appSettings = pgTable("app_settings", {
    key: text("key").primaryKey(),   // e.g. 'categories', 'ddc_list'
    value: jsonb("value").notNull(), // JSON value
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Users (Managed by Better Auth with extensions)
export const users = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),

    // Custom fields
    role: text("role").default("personil"), // 'admin' | 'personil' | 'pengunjung' | 'calon_penulis' | 'penulis'
    status: text("status").default("pending"), // 'pending' | 'active' | 'disabled'
    isReviewer: boolean("is_reviewer").default(false), // Hak khusus review tahapan di Manajemen Penerbitan
    avatarInitials: varchar("avatar_initials", { length: 2 }),
    skills: jsonb("skills").$type<string[]>(), // Array of skills
    telegramChatId: text("telegram_chat_id"),         // Telegram chat ID setelah link
    telegramLinkToken: text("telegram_link_token"),   // Token sementara untuk proses linking
    phone: text("phone"),
    bio: text("bio"), // Bio profil penulis
    
    // SiPena Registration Fields
    tempatLahir: text("tempat_lahir"),
    tanggalLahir: text("tanggal_lahir"),
    pekerjaan: text("pekerjaan"),
    instansi: text("instansi"),
    alamatLengkap: text("alamat_lengkap"),
    provinsi: text("provinsi"),
    kota: text("kota"),
    kecamatan: text("kecamatan"),
    kelurahan: text("kelurahan"),
    website: text("website"),
    karyaEksternal: jsonb("karya_eksternal").$type<{id: number, judul: string, penerbit: string, tahun: string, url: string}[]>(),
});

export const sessions = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => users.id),
});

export const accounts = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => users.id),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
});

export const verifications = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
});

// Projects
export const projects = pgTable("projects", {
    id: text("id").primaryKey(), // PRJ-YYYY-XXXX
    title: text("title").notNull(),
    category: text("category").notNull(), // 'terbitan', 'medsos', etc.
    type: text("type"), // 'reguler', etc.
    workflowType: text("workflow_type").default("sequential"), // 'sequential', 'parallel'
    status: text("status").default("active"), // 'active', 'archived'
    createdBy: text("created_by"), // userId of creator
    gdriveLink: text("gdrive_link"),
    score: doublePrecision("score").default(0),
    pageCount: integer("page_count").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    deletedAt: timestamp("deleted_at"), // Soft delete field
});

// Stages
export const stages = pgTable("stages", {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: text("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    label: text("label").notNull(),
    description: text("description"), // Deskripsi / instruksi detail pekerjaan
    order: integer("order").notNull(),
    status: text("status").default("draft"), // 'draft', 'active', 'review', 'revision', 'done', 'archived'
    pjId: text("pj_id").references(() => users.id), // Nullable
    coPjId: text("co_pj_id").references(() => users.id), // Nullable, rekan kerja tambahan (legacy fallback)
    coPjIds: jsonb("co_pj_ids").$type<string[]>().default([]), // Array of user IDs (maksimal 2 kolaborator)
    deadline: timestamp("deadline"),
    progress: integer("progress").default(0),
    resultLink: text("result_link"),
    score: doublePrecision("score").default(0),
    notes: jsonb("notes").$type<{ from: string, text: string, time: string, attachment?: string }[]>(), // Array of chat notes
    revisionReason: text("revision_reason"), // Alasan terakhir revisi
    revisionCount: integer("revision_count").default(0), // Jumlah revisi yang pernah terjadi
    approvedAt: timestamp("approved_at"),   // Timestamp saat status berubah ke 'done'
    revisedAt: timestamp("revised_at"),     // Timestamp saat revisi terakhir diminta
    reviewerId: text("reviewer_id").references(() => users.id), // Admin yang menyetujui tahapan ini
    proposalStatus: text("proposal_status"), // 'pending', 'accepted', 'rejected'
});

// Notifications
export const notifications = pgTable("notifications", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => users.id), // Nullable (if null, system-wide/admin)
    type: text("type").notNull(), // 'project_created', 'assigned', etc.
    title: text("title").notNull(),
    message: text("message").notNull(),
    isRead: boolean("is_read").default(false),
    projectId: text("project_id").references(() => projects.id, { onDelete: 'cascade' }),
    createdAt: timestamp("created_at").defaultNow(),
});

// Documents
export const documents = pgTable("documents", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    type: text("type").default("pdf"),
    uploadedBy: text("uploaded_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    deletedAt: timestamp("deleted_at"), // Soft delete field
});

// Audit Log — aktivitas pengguna
export const auditLogs = pgTable("audit_log", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: 'set null' }),
    action: text("action").notNull(), // 'login', 'create_project', 'delete_project', 'update_user', 'delete_user', 'approve_stage', 'revise_stage', 'update_profile', 'change_password', 'upload_document', 'delete_document'
    target: text("target"),          // e.g. project title, stage label, user name
    targetId: text("target_id"),     // e.g. projectId, stageId, userId
    meta: jsonb("meta"),             // extra info (reason, old/new values, etc.)
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").defaultNow(),
});

// NIP History
export const nipRecords = pgTable("nip_records", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    barcode: text("barcode").notNull().unique(), // e.g. 370202602K1001C
    visualFormat: text("visual_format").notNull(), // e.g. 370 - 202602 - K1 - 001 - C
    title: text("title"), // Judul Buku
    ddcCode: text("ddc_code").notNull(),
    ddcLabel: text("ddc_label"),
    yearMonth: text("year_month").notNull(), // YYYYMM
    formattedDate: text("formatted_date"), // DD/MM/YYYY
    sourceCode: text("source_code").notNull(),
    serialNumber: integer("serial_number").notNull(),
    formatCode: text("format_code").notNull(),
    wilayahCode: text("wilayah_code"), // 4 digit: 2 provinsi + 2 kab
    createdAt: timestamp("created_at").defaultNow(),
});
// ---- SiPena Tables ----
export const books = pgTable("books", {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    authorId: text("author_id").references(() => users.id, { onDelete: 'set null' }),
    authorName: text("author_name"), // Fallback if author is not a registered user
    year: integer("year"),
    isbn: text("isbn"),
    isbnDigital: text("isbn_digital"),
    coverUrl: text("cover_url"),
    fileUrl: text("file_url"), // PDF/EPUB link
    audioUrl: text("audio_url"),
    category: text("category"),
    synopsis: text("synopsis"),
    ratingAvg: doublePrecision("rating_avg").default(0),
    ratingCount: integer("rating_count").default(0),
    downloadCount: integer("download_count").default(0),
    status: text("status").default("published"), // 'draft' | 'published' | 'archived'
    projectId: text("project_id").references(() => projects.id, { onDelete: 'set null' }), // Link to publishing project
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const bookRatings = pgTable("book_ratings", {
    id: uuid("id").defaultRandom().primaryKey(),
    bookId: uuid("book_id").references(() => books.id, { onDelete: 'cascade' }).notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
    rating: integer("rating").notNull(), // 1 - 5
    review: text("review"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
    uniqueIndex("unique_user_book_rating").on(table.bookId, table.userId),
]);

export const bookDownloads = pgTable("book_downloads", {
    id: uuid("id").defaultRandom().primaryKey(),
    bookId: uuid("book_id").references(() => books.id, { onDelete: 'cascade' }).notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: 'set null' }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    downloadedAt: timestamp("downloaded_at").defaultNow(),
});

export const manuscripts = pgTable("manuscripts", {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    authorId: text("author_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
    synopsis: text("synopsis"),
    category: text("category"),
    fileUrl: text("file_url").notNull(), // GDrive link or uploaded file
    status: text("status").default("pending"), // 'pending' | 'reviewed' | 'approved' | 'rejected'
    reviewerNotes: text("reviewer_notes"),
    projectId: text("project_id").references(() => projects.id, { onDelete: 'set null' }), // Once approved and created in management
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const events = pgTable("events", {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    date: timestamp("date").notNull(),
    location: text("location"),
    imageUrl: text("image_url"),
    registrationLink: text("registration_link"),
    status: text("status").default("upcoming"), // 'upcoming' | 'ongoing' | 'completed'
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// ---- Drizzle Relations (required for relational queries with `with:`) ----
import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ many }) => ({
    sessions: many(sessions),
    accounts: many(accounts),
    stages: many(stages, { relationName: "pjStages" }),
    coStages: many(stages, { relationName: "coPjStages" }),
    reviewedStages: many(stages, { relationName: "reviewerStages" }),
    notifications: many(notifications),
    books: many(books),
    manuscripts: many(manuscripts),
    ratings: many(bookRatings),
    downloads: many(bookDownloads),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
    user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ many, one }) => ({
    stages: many(stages),
    notifications: many(notifications),
    book: one(books, { fields: [projects.id], references: [books.projectId] }),
    manuscript: one(manuscripts, { fields: [projects.id], references: [manuscripts.projectId] }),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
    author: one(users, { fields: [books.authorId], references: [users.id] }),
    project: one(projects, { fields: [books.projectId], references: [projects.id] }),
    ratings: many(bookRatings),
    downloads: many(bookDownloads),
}));

export const bookRatingsRelations = relations(bookRatings, ({ one }) => ({
    book: one(books, { fields: [bookRatings.bookId], references: [books.id] }),
    user: one(users, { fields: [bookRatings.userId], references: [users.id] }),
}));

export const bookDownloadsRelations = relations(bookDownloads, ({ one }) => ({
    book: one(books, { fields: [bookDownloads.bookId], references: [books.id] }),
    user: one(users, { fields: [bookDownloads.userId], references: [users.id] }),
}));

export const manuscriptsRelations = relations(manuscripts, ({ one }) => ({
    author: one(users, { fields: [manuscripts.authorId], references: [users.id] }),
    project: one(projects, { fields: [manuscripts.projectId], references: [projects.id] }),
}));

export const stagesRelations = relations(stages, ({ one }) => ({
    project: one(projects, { fields: [stages.projectId], references: [projects.id] }),
    pj: one(users, { fields: [stages.pjId], references: [users.id], relationName: "pjStages" }),
    coPj: one(users, { fields: [stages.coPjId], references: [users.id], relationName: "coPjStages" }),
    reviewer: one(users, { fields: [stages.reviewerId], references: [users.id], relationName: "reviewerStages" }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, { fields: [notifications.userId], references: [users.id] }),
    project: one(projects, { fields: [notifications.projectId], references: [projects.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

// ── Chat & Messaging ─────────────────────────────────────────────────────────

export const chatConversations = pgTable("chat_conversations", {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull().default("direct"), // 'direct' (personal) | 'group'
    title: text("title"), // Judul grup (null jika direct)
    avatar: text("avatar"), // Gambar/ikon grup
    projectId: text("project_id").references(() => projects.id, { onDelete: 'set null' }), // Opsional: grup terkait proyek
    createdBy: text("created_by").references(() => users.id, { onDelete: 'set null' }),
    lastMessageAt: timestamp("last_message_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatParticipants = pgTable("chat_participants", {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id").references(() => chatConversations.id, { onDelete: 'cascade' }).notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
    role: text("role").default("member"), // 'admin' | 'member'
    lastReadAt: timestamp("last_read_at").defaultNow(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id").references(() => chatConversations.id, { onDelete: 'cascade' }).notNull(),
    senderId: text("sender_id").references(() => users.id, { onDelete: 'set null' }).notNull(),
    content: text("content").notNull(),
    attachmentUrl: text("attachment_url"),
    attachmentType: text("attachment_type"), // 'image' | 'file' | 'pdf'
    attachmentName: text("attachment_name"),
    replyToId: uuid("reply_to_id"), // Self-referencing reply
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
    creator: one(users, { fields: [chatConversations.createdBy], references: [users.id] }),
    project: one(projects, { fields: [chatConversations.projectId], references: [projects.id] }),
    participants: many(chatParticipants),
    messages: many(chatMessages),
}));

export const chatParticipantsRelations = relations(chatParticipants, ({ one }) => ({
    conversation: one(chatConversations, { fields: [chatParticipants.conversationId], references: [chatConversations.id] }),
    user: one(users, { fields: [chatParticipants.userId], references: [users.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
    conversation: one(chatConversations, { fields: [chatMessages.conversationId], references: [chatConversations.id] }),
    sender: one(users, { fields: [chatMessages.senderId], references: [users.id] }),
    replyTo: one(chatMessages, { fields: [chatMessages.replyToId], references: [chatMessages.id] }),
}));

