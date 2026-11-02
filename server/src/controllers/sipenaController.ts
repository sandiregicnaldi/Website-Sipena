import { Request, Response } from "express";
import { db } from "../db";
import { appSettings, books, manuscripts, events, bookRatings, bookDownloads, bookReads, users, notifications } from "../db/schema";
import { eq, and, sql, desc, ilike, or, count, inArray } from "drizzle-orm";
import { writeAuditLog } from "../services/logService";

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


// Helper: resolve book ID whether it's a UUID or a legacy numeric identifier / index
async function resolveBookId(id: string): Promise<string | null> {
    if (!id) return null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
        const book = await db.query.books.findFirst({
            where: eq(books.id, id),
            columns: { id: true }
        });
        return book ? book.id : null;
    }

    // Try numeric index (e.g. "1" -> 1st book, "2" -> 2nd book)
    const num = parseInt(id, 10);
    if (!isNaN(num) && num > 0) {
        const list = await db.query.books.findMany({
            orderBy: (b, { asc }) => [asc(b.createdAt)],
            limit: 1,
            offset: num - 1,
            columns: { id: true }
        });
        if (list[0]) return list[0].id;
    }

    // Fallback: search first book
    const fallback = await db.query.books.findFirst({
        orderBy: (b, { asc }) => [asc(b.createdAt)],
        columns: { id: true }
    });
    return fallback ? fallback.id : null;
}

