import { Request, Response } from "express";
import { db } from "../db";
import { appSettings, books, manuscripts, events, bookRatings, bookDownloads, users } from "../db/schema";
import { eq, and, sql, desc, ilike, or, count } from "drizzle-orm";

// ── KONTEN WEB (Banner, Tentang, FAQ, Panduan) ──
export const SipenaContentController = {
    // Mendapatkan konten publik
    getSettings: async (req: Request, res: Response) => {
        try {
            const key = req.params.key as string;
            const setting = await db.query.appSettings.findFirst({
                where: eq(appSettings.key, key)
            });
            if (!setting) {
                return res.json({ data: null });
            }
            res.json({ data: setting.value });
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch settings" });
        }
    },
    // Admin menyimpan konten
    saveSettings: async (req: Request, res: Response) => {
        try {
            const key = req.params.key as string;
            const { value } = req.body;
            
            await db.insert(appSettings)
                .values({ key, value })
                .onConflictDoUpdate({
                    target: appSettings.key,
                    set: { value, updatedAt: new Date() }
                });
                
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: "Failed to save settings" });
        }
    }
};

// ── KATALOG BUKU ──
export const SipenaBooksController = {
    getAll: async (req: Request, res: Response) => {
        try {
            const page = req.query.page ? parseInt(req.query.page as string, 10) : null;
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 12;
            const search = (req.query.search as string || "").trim();
            const category = (req.query.category as string || "").trim();

            const conditions: any[] = [];
            if (search) {
                conditions.push(or(
                    ilike(books.title, `%${search}%`),
                    ilike(books.authorName, `%${search}%`)
                ));
            }
            if (category) {
                conditions.push(eq(books.category, category));
            }

            const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

            // If pagination is requested (page is specified)
            if (page) {
                const offset = (page - 1) * limit;

                const [totalResult] = await db
                    .select({ totalCount: count() })
                    .from(books)
                    .where(whereClause);
                
                const total = totalResult?.totalCount || 0;
                const totalPages = Math.ceil(total / limit);

                const items = await db.query.books.findMany({
                    where: whereClause,
                    orderBy: (b, { desc }) => [desc(b.createdAt)],
                    limit,
                    offset,
                    with: { author: true }
                });

                return res.json({
                    data: items,
                    pagination: {
                        total,
                        page,
                        limit,
                        totalPages
                    }
                });
            }

            // Fallback for non-paginated requests (e.g. AdminKatalog)
            const allBooks = await db.query.books.findMany({
                where: whereClause,
                orderBy: (b, { desc }) => [desc(b.createdAt)],
                with: { author: true }
            });
            res.json(allBooks);
        } catch (error) {
            console.error("[SipenaBooksController.getAll] Error:", error);
            res.status(500).json({ error: "Failed to fetch books" });
        }
    },

    getOne: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            
            let book = null;
            if (isUuid) {
                book = await db.query.books.findFirst({
                    where: eq(books.id, id),
                    with: {
                        author: true,
                        ratings: {
                            with: { user: true },
                            orderBy: (r, { desc }) => [desc(r.createdAt)],
                            limit: 10
                        }
                    }
                });
            } else {
                // Graceful fallback for non-UUID / legacy routes
                book = await db.query.books.findFirst({
                    orderBy: (b, { asc }) => [asc(b.createdAt)],
                    with: {
                        author: true,
                        ratings: {
                            with: { user: true },
                            orderBy: (r, { desc }) => [desc(r.createdAt)],
                            limit: 10
                        }
                    }
                });
            }

            if (!book) {
                return res.status(404).json({ error: "Book not found" });
            }

            res.json(book);
        } catch (error) {
            console.error("[SipenaBooksController.getOne] Error:", error);
            res.status(500).json({ error: "Failed to fetch book" });
        }
    },

    getRelated: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

            let currentBook = null;
            if (isUuid) {
                currentBook = await db.query.books.findFirst({
                    where: eq(books.id, id)
                });
            } else {
                currentBook = await db.query.books.findFirst({
                    orderBy: (b, { asc }) => [asc(b.createdAt)]
                });
            }

            if (!currentBook) {
                return res.status(404).json({ error: "Book not found" });
            }

            // Find other books (up to 20 candidate pool)
            const otherBooks = await db.query.books.findMany({
                where: sql`${books.id} != ${currentBook.id}`,
                orderBy: (b, { desc }) => [desc(b.createdAt)],
                limit: 20
            });

            const sorted = otherBooks.sort((a, b) => {
                if (currentBook.authorName) {
                    if (a.authorName === currentBook.authorName && b.authorName !== currentBook.authorName) return -1;
                    if (a.authorName !== currentBook.authorName && b.authorName === currentBook.authorName) return 1;
                }
                if (currentBook.category) {
                    if (a.category === currentBook.category && b.category !== currentBook.category) return -1;
                    if (a.category !== currentBook.category && b.category === currentBook.category) return 1;
                }
                return 0;
            }).slice(0, 4);

            res.json(sorted);
        } catch (error) {
            console.error("[SipenaBooksController.getRelated] Error:", error);
            res.status(500).json({ error: "Failed to fetch related books" });
        }
    },

    rate: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            if (!isUuid) {
                return res.status(400).json({ error: "Invalid book ID" });
            }

            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: "Silakan login untuk memberikan rating" });
            }

            const { rating, review } = req.body;
            const ratingNum = parseInt(rating, 10);
            if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
                return res.status(400).json({ error: "Rating harus berupa angka 1 sampai 5" });
            }

            // Upsert user rating
            await db.insert(bookRatings)
                .values({
                    bookId: id,
                    userId,
                    rating: ratingNum,
                    review: review || null
                })
                .onConflictDoUpdate({
                    target: [bookRatings.bookId, bookRatings.userId],
                    set: {
                        rating: ratingNum,
                        review: review || null,
                        updatedAt: new Date()
                    }
                });

            // Recalculate average rating & count for this book
            const [calc] = await db
                .select({
                    avgRating: sql<number>`COALESCE(AVG(${bookRatings.rating}), 0)`,
                    countRating: sql<number>`COUNT(*)::int`
                })
                .from(bookRatings)
                .where(eq(bookRatings.bookId, id));

            const newAvg = Math.round(Number(calc?.avgRating || 0) * 10) / 10;
            const newCount = Number(calc?.countRating || 0);

            await db.update(books)
                .set({
                    ratingAvg: newAvg,
                    ratingCount: newCount,
                    updatedAt: new Date()
                })
                .where(eq(books.id, id));

            res.json({
                success: true,
                rating: ratingNum,
                ratingAvg: newAvg,
                ratingCount: newCount
            });
        } catch (error) {
            console.error("[SipenaBooksController.rate] Error:", error);
            res.status(500).json({ error: "Failed to submit rating" });
        }
    },

    recordDownload: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            if (!isUuid) {
                return res.status(400).json({ error: "Invalid book ID" });
            }

            const userId = req.user?.id || null;
            const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null;
            const userAgent = req.headers["user-agent"] || null;

            // Log download
            await db.insert(bookDownloads).values({
                bookId: id,
                userId,
                ipAddress: typeof ipAddress === "string" ? ipAddress.split(",")[0].trim() : null,
                userAgent
            });

            // Increment book download counter
            await db.update(books)
                .set({
                    downloadCount: sql`COALESCE(${books.downloadCount}, 0) + 1`,
                    updatedAt: new Date()
                })
                .where(eq(books.id, id));

            res.json({ success: true });
        } catch (error) {
            console.error("[SipenaBooksController.recordDownload] Error:", error);
            res.status(500).json({ error: "Failed to record download" });
        }
    },

    create: async (req: Request, res: Response) => {
        try {
            const [newBook] = await db.insert(books).values(req.body).returning();
            res.status(201).json(newBook);
        } catch (error) {
            res.status(500).json({ error: "Failed to create book" });
        }
    },
    update: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const [updated] = await db.update(books).set({...req.body, updatedAt: new Date()}).where(eq(books.id, id)).returning();
            res.json(updated);
        } catch (error) {
            res.status(500).json({ error: "Failed to update book" });
        }
    },
    delete: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            await db.delete(books).where(eq(books.id, id));
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: "Failed to delete book" });
        }
    }
};

// ── PENGAJUAN NASKAH ──
export const SipenaManuscriptsController = {
    getAll: async (req: Request, res: Response) => {
        try {
            const allManuscripts = await db.query.manuscripts.findMany({
                orderBy: (manuscripts, { desc }) => [desc(manuscripts.createdAt)],
                with: { author: true }
            });
            res.json(allManuscripts);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch manuscripts" });
        }
    },
    create: async (req: Request, res: Response) => {
        try {
            const [newManuscript] = await db.insert(manuscripts).values(req.body).returning();
            res.status(201).json(newManuscript);
        } catch (error) {
            res.status(500).json({ error: "Failed to submit manuscript" });
        }
    },
    updateStatus: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const { status, reviewerNotes } = req.body;
            const [updated] = await db.update(manuscripts)
                .set({ status, reviewerNotes, updatedAt: new Date() })
                .where(eq(manuscripts.id, id)).returning();
            res.json(updated);
        } catch (error) {
            res.status(500).json({ error: "Failed to update manuscript status" });
        }
    }
};

// ── KEGIATAN (EVENTS) ──
export const SipenaEventsController = {
    getAll: async (req: Request, res: Response) => {
        try {
            const allEvents = await db.query.events.findMany({
                orderBy: (events, { desc }) => [desc(events.date)]
            });
            res.json(allEvents);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch events" });
        }
    },
    create: async (req: Request, res: Response) => {
        try {
            const [newEvent] = await db.insert(events).values(req.body).returning();
            res.status(201).json(newEvent);
        } catch (error) {
            res.status(500).json({ error: "Failed to create event" });
        }
    },
    update: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const [updated] = await db.update(events).set({...req.body, updatedAt: new Date()}).where(eq(events.id, id)).returning();
            res.json(updated);
        } catch (error) {
            res.status(500).json({ error: "Failed to update event" });
        }
    },
    delete: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            await db.delete(events).where(eq(events.id, id));
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: "Failed to delete event" });
        }
    }
};