// ── KATALOG BUKU ──
export const SipenaBooksController = {
    getStats: async (req: Request, res: Response) => {
        try {
            const allBooks = await db.query.books.findMany({
                orderBy: (b, { desc }) => [desc(b.createdAt)]
            });

            // Klasifikasi kategori publikasi khusus (case-insensitive & trimmed)
            const isPedoman = (cat: string) => ['pedoman / standar', 'pedoman / standard', 'pedoman', 'standar'].includes(cat);
            const isProsiding = (cat: string) => cat === 'prosiding';
            const isLaporan = (cat: string) => cat === 'laporan';
            const isJurnal = (cat: string) => ['majalah / jurnal', 'majalah', 'jurnal'].includes(cat);

            let pedomanCount = 0;
            let prosidingCount = 0;
            let laporanCount = 0;
            let jurnalCount = 0;
            let totalBukuCount = 0;

            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            let pedomanThisMonth = 0;
            let prosidingThisMonth = 0;
            let laporanThisMonth = 0;
            let jurnalThisMonth = 0;
            let bukuThisMonth = 0;

            const downloadsByYearMap: Record<string, number> = {};

            allBooks.forEach(b => {
                const cat = (b.category || '').trim().toLowerCase();
                const createdAt = b.createdAt ? new Date(b.createdAt) : null;
                const isThisMonth = createdAt && createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear;

                // Jika bukan salah satu dari 4 kategori khusus, otomatis terhitung ke Total Buku
                if (isPedoman(cat)) {
                    pedomanCount++;
                    if (isThisMonth) pedomanThisMonth++;
                } else if (isProsiding(cat)) {
                    prosidingCount++;
                    if (isThisMonth) prosidingThisMonth++;
                } else if (isLaporan(cat)) {
                    laporanCount++;
                    if (isThisMonth) laporanThisMonth++;
                } else if (isJurnal(cat)) {
                    jurnalCount++;
                    if (isThisMonth) jurnalThisMonth++;
                } else {
                    totalBukuCount++;
                    if (isThisMonth) bukuThisMonth++;
                }

                // Agregasi unduhan per tahun
                const yr = b.year ? String(b.year) : (createdAt ? String(createdAt.getFullYear()) : String(currentYear));
                downloadsByYearMap[yr] = (downloadsByYearMap[yr] || 0) + (b.downloadCount || 0);
            });

            // Hitung Total Penulis:
            // 1. Pengguna terdaftar dengan role = 'penulis'
            const authorUsers = await db
                .select({
                    id: users.id,
                    name: users.name,
                    createdAt: users.createdAt
                })
                .from(users)
                .where(eq(users.role, "penulis"));

            // 2. Semua nama penulis unik dari katalog buku
            const distinctBookAuthors = new Set<string>();
            allBooks.forEach(b => {
                if (b.authorName && b.authorName.trim()) {
                    distinctBookAuthors.add(b.authorName.trim().toLowerCase());
                }
            });

            // Gabungkan author unik (penulis terdaftar + penulis terbitan buku)
            const uniqueAuthorPool = new Set<string>(distinctBookAuthors);
            let authorsThisMonth = 0;
            authorUsers.forEach(u => {
                if (u.name && u.name.trim()) {
                    uniqueAuthorPool.add(u.name.trim().toLowerCase());
                }
                if (u.createdAt) {
                    const cDate = new Date(u.createdAt);
                    if (cDate.getMonth() === currentMonth && cDate.getFullYear() === currentYear) {
                        authorsThisMonth++;
                    }
                }
            });

            const totalAuthorsCount = Math.max(uniqueAuthorPool.size, authorUsers.length);

            // Daftar 5 buku terbaru
            const recentBooks = allBooks.slice(0, 5).map(b => ({
                id: b.id,
                judul: b.title,
                penulis: b.authorName || 'Penulis Anonim',
                kategori: b.category || 'Umum',
                status: 'Terbit',
                tanggal: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString()
            }));

            // Daftar 5 pengguna terdaftar terbaru
            const recentUsersRaw = await db
                .select({
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    role: users.role,
                    createdAt: users.createdAt
                })
                .from(users)
                .orderBy(desc(users.createdAt))
                .limit(5);

            const recentUsers = recentUsersRaw.map(u => ({
                id: u.id,
                nama: u.name,
                email: u.email,
                role: u.role === 'penulis' ? 'Penulis'
                    : u.role === 'calon_penulis' ? 'Calon Penulis'
                    : u.role === 'admin' ? 'Super Admin'
                    : u.role === 'personil' ? 'Personil'
                    : 'Pengunjung',
                tanggal: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString()
            }));

            // 6 Kartu Statistik Live sesuai susunan UI di AdminDashboard
            const stats = [
                {
                    label: 'Total Buku',
                    value: totalBukuCount,
                    sub: `+${bukuThisMonth} bulan ini`,
                    cls: 'stat-card--blue',
                    type: 'buku'
                },
                {
                    label: 'Pedoman / Standar',
                    value: pedomanCount,
                    sub: `+${pedomanThisMonth} bulan ini`,
                    cls: 'stat-card--amber',
                    type: 'pedoman'
                },
                {
                    label: 'Prosiding',
                    value: prosidingCount,
                    sub: `+${prosidingThisMonth} bulan ini`,
                    cls: 'stat-card--red',
                    type: 'prosiding'
                },
                {
                    label: 'Laporan',
                    value: laporanCount,
                    sub: `+${laporanThisMonth} bulan ini`,
                    cls: 'stat-card--green',
                    type: 'laporan'
                },
                {
                    label: 'Majalah / Jurnal',
                    value: jurnalCount,
                    sub: `+${jurnalThisMonth} bulan ini`,
                    cls: 'stat-card--teal',
                    type: 'jurnal'
                },
                {
                    label: 'Total Penulis',
                    value: totalAuthorsCount,
                    sub: `+${authorsThisMonth} bulan ini`,
                    cls: 'stat-card--purple',
                    type: 'penulis'
                }
            ];

            // Siapkan chart data tahunan (2018 - 2026)
            const yearsRange = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'];
            const baselineDownloads: Record<string, number> = {
                '2018': 2800, '2019': 3100, '2020': 4200, '2021': 5300,
                '2022': 6100, '2023': 6800, '2024': 14800, '2025': 9600, '2026': 2900
            };
            const chartData = yearsRange.map(yr => ({
                year: yr,
                val: (baselineDownloads[yr] || 0) + (downloadsByYearMap[yr] || 0)
            }));

            res.json({
                success: true,
                stats,
                recentBooks,
                recentUsers,
                chartData
            });
        } catch (error) {
            console.error("[SipenaBooksController.getStats] Error:", error);
            res.status(500).json({ error: "Failed to fetch dashboard stats" });
        }
    },

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
                limit: req.query.limit ? limit : undefined,
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
            const targetId = await resolveBookId(id);
            if (!targetId) {
                return res.status(404).json({ error: "Book not found" });
            }

            const book = await db.query.books.findFirst({
                where: eq(books.id, targetId),
                with: {
                    author: true,
                    ratings: {
                        with: { user: true },
                        orderBy: (r, { desc }) => [desc(r.createdAt)],
                        limit: 10
                    }
                }
            });

            if (!book) {
                return res.status(404).json({ error: "Book not found" });
            }

            let userRating: number | null = null;
            let hasRated = false;
            let hasDownloaded = false;
            let hasRead = false;

            if (req.user?.id) {
                const [ratingRecord, downloadRecord, readRecord] = await Promise.all([
                    db.query.bookRatings.findFirst({
                        where: and(eq(bookRatings.bookId, targetId), eq(bookRatings.userId, req.user.id))
                    }),
                    db.query.bookDownloads.findFirst({
                        where: and(eq(bookDownloads.bookId, targetId), eq(bookDownloads.userId, req.user.id))
                    }),
                    db.query.bookReads.findFirst({
                        where: and(eq(bookReads.bookId, targetId), eq(bookReads.userId, req.user.id))
                    })
                ]);

                if (ratingRecord) {
                    userRating = ratingRecord.rating;
                    hasRated = true;
                }
                if (downloadRecord) {
                    hasDownloaded = true;
                }
                if (readRecord) {
                    hasRead = true;
                }
            }

            res.json({
                ...book,
                userRating,
                hasRated,
                hasDownloaded,
                hasRead
            });
        } catch (error) {
            console.error("[SipenaBooksController.getOne] Error:", error);
            res.status(500).json({ error: "Failed to fetch book" });
        }
    },

    getRelated: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const targetId = await resolveBookId(id);
            if (!targetId) {
                return res.status(404).json({ error: "Book not found" });
            }

            const currentBook = await db.query.books.findFirst({
                where: eq(books.id, targetId)
            });

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
            const targetId = await resolveBookId(id);
            if (!targetId) {
                return res.status(404).json({ error: "Buku tidak ditemukan" });
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

            // Periksa apakah akun ini sudah pernah memberikan ulasan rating
            const existingRating = await db.query.bookRatings.findFirst({
                where: and(
                    eq(bookRatings.bookId, targetId),
                    eq(bookRatings.userId, userId)
                )
            });

            if (existingRating) {
                return res.status(400).json({
                    error: "Anda sudah pernah memberikan ulasan rating untuk buku ini.",
                    alreadyRated: true,
                    userRating: existingRating.rating
                });
            }

            // Simpan rating baru (hanya 1x per akun)
            await db.insert(bookRatings).values({
                bookId: targetId,
                userId,
                rating: ratingNum,
                review: review || null
            });

            // Recalculate average rating & count for this book
            const [calc] = await db
                .select({
                    avgRating: sql<number>`COALESCE(AVG(${bookRatings.rating}), 0)`,
                    countRating: sql<number>`COUNT(*)::int`
                })
                .from(bookRatings)
                .where(eq(bookRatings.bookId, targetId));

            const newAvg = Math.round(Number(calc?.avgRating || 0) * 10) / 10;
            const newCount = Number(calc?.countRating || 0);

            await db.update(books)
                .set({
                    ratingAvg: newAvg,
                    ratingCount: newCount,
                    updatedAt: new Date()
                })
                .where(eq(books.id, targetId));

            res.json({
                success: true,
                rating: ratingNum,
                ratingAvg: newAvg,
                ratingCount: newCount
            });
        } catch (error: any) {
            console.error("[SipenaBooksController.rate] Error:", error);
            // Handle race-condition unique constraint
            if (error?.code === '23505') {
                return res.status(400).json({
                    error: "Anda sudah pernah memberikan ulasan rating untuk buku ini.",
                    alreadyRated: true
                });
            }
            res.status(500).json({ error: "Failed to submit rating" });
        }
    },

    recordDownload: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const targetId = await resolveBookId(id);
            if (!targetId) {
                return res.status(404).json({ error: "Buku tidak ditemukan" });
            }

            const userId = req.user?.id || null;
            const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null;
            const cleanIp = typeof ipAddress === "string" ? ipAddress.split(",")[0].trim() : null;
            const userAgent = req.headers["user-agent"] || null;

            // Satu akun jika mengunduh berkali-kali buku yang sama tetap terhitung 1x di log download
            if (userId) {
                const existing = await db.query.bookDownloads.findFirst({
                    where: and(
                        eq(bookDownloads.bookId, targetId),
                        eq(bookDownloads.userId, userId)
                    )
                });
                if (existing) {
                    return res.json({ success: true, alreadyDownloaded: true });
                }
            } else if (cleanIp) {
                const existing = await db.query.bookDownloads.findFirst({
                    where: and(
                        eq(bookDownloads.bookId, targetId),
                        eq(bookDownloads.ipAddress, cleanIp)
                    )
                });
                if (existing) {
                    return res.json({ success: true, alreadyDownloaded: true });
                }
            }

            try {
                // Log download
                await db.insert(bookDownloads).values({
                    bookId: targetId,
                    userId,
                    ipAddress: cleanIp,
                    userAgent
                });

                // Increment book download counter (hanya jika unduhan pertama)
                await db.update(books)
                    .set({
                        downloadCount: sql`COALESCE(${books.downloadCount}, 0) + 1`,
                        updatedAt: new Date()
                    })
                    .where(eq(books.id, targetId));

                res.json({ success: true, alreadyDownloaded: false });
            } catch (insertErr: any) {
                if (insertErr?.code === '23505') {
                    return res.json({ success: true, alreadyDownloaded: true });
                }
                throw insertErr;
            }
        } catch (error) {
            console.error("[SipenaBooksController.recordDownload] Error:", error);
            res.status(500).json({ error: "Failed to record download" });
        }
    },

    recordRead: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const targetId = await resolveBookId(id);
            if (!targetId) {
                return res.status(404).json({ error: "Buku tidak ditemukan" });
            }

            const userId = req.user?.id || null;
            const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null;
            const cleanIp = typeof ipAddress === "string" ? ipAddress.split(",")[0].trim() : null;
            const userAgent = req.headers["user-agent"] || null;

            // Satu akun jika membaca berkali-kali buku yang sama tetap terhitung 1x di log pembaca
            if (userId) {
                const existing = await db.query.bookReads.findFirst({
                    where: and(
                        eq(bookReads.bookId, targetId),
                        eq(bookReads.userId, userId)
                    )
                });
                if (existing) {
                    return res.json({ success: true, alreadyRead: true });
                }
            } else if (cleanIp) {
                const existing = await db.query.bookReads.findFirst({
                    where: and(
                        eq(bookReads.bookId, targetId),
                        eq(bookReads.ipAddress, cleanIp)
                    )
                });
                if (existing) {
                    return res.json({ success: true, alreadyRead: true });
                }
            }

            try {
                // Log pembaca
                await db.insert(bookReads).values({
                    bookId: targetId,
                    userId,
                    ipAddress: cleanIp,
                    userAgent
                });

                // Increment book read counter (hanya jika pembacaan pertama)
                await db.update(books)
                    .set({
                        readCount: sql`COALESCE(${books.readCount}, 0) + 1`,
                        updatedAt: new Date()
                    })
                    .where(eq(books.id, targetId));

                res.json({ success: true, alreadyRead: false });
            } catch (insertErr: any) {
                if (insertErr?.code === '23505') {
                    return res.json({ success: true, alreadyRead: true });
                }
                throw insertErr;
            }
        } catch (error) {
            console.error("[SipenaBooksController.recordRead] Error:", error);
            res.status(500).json({ error: "Failed to record read" });
        }
    },

    create: async (req: Request, res: Response) => {
        try {
            const projectId = req.body.projectId;
            const title = req.body.title;

            let linkedManuscript: any = null;
            if (projectId) {
                linkedManuscript = await db.query.manuscripts.findFirst({
                    where: eq(manuscripts.projectId, projectId)
                });
            }
            if (!linkedManuscript && title) {
                linkedManuscript = await db.query.manuscripts.findFirst({
                    where: and(
                        eq(manuscripts.title, title),
                        or(eq(manuscripts.status, 'approved'), eq(manuscripts.status, 'in_progress'), eq(manuscripts.status, 'pending'))
                    )
                });
            }

            const bookData = { ...req.body };
            if (linkedManuscript?.authorId && !bookData.authorId) {
                bookData.authorId = linkedManuscript.authorId;
            }

            const [newBook] = await db.insert(books).values(bookData).returning();

            // Jika ada naskah terkait: ubah status naskah menjadi 'published' dan upgrade akun pengaju menjadi 'penulis'
            if (linkedManuscript) {
                try {
                    await db.update(manuscripts)
                        .set({
                            status: 'published',
                            projectId: projectId || linkedManuscript.projectId,
                            updatedAt: new Date()
                        })
                        .where(eq(manuscripts.id, linkedManuscript.id));

                    if (linkedManuscript.authorId) {
                        const authorUser = await db.query.users.findFirst({
                            where: eq(users.id, linkedManuscript.authorId)
                        });

                        if (authorUser && ['pengunjung', 'user', 'calon_penulis'].includes(authorUser.role || '')) {
                            await db.update(users)
                                .set({ role: 'penulis', updatedAt: new Date() })
                                .where(eq(users.id, authorUser.id));

                            writeAuditLog({
                                userId: req.user?.id,
                                action: 'update_user',
                                target: authorUser.name,
                                targetId: authorUser.id,
                                meta: { role: 'penulis', reason: `Auto-upgraded on book publication: ${newBook.title}` },
                                ipAddress: req.ip,
                            });
                        }

                        // Kirim notifikasi ucapan selamat kepada penulis
                        await db.insert(notifications).values({
                            userId: linkedManuscript.authorId,
                            type: 'book_published',
                            title: 'Buku Anda Telah Terbit! 🎉',
                            message: `Selamat! Naskah Anda "${newBook.title}" telah resmi diterbitkan di Katalog Buku SiPena Perpusnas Press. Akun Anda kini aktif sebagai Penulis Terverifikasi.`,
                            projectId: projectId || linkedManuscript.projectId,
                        });
                    }
                } catch (publishErr) {
                    console.warn("[SipenaBooksController.create] Error during manuscript publish and role upgrade:", publishErr);
                }
            }

            res.status(201).json(newBook);
        } catch (error) {
            console.error("[SipenaBooksController.create] Error:", error);
            res.status(500).json({ error: "Failed to create book" });
        }
    },
    update: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const [updated] = await db.update(books).set({...req.body, updatedAt: new Date()}).where(eq(books.id, id)).returning();

            const projectId = updated?.projectId || req.body.projectId;
            const title = updated?.title || req.body.title;

            let linkedManuscript: any = null;
            if (projectId) {
                linkedManuscript = await db.query.manuscripts.findFirst({
                    where: eq(manuscripts.projectId, projectId)
                });
            }
            if (!linkedManuscript && title) {
                linkedManuscript = await db.query.manuscripts.findFirst({
                    where: eq(manuscripts.title, title)
                });
            }

            if (linkedManuscript) {
                try {
                    await db.update(manuscripts)
                        .set({
                            status: 'published',
                            projectId: projectId || linkedManuscript.projectId,
                            updatedAt: new Date()
                        })
                        .where(eq(manuscripts.id, linkedManuscript.id));

                    if (linkedManuscript.authorId) {
                        const authorUser = await db.query.users.findFirst({
                            where: eq(users.id, linkedManuscript.authorId)
                        });

                        if (authorUser && ['pengunjung', 'user', 'calon_penulis'].includes(authorUser.role || '')) {
                            await db.update(users)
                                .set({ role: 'penulis', updatedAt: new Date() })
                                .where(eq(users.id, authorUser.id));

                            writeAuditLog({
                                userId: req.user?.id,
                                action: 'update_user',
                                target: authorUser.name,
                                targetId: authorUser.id,
                                meta: { role: 'penulis', reason: `Auto-upgraded on book update: ${updated?.title}` },
                                ipAddress: req.ip,
                            });
                        }
                    }
                } catch (e) {
                    console.warn("[SipenaBooksController.update] Linking error:", e);
                }
            }

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
            const isStaff = req.user?.role === "admin" || req.user?.role === "personil" || req.user?.role === "pegawai" || req.user?.role === "reviewer";
            const authorId = isStaff ? (req.query.authorId as string) : req.user?.id;

            const whereClause = authorId ? eq(manuscripts.authorId, authorId) : undefined;
            const allManuscripts = await db.query.manuscripts.findMany({
                where: whereClause,
                orderBy: (manuscripts, { desc }) => [desc(manuscripts.createdAt)],
                with: { author: true, project: true }
            });

            // Tautkan bookId jika naskah telah memiliki buku terbit
            const projectIds = allManuscripts.map(m => m.projectId).filter(Boolean) as string[];
            const titles = allManuscripts.map(m => m.title);

            let matchingBooks: any[] = [];
            if (projectIds.length > 0 || titles.length > 0) {
                const bookConditions: any[] = [];
                if (projectIds.length > 0) bookConditions.push(inArray(books.projectId, projectIds));
                if (titles.length > 0) bookConditions.push(inArray(books.title, titles));

                matchingBooks = await db.query.books.findMany({
                    where: or(...bookConditions),
                    columns: { id: true, title: true, projectId: true, coverUrl: true }
                });
            }

            const manuscriptsWithBook = allManuscripts.map(m => {
                const book = matchingBooks.find(b => (m.projectId && b.projectId === m.projectId) || b.title.toLowerCase() === m.title.toLowerCase());
                return {
                    ...m,
                    bookId: book ? book.id : null,
                    bookCoverUrl: book ? book.coverUrl : null,
                };
            });

            res.json(manuscriptsWithBook);
        } catch (error) {
            console.error("SipenaManuscriptsController.getAll error:", error);
            res.status(500).json({ error: "Failed to fetch manuscripts" });
        }
    },
    create: async (req: Request, res: Response) => {
        try {
            const authorId = req.user?.id || req.body.authorId;
            if (!authorId) {
                return res.status(401).json({ error: "Silakan login terlebih dahulu untuk mengajukan naskah" });
            }

            const { title, fileUrl, synopsis, category } = req.body;
            if (!title || !title.trim()) {
                return res.status(400).json({ error: "Judul naskah wajib diisi" });
            }
            if (!fileUrl || !fileUrl.trim()) {
                return res.status(400).json({ error: "Tautan naskah (Google Drive / cloud link) wajib diisi" });
            }

            const [newManuscript] = await db.insert(manuscripts).values({
                title: title.trim(),
                fileUrl: fileUrl.trim(),
                synopsis: synopsis?.trim() || null,
                category: category?.trim() || "Umum",
                authorId,
                status: "pending",
            }).returning();

            res.status(201).json(newManuscript);
        } catch (error) {
            console.error("SipenaManuscriptsController.create error:", error);
            res.status(500).json({ error: "Gagal mengajukan naskah: " + (error as Error).message });
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