// ── PENULIS (AUTHORS) ──
export const SipenaAuthorsController = {
    getAll: async (req: Request, res: Response) => {
        try {
            const authorList = await db
                .select({
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    role: users.role,
                    bio: users.bio,
                    profesi: users.profesi,
                    domisili: users.domisili,
                    website: users.website,
                    image: users.image,
                    karyaEksternal: users.karyaEksternal,
                })
                .from(users)
                .where(eq(users.role, "penulis"));
            res.json(authorList);
        } catch (error) {
            console.error("SipenaAuthorsController.getAll error:", error);
            res.status(500).json({ error: "Failed to fetch authors" });
        }
    },

    getOne: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const [author] = await db
                .select({
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    role: users.role,
                    bio: users.bio,
                    profesi: users.profesi,
                    domisili: users.domisili,
                    website: users.website,
                    image: users.image,
                    karyaEksternal: users.karyaEksternal,
                })
                .from(users)
                .where(eq(users.id, id))
                .limit(1);

            if (!author) {
                return res.status(404).json({ error: "Author not found" });
            }

            const perpusnasWorks = await db.query.books.findMany({
                where: or(
                    eq(books.authorId, id),
                    ilike(books.authorName, `%${author.name}%`)
                ),
                orderBy: (b, { desc }) => [desc(b.createdAt)]
            });

            res.json({
                ...author,
                perpusnasWorks
            });
        } catch (error) {
            console.error("SipenaAuthorsController.getOne error:", error);
            res.status(500).json({ error: "Failed to fetch author" });
        }
    },

    submitRequest: async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: "Silakan login terlebih dahulu" });
            }

            const { bio, profesi, domisili, website, karyaEksternal, image, token, name } = req.body;

            const isInstantToken = token && typeof token === "string" && token.trim().toUpperCase() === "PERPUSNAS-PENULIS-2026";
            const newRole = isInstantToken ? "penulis" : "calon_penulis";
            const newStatus = isInstantToken ? "active" : "pending";

            const updateData: Record<string, any> = {
                role: newRole,
                status: newStatus,
                updatedAt: new Date()
            };

            if (name) updateData.name = name;
            if (bio !== undefined) updateData.bio = bio;
            if (profesi !== undefined) updateData.profesi = profesi;
            if (domisili !== undefined) updateData.domisili = domisili;
            if (website !== undefined) updateData.website = website;
            if (karyaEksternal !== undefined) updateData.karyaEksternal = karyaEksternal;
            if (image !== undefined) updateData.image = image;

            const [updated] = await db
                .update(users)
                .set(updateData)
                .where(eq(users.id, userId))
                .returning();

            res.json({
                success: true,
                role: updated.role,
                status: updated.status,
                isVerifiedAuthor: updated.role === "penulis",
                instantApproved: isInstantToken,
                message: isInstantToken 
                    ? "Selamat! Akun Anda berhasil diverifikasi secara instan sebagai Penulis Resmi." 
                    : "Pengajuan verifikasi penulis berhasil dikirim dan sedang ditinjau oleh tim redaksi."
            });
        } catch (error) {
            console.error("SipenaAuthorsController.submitRequest error:", error);
            res.status(500).json({ error: "Failed to submit author verification" });
        }
    },

    updateAuthorProfile: async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const { bio, profesi, domisili, website, karyaEksternal, image, name } = req.body;
            const updateData: Record<string, any> = {
                updatedAt: new Date()
            };
            if (name !== undefined) updateData.name = name;
            if (bio !== undefined) updateData.bio = bio;
            if (profesi !== undefined) updateData.profesi = profesi;
            if (domisili !== undefined) updateData.domisili = domisili;
            if (website !== undefined) updateData.website = website;
            if (karyaEksternal !== undefined) updateData.karyaEksternal = karyaEksternal;
            if (image !== undefined) updateData.image = image;

            const [updated] = await db
                .update(users)
                .set(updateData)
                .where(eq(users.id, userId))
                .returning();

            res.json({
                success: true,
                user: updated
            });
        } catch (error) {
            console.error("SipenaAuthorsController.updateAuthorProfile error:", error);
            res.status(500).json({ error: "Failed to update author profile" });
        }
    }
};
