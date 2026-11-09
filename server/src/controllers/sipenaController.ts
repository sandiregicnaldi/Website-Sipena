import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { db } from "../db";
import { appSettings, books, manuscripts, events, eventParticipants, bookRatings, bookDownloads, bookReads, users, notifications, sessions, projects, stages } from "../db/schema";
import { eq, and, sql, desc, ilike, or, count, inArray } from "drizzle-orm";
import { writeAuditLog } from "../services/logService";
import { ProjectService } from "../services/projectService";

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

            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            let pedomanThisMonth = 0;
            let prosidingThisMonth = 0;
            let laporanThisMonth = 0;
            let jurnalThisMonth = 0;
            let bukuThisMonth = 0;

            const downloadsByYearMap: Record<string, number> = {};
            const bookYearsSet = new Set<number>();

            allBooks.forEach(b => {
                const cat = (b.category || '').trim().toLowerCase();
                const createdAt = b.createdAt ? new Date(b.createdAt) : null;
                const isThisMonth = createdAt && createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear;

                if (isThisMonth) bukuThisMonth++;

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
                }

                if (b.year) {
                    bookYearsSet.add(b.year);
                }

                // Agregasi unduhan per tahun
                const yr = b.year ? String(b.year) : (createdAt ? String(createdAt.getFullYear()) : String(currentYear));
                downloadsByYearMap[yr] = (downloadsByYearMap[yr] || 0) + (b.downloadCount || 0);
            });

            // Total buku adalah seluruh koleksi katalog riil di database
            const totalBukuCount = allBooks.length;

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

            // Tahun terpilih untuk grafik bulanan
            const requestedYear = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
            const selectedYear = isNaN(requestedYear) ? new Date().getFullYear() : requestedYear;
            
            const dbYears = Array.from(bookYearsSet).filter(y => y >= 2015 && y <= currentYear + 1).sort((a, b) => b - a);
            const availableYears = dbYears.length > 0 ? dbYears : [2026, 2025, 2024, 2023, 2022, 2021, 2020];
            if (!availableYears.includes(selectedYear)) {
                availableYears.unshift(selectedYear);
            }

            // Agregasi jumlah baca & download per bulan untuk tahun yang dipilih
            const monthlyReadsDb = await db
                .select({
                    month: sql<number>`EXTRACT(MONTH FROM ${bookReads.createdAt})::int`,
                    count: count()
                })
                .from(bookReads)
                .where(sql`EXTRACT(YEAR FROM ${bookReads.createdAt}) = ${selectedYear}`)
                .groupBy(sql`EXTRACT(MONTH FROM ${bookReads.createdAt})`);

            const monthlyDownloadsDb = await db
                .select({
                    month: sql<number>`EXTRACT(MONTH FROM ${bookDownloads.downloadedAt})::int`,
                    count: count()
                })
                .from(bookDownloads)
                .where(sql`EXTRACT(YEAR FROM ${bookDownloads.downloadedAt}) = ${selectedYear}`)
                .groupBy(sql`EXTRACT(MONTH FROM ${bookDownloads.downloadedAt})`);

            const readsMap = new Map<number, number>();
            monthlyReadsDb.forEach(r => readsMap.set(Number(r.month), Number(r.count || 0)));

            const dlMap = new Map<number, number>();
            monthlyDownloadsDb.forEach(d => dlMap.set(Number(d.month), Number(d.count || 0)));

            const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

            // Data grafik bulanan 100% riil dari database (tanpa baseline fiktif)
            const monthlyChartData = MONTH_NAMES.map((name, idx) => {
                const monthNum = idx + 1;
                const realReads = readsMap.get(monthNum) || 0;
                const realDls = dlMap.get(monthNum) || 0;
                return {
                    month: name,
                    dibaca: realReads,
                    diunduh: realDls,
                };
            });

            // 10 Teratas Buku yang Sering Diunduh (Seminggu Terakhir)
            const weeklyDownloadsRaw = await db
                .select({
                    bookId: bookDownloads.bookId,
                    count: count()
                })
                .from(bookDownloads)
                .where(sql`${bookDownloads.downloadedAt} >= NOW() - INTERVAL '7 days'`)
                .groupBy(bookDownloads.bookId);

            const weeklyDlMap = new Map<string, number>();
            weeklyDownloadsRaw.forEach(w => weeklyDlMap.set(w.bookId, Number(w.count || 0)));

            const topDownloadedBooks = allBooks
                .map(b => {
                    const weeklyCount = weeklyDlMap.get(b.id) || 0;
                    return {
                        id: b.id,
                        judul: b.title,
                        penulis: b.authorName || 'Penulis Anonim',
                        kategori: b.category || 'Umum',
                        coverUrl: b.coverUrl,
                        unduhanMingguIni: weeklyCount,
                        unduhanTotal: b.downloadCount || 0,
                        ratingAvg: b.ratingAvg || 0
                    };
                })
                .sort((a, b) => {
                    if (b.unduhanMingguIni !== a.unduhanMingguIni) {
                        return b.unduhanMingguIni - a.unduhanMingguIni;
                    }
                    return b.unduhanTotal - a.unduhanTotal;
                })
                .slice(0, 10);

            // 10 Teratas Buku yang Sering Dibaca
            const topReadBooks = allBooks
                .map(b => ({
                    id: b.id,
                    judul: b.title,
                    penulis: b.authorName || 'Penulis Anonim',
                    kategori: b.category || 'Umum',
                    coverUrl: b.coverUrl,
                    pembacaTotal: b.readCount || 0,
                    unduhanTotal: b.downloadCount || 0,
                    ratingAvg: b.ratingAvg || 0,
                    ratingCount: b.ratingCount || 0
                }))
                .sort((a, b) => b.pembacaTotal - a.pembacaTotal)
                .slice(0, 10);

            // Pengguna Paling Aktif di SiPena (Masuk, Baca, Unduh)
            const activeUsersRaw = await db
                .select({
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    role: users.role,
                    image: users.image,
                    loginCount: sql<number>`(SELECT COUNT(*)::int FROM "session" s WHERE s.user_id = "user"."id")`,
                    readCount: sql<number>`(SELECT COUNT(*)::int FROM book_reads br WHERE br.user_id = "user"."id")`,
                    downloadCount: sql<number>`(SELECT COUNT(*)::int FROM book_downloads bd WHERE bd.user_id = "user"."id")`,
                    lastActive: sql<Date | null>`(SELECT MAX(s.created_at) FROM "session" s WHERE s.user_id = "user"."id")`
                })
                .from(users);

            const topActiveUsers = activeUsersRaw
                .map(u => {
                    const logins = Number(u.loginCount || 0);
                    const reads = Number(u.readCount || 0);
                    const downloads = Number(u.downloadCount || 0);
                    const activityScore = (logins * 1) + (reads * 2) + (downloads * 3);
                    return {
                        id: u.id,
                        nama: u.name,
                        email: u.email,
                        role: u.role === 'penulis' ? 'Penulis'
                            : u.role === 'calon_penulis' ? 'Calon Penulis'
                            : u.role === 'admin' ? 'Super Admin'
                            : u.role === 'personil' ? 'Personil'
                            : 'Pengunjung',
                        image: u.image,
                        loginCount: logins,
                        readCount: reads,
                        downloadCount: downloads,
                        activityScore,
                        lastActive: u.lastActive ? new Date(u.lastActive).toISOString() : null
                    };
                })
                .sort((a, b) => b.activityScore - a.activityScore)
                .slice(0, 10);

            // Legacy chartData untuk backward compatibility (murni dari database riil)
            const yearsRange = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'];
            const chartData = yearsRange.map(yr => ({
                year: yr,
                val: downloadsByYearMap[yr] || 0
            }));

            res.json({
                success: true,
                stats,
                selectedYear,
                availableYears,
                monthlyChartData,
                chartData,
                recentBooks,
                recentUsers,
                topDownloadedBooks,
                topReadBooks,
                topActiveUsers
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

            const limitParam = req.query.limit ? parseInt(req.query.limit as string, 10) : 6;
            const limit = Math.min(Math.max(isNaN(limitParam) ? 6 : limitParam, 1), 20);

            const authorId = currentBook.authorId || null;
            const authorName = currentBook.authorName && currentBook.authorName !== 'Penulis Anonim' ? currentBook.authorName : null;
            const category = currentBook.category || null;
            const title = currentBook.title || '';

            // Algoritma Rekomendasi Buku Terkait Multi-Kriteria:
            // 1. Penulis yang sama (Exact authorId/authorName atau partial word similarity)
            // 2. Judul yang hampir mirip (Trigram similarity & word similarity via pg_trgm untuk menjaring Jilid 1, 2, seri terbitan)
            // 3. Kategori buku yang sama
            const result: any = await db.execute(sql`
                SELECT 
                    id,
                    title,
                    author_id AS "authorId",
                    author_name AS "authorName",
                    category,
                    cover_url AS "coverUrl",
                    file_url AS "fileUrl",
                    rating_avg AS "ratingAvg",
                    rating_count AS "ratingCount",
                    download_count AS "downloadCount",
                    read_count AS "readCount",
                    created_at AS "createdAt",
                    ROUND(similarity(title, ${title})::numeric, 3) AS "titleSim",
                    (
                        -- 1. Penulis yang sama (Bobot Utama Penulis)
                        (CASE 
                            WHEN (${authorId}::text IS NOT NULL AND author_id = ${authorId}) THEN 10.0
                            WHEN (${authorName}::text IS NOT NULL AND author_name = ${authorName} AND author_name != 'Penulis Anonim') THEN 10.0
                            WHEN (${authorName}::text IS NOT NULL AND author_name != 'Penulis Anonim' AND (word_similarity(${authorName}, author_name) >= 0.7 OR similarity(author_name, ${authorName}) >= 0.6)) THEN 7.0
                            ELSE 0.0
                        END)
                        +
                        -- 2. Judul yang hampir mirip (Bobot Utama Judul: Seri/Jilid 1 & 2 dsb.)
                        (CASE 
                            WHEN similarity(title, ${title}) >= 0.35 THEN similarity(title, ${title}) * 12.0
                            WHEN word_similarity(${title}, title) >= 0.65 THEN word_similarity(${title}, title) * 8.0
                            ELSE similarity(title, ${title}) * 2.0
                        END)
                        +
                        -- 3. Kategori buku (Bobot Kategori)
                        (CASE WHEN (${category}::text IS NOT NULL AND category = ${category}) THEN 3.0 ELSE 0.0 END)
                    ) AS relevance_score
                FROM books
                WHERE id != ${currentBook.id}
                  AND (status = 'published' OR status IS NULL)
                ORDER BY relevance_score DESC, created_at DESC
                LIMIT ${limit};
            `);

            res.json(result.rows || []);
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

            // Sinkronisasi cover ke tahapan Desain Sampul jika buku terhubung ke project_id
            if (projectId && req.body.coverUrl) {
                try {
                    const stageSampul = await db.query.stages.findFirst({
                        where: and(
                            eq(stages.projectId, projectId),
                            eq(stages.label, 'Desain Sampul')
                        )
                    });
                    if (stageSampul) {
                        const newMeta = { ...(stageSampul.metadata || {}), coverUrl: req.body.coverUrl };
                        await db.update(stages).set({ metadata: newMeta }).where(eq(stages.id, stageSampul.id));
                    }
                } catch (stageErr) {
                    console.warn("[SipenaBooksController.update] Syncing stage cover error:", stageErr);
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

// Helper: cek apakah klaim sertifikat sedang aktif (otomatis 15 menit sebelum acara usai atau sakelar admin)
export function isEventClaimActive(event: any): { isOpen: boolean; reason: 'manual_open' | 'manual_closed' | 'auto_open' | 'auto_not_yet' } {
    if (event.claimOpensAt === 'closed' || (event.isClaimOpen === false && event.claimOpensAt === 'closed')) {
        return { isOpen: false, reason: 'manual_closed' };
    }
    if (event.isClaimOpen === true || event.claimOpensAt === 'open') {
        return { isOpen: true, reason: 'manual_open' };
    }
    if (!event.date) return { isOpen: false, reason: 'auto_not_yet' };

    const d = new Date(event.date);
    if (isNaN(d.getTime())) return { isOpen: false, reason: 'auto_not_yet' };

    let endHour = 12;
    let endMin = 0;
    if (event.time && typeof event.time === 'string') {
        const rangeMatch = event.time.match(/-\s*(\d{1,2})[:.](\d{2})/);
        if (rangeMatch) {
            endHour = parseInt(rangeMatch[1], 10);
            endMin = parseInt(rangeMatch[2], 10);
        } else {
            const singleMatch = event.time.match(/(\d{1,2})[:.](\d{2})/);
            if (singleMatch) {
                endHour = Math.min(23, parseInt(singleMatch[1], 10) + 2);
                endMin = parseInt(singleMatch[2], 10);
            }
        }
    }

    const eventEndTime = new Date(d);
    eventEndTime.setHours(endHour, endMin, 0, 0);
    // Klaim sertifikat otomatis dibuka 15 menit sebelum Zoom / acara berakhir
    const claimOpensAtTime = eventEndTime.getTime() - (15 * 60 * 1000);

    if (Date.now() >= claimOpensAtTime) {
        return { isOpen: true, reason: 'auto_open' };
    }
    return { isOpen: false, reason: 'auto_not_yet' };
}

function sanitizeEventPayload(body: any) {
    const payload: Record<string, any> = {};
    if (body.title !== undefined) payload.title = body.title;
    if (body.description !== undefined) payload.description = body.description;
    if (body.date !== undefined) payload.date = new Date(body.date);
    if (body.time !== undefined) payload.time = body.time;
    if (body.location !== undefined) payload.location = body.location;
    if (body.imageUrl !== undefined) payload.imageUrl = body.imageUrl;
    if (body.zoomUrl !== undefined) payload.zoomUrl = body.zoomUrl;
    if (body.registrationLink !== undefined) payload.registrationLink = body.registrationLink;
    if (body.speakers !== undefined) payload.speakers = Array.isArray(body.speakers) ? body.speakers : [body.speakers].filter(Boolean);
    if (body.maxParticipants !== undefined) payload.maxParticipants = Number(body.maxParticipants) || 0;
    if (body.certificateToken !== undefined) payload.certificateToken = body.certificateToken ? String(body.certificateToken).trim().toUpperCase() : null;
    if (body.certificateTemplateUrl !== undefined) payload.certificateTemplateUrl = body.certificateTemplateUrl;
    if (body.certNamePosY !== undefined) payload.certNamePosY = Number(body.certNamePosY) || 96;
    if (body.certFontSize !== undefined) payload.certFontSize = Number(body.certFontSize) || 24;
    if (body.certFontFamily !== undefined) payload.certFontFamily = String(body.certFontFamily || 'helvetica').trim().toLowerCase();
    if (body.isClaimOpen !== undefined) payload.isClaimOpen = body.isClaimOpen;
    if (body.claimOpensAt !== undefined) payload.claimOpensAt = body.claimOpensAt;
    if (body.status !== undefined) payload.status = body.status;
    return payload;
}

// ── KEGIATAN (EVENTS) ──
export const SipenaEventsController = {
    getAll: async (req: Request, res: Response) => {
        try {
            const allEvents = await db.query.events.findMany({
                orderBy: (events, { desc }) => [desc(events.date)]
            });

            const counts = await db
                .select({
                    eventId: eventParticipants.eventId,
                    count: count()
                })
                .from(eventParticipants)
                .groupBy(eventParticipants.eventId);

            const countMap = new Map<string, number>();
            counts.forEach(c => countMap.set(c.eventId, Number(c.count)));

            const isStaff = req.user && ['admin', 'personil', 'pegawai'].includes(req.user.role || '');

            const mapped = allEvents.map(e => {
                const claimStatus = isEventClaimActive(e);
                return {
                    ...e,
                    participantCount: countMap.get(e.id) || 0,
                    isClaimActive: claimStatus.isOpen,
                    claimReason: claimStatus.reason,
                    // Token hanya diserahkan jika user memiliki role admin/staff untuk manajemen
                    certificateToken: isStaff ? e.certificateToken : undefined,
                    hasCertificateToken: Boolean(e.certificateToken && e.certificateToken.trim()),
                };
            });

            res.json(mapped);
        } catch (error) {
            console.error("SipenaEventsController.getAll error:", error);
            res.status(500).json({ error: "Failed to fetch events" });
        }
    },

    getOne: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const event = await db.query.events.findFirst({
                where: eq(events.id, id)
            });

            if (!event) {
                return res.status(404).json({ error: "Kegiatan tidak ditemukan" });
            }

            const countRes = await db
                .select({ count: count() })
                .from(eventParticipants)
                .where(eq(eventParticipants.eventId, id));
            const participantCount = Number(countRes[0]?.count || 0);

            let userCertificate = null;
            if (req.user?.id) {
                userCertificate = await db.query.eventParticipants.findFirst({
                    where: and(
                        eq(eventParticipants.eventId, id),
                        eq(eventParticipants.userId, req.user.id)
                    )
                });
            }

            const isStaff = req.user && ['admin', 'personil', 'pegawai'].includes(req.user.role || '');
            const claimStatus = isEventClaimActive(event);

            res.json({
                ...event,
                certificateToken: isStaff ? event.certificateToken : undefined,
                hasCertificateToken: Boolean(event.certificateToken && event.certificateToken.trim()),
                participantCount,
                isClaimActive: claimStatus.isOpen,
                claimReason: claimStatus.reason,
                userCertificate
            });
        } catch (error) {
            console.error("SipenaEventsController.getOne error:", error);
            res.status(500).json({ error: "Failed to fetch event" });
        }
    },

    create: async (req: Request, res: Response) => {
        try {
            const payload = sanitizeEventPayload(req.body);
            const [newEvent] = await db.insert(events).values(payload as any).returning();
            res.status(201).json(newEvent);
        } catch (error) {
            console.error("SipenaEventsController.create error:", error);
            res.status(500).json({ error: "Failed to create event" });
        }
    },

    update: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const payload = sanitizeEventPayload(req.body);
            const [updated] = await db
                .update(events)
                .set({ ...payload, updatedAt: new Date() })
                .where(eq(events.id, id))
                .returning();
            res.json(updated);
        } catch (error) {
            console.error("SipenaEventsController.update error:", error);
            res.status(500).json({ error: "Failed to update event" });
        }
    },

    delete: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            await db.delete(events).where(eq(events.id, id));
            res.json({ success: true });
        } catch (error) {
            console.error("SipenaEventsController.delete error:", error);
            res.status(500).json({ error: "Failed to delete event" });
        }
    },

    claimCertificate: async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: "Silakan masuk (login) terlebih dahulu untuk mengklaim sertifikat kegiatan ini." });
            }

            const id = req.params.id as string;
            const { token, name, institution } = req.body;

            if (!token || !String(token).trim()) {
                return res.status(400).json({ error: "Token sertifikat wajib dimasukkan." });
            }

            if (!name || !String(name).trim()) {
                return res.status(400).json({ error: "Nama lengkap penerima sertifikat wajib diisi." });
            }

            const event = await db.query.events.findFirst({
                where: eq(events.id, id)
            });

            if (!event) {
                return res.status(404).json({ error: "Kegiatan tidak ditemukan." });
            }

            if (!event.certificateToken || !event.certificateToken.trim()) {
                return res.status(400).json({ error: "Kegiatan ini belum menerbitkan sertifikat token." });
            }

            const claimStatus = isEventClaimActive(event);
            if (!claimStatus.isOpen) {
                return res.status(400).json({
                    error: "Klaim sertifikat belum dibuka untuk kegiatan ini. Sertifikat akan dapat diklaim 15 menit sebelum acara berakhir di Zoom.",
                    claimStatus
                });
            }

            const cleanUserToken = String(token).trim().toUpperCase();
            const cleanEventToken = event.certificateToken.trim().toUpperCase();

            if (cleanUserToken !== cleanEventToken) {
                return res.status(400).json({ error: "Kode token sertifikat salah atau tidak sesuai. Periksa kembali token yang dibagikan panitia di Zoom." });
            }

            // Cek apakah user sudah pernah klaim
            const existingParticipant = await db.query.eventParticipants.findFirst({
                where: and(
                    eq(eventParticipants.eventId, id),
                    eq(eventParticipants.userId, userId)
                )
            });

            if (existingParticipant) {
                return res.json({
                    success: true,
                    alreadyClaimed: true,
                    message: "Anda sudah memiliki sertifikat untuk kegiatan ini.",
                    certificate: existingParticipant
                });
            }

            // Generate nomor sertifikat resmi: SIPENA/CERT/{TAHUN}/{BULAN_ROMAWI}/{URUT}
            const countRes = await db
                .select({ count: count() })
                .from(eventParticipants)
                .where(eq(eventParticipants.eventId, id));
            const currentCount = Number(countRes[0]?.count || 0) + 1;
            const certSeq = String(currentCount).padStart(4, '0');
            const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
            const now = new Date();
            const romanMonth = romanMonths[now.getMonth()] || 'I';
            const certificateNumber = `SIPENA/CERT/${now.getFullYear()}/${romanMonth}/${certSeq}`;

            const participantData = {
                eventId: id,
                userId,
                name: String(name).trim(),
                email: req.user?.email || "",
                institution: institution ? String(institution).trim() : null,
                tokenUsed: cleanUserToken,
                certificateNumber,
                status: "Hadir",
                claimedAt: now
            };

            const [newParticipant] = await db
                .insert(eventParticipants)
                .values(participantData)
                .returning();

            // Notifikasi ke user
            try {
                await db.insert(notifications).values({
                    userId,
                    type: 'event_certificate',
                    title: 'Sertifikat Berhasil Diklaim! 🎓',
                    message: `Selamat! Sertifikat untuk kegiatan "${event.title}" telah diterbitkan (Nomor: ${certificateNumber}) dan tersimpan di akun Anda.`,
                });
            } catch (notifErr) {
                console.warn("[claimCertificate] Notif creation failed:", notifErr);
            }

            res.status(201).json({
                success: true,
                message: "Sertifikat berhasil diklaim dan tersimpan di akun Anda!",
                certificate: newParticipant
            });
        } catch (error: any) {
            if (error?.code === '23505') { // Unique constraint
                const existing = await db.query.eventParticipants.findFirst({
                    where: and(
                        eq(eventParticipants.eventId, req.params.id as string),
                        eq(eventParticipants.userId, req.user!.id)
                    )
                });
                return res.json({
                    success: true,
                    alreadyClaimed: true,
                    message: "Anda sudah memiliki sertifikat untuk kegiatan ini.",
                    certificate: existing
                });
            }
            console.error("SipenaEventsController.claimCertificate error:", error);
            res.status(500).json({ error: "Gagal memproses klaim sertifikat: " + (error.message || "Unknown error") });
        }
    },

    getMyCertificates: async (req: Request, res: Response) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const myCerts = await db.query.eventParticipants.findMany({
                where: eq(eventParticipants.userId, userId),
                orderBy: (p, { desc }) => [desc(p.claimedAt)],
                with: {
                    event: true
                }
            });

            res.json(myCerts);
        } catch (error) {
            console.error("SipenaEventsController.getMyCertificates error:", error);
            res.status(500).json({ error: "Failed to fetch user certificates" });
        }
    },

    getParticipants: async (req: Request, res: Response) => {
        try {
            const eventId = req.params.id as string;
            const participants = await db.query.eventParticipants.findMany({
                where: eq(eventParticipants.eventId, eventId),
                orderBy: (p, { desc }) => [desc(p.claimedAt)],
                with: {
                    user: {
                        columns: { id: true, name: true, email: true, role: true }
                    }
                }
            });

            res.json(participants);
        } catch (error) {
            console.error("SipenaEventsController.getParticipants error:", error);
            res.status(500).json({ error: "Failed to fetch event participants" });
        }
    },

    toggleClaim: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            const { isClaimOpen, claimOpensAt } = req.body;

            const event = await db.query.events.findFirst({
                where: eq(events.id, id)
            });

            if (!event) {
                return res.status(404).json({ error: "Event not found" });
            }

            // Jika status spesifik tidak dikirim, toggle
            const newIsOpen = typeof isClaimOpen === 'boolean' ? isClaimOpen : !event.isClaimOpen;
            const newClaimOpensAt = claimOpensAt !== undefined ? claimOpensAt : (newIsOpen ? 'open' : 'closed');

            const [updated] = await db
                .update(events)
                .set({
                    isClaimOpen: newIsOpen,
                    claimOpensAt: newClaimOpensAt,
                    updatedAt: new Date()
                })
                .where(eq(events.id, id))
                .returning();

            res.json({
                success: true,
                isClaimOpen: updated.isClaimOpen,
                claimOpensAt: updated.claimOpensAt,
                event: updated
            });
        } catch (error) {
            console.error("SipenaEventsController.toggleClaim error:", error);
            res.status(500).json({ error: "Failed to toggle event claim status" });
        }
    }
};

// ── PENULIS (AUTHORS) ──
function saveAvatarIfBase64(imageStr: any, userId: string): string | undefined {
    if (!imageStr || typeof imageStr !== "string") return imageStr;
    if (imageStr.startsWith("data:image/")) {
        try {
            const matches = imageStr.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
            if (matches) {
                const rawExt = matches[1].toLowerCase();
                const ext = rawExt === "jpeg" ? ".jpg" : `.${rawExt}`;
                const buffer = Buffer.from(matches[2], "base64");
                const avatarsDir = path.join(process.cwd(), "uploads", "avatars");
                if (!fs.existsSync(avatarsDir)) {
                    fs.mkdirSync(avatarsDir, { recursive: true });
                }
                const filename = `avatar-${userId}-${Date.now()}${ext}`;
                fs.writeFileSync(path.join(avatarsDir, filename), buffer);
                return `/api/uploads/avatars/${filename}`;
            }
        } catch (err) {
            console.error("Failed to decode base64 avatar in sipenaController:", err);
        }
    }
    return imageStr;
}

export const SipenaAuthorsController = {
    getAll: async (req: Request, res: Response) => {
        try {
            const limitParam = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
            const limitClause = limitParam && !isNaN(limitParam) && limitParam > 0 ? sql`LIMIT ${limitParam}` : sql``;

            const result: any = await db.execute(sql`
                WITH author_books AS (
                  SELECT 
                    u.id,
                    u.name,
                    u.email,
                    u.role,
                    u.bio,
                    u.profesi,
                    u.domisili,
                    u.website,
                    u.image,
                    u.karya_eksternal,
                    COUNT(DISTINCT b.id)::int AS total_books
                  FROM "user" u
                  LEFT JOIN books b 
                    ON (b.author_id = u.id OR (u.name IS NOT NULL AND length(trim(u.name)) > 3 AND b.author_name ILIKE '%' || trim(u.name) || '%'))
                  WHERE u.role = 'penulis'
                  GROUP BY u.id, u.name, u.email, u.role, u.bio, u.profesi, u.domisili, u.website, u.image, u.karya_eksternal
                ),
                deduped AS (
                  SELECT DISTINCT ON (LOWER(TRIM(name)))
                    id,
                    name,
                    email,
                    role,
                    bio,
                    profesi,
                    domisili,
                    website,
                    image,
                    karya_eksternal,
                    total_books
                  FROM author_books
                  ORDER BY LOWER(TRIM(name)), total_books DESC, (image IS NOT NULL) DESC
                )
                SELECT * FROM deduped
                ORDER BY total_books DESC, (image IS NOT NULL) DESC, name ASC
                ${limitClause};
            `);

            const cleanBio = (text: string | null) => {
                if (!text) return "";
                return text.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
            };

            const rows = (result.rows || []).map((row: any) => ({
                id: row.id,
                name: row.name,
                email: row.email,
                role: row.role,
                bio: row.bio,
                bioPreview: cleanBio(row.bio),
                profesi: row.profesi,
                domisili: row.domisili,
                website: row.website,
                image: row.image,
                karyaEksternal: row.karya_eksternal,
                totalBooks: parseInt(row.total_books, 10) || 0
            }));

            res.json(rows);
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

            const {
                bio, profesi, domisili, website, karyaEksternal, image, fotoProfil, token, name, namaLengkap,
                tempatLahir, tanggalLahir, pekerjaan, instansi, alamat, alamatLengkap,
                provinsi, kota, kecamatan, kelurahan, phone
            } = req.body;

            const isInstantToken = token && typeof token === "string" && token.trim().toUpperCase() === "PERPUSNAS-PENULIS-2026";
            const newRole = isInstantToken ? "penulis" : "calon_penulis";
            const newStatus = isInstantToken ? "active" : "pending";

            const updateData: Record<string, any> = {
                role: newRole,
                status: newStatus,
                updatedAt: new Date()
            };

            const authorName = name || namaLengkap;
            if (authorName) updateData.name = authorName;
            if (bio !== undefined) updateData.bio = bio;
            if (profesi !== undefined) updateData.profesi = profesi;
            if (domisili !== undefined) updateData.domisili = domisili;
            if (website !== undefined) updateData.website = website;

            if (karyaEksternal !== undefined) {
                let parsed = karyaEksternal;
                if (typeof parsed === "string") {
                    try { parsed = JSON.parse(parsed); } catch (e) {}
                }
                updateData.karyaEksternal = parsed;
            }

            const rawImage = image || fotoProfil;
            if (rawImage !== undefined) {
                updateData.image = saveAvatarIfBase64(rawImage, userId);
            }

            // Biodata fields
            if (tempatLahir !== undefined) updateData.tempatLahir = tempatLahir;
            if (tanggalLahir !== undefined) updateData.tanggalLahir = tanggalLahir;
            if (pekerjaan !== undefined) updateData.pekerjaan = pekerjaan;
            if (instansi !== undefined) updateData.instansi = instansi;
            if (alamatLengkap !== undefined) updateData.alamatLengkap = alamatLengkap;
            else if (alamat !== undefined) updateData.alamatLengkap = alamat;
            if (provinsi !== undefined) updateData.provinsi = provinsi;
            if (kota !== undefined) updateData.kota = kota;
            if (kecamatan !== undefined) updateData.kecamatan = kecamatan;
            if (kelurahan !== undefined) updateData.kelurahan = kelurahan;
            if (phone !== undefined) updateData.phone = phone;

            const [updated] = await db
                .update(users)
                .set(updateData)
                .where(eq(users.id, userId))
                .returning();

            res.json({
                success: true,
                role: updated.role,
                status: updated.status,
                user: updated,
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

            const {
                bio, profesi, domisili, website, karyaEksternal, image, fotoProfil, name, namaLengkap,
                tempatLahir, tanggalLahir, pekerjaan, status, instansi, alamat, alamatLengkap,
                provinsi, kota, kecamatan, kelurahan, phone
            } = req.body;

            const updateData: Record<string, any> = {
                updatedAt: new Date()
            };

            const authorName = name || namaLengkap;
            if (authorName !== undefined) updateData.name = authorName;
            if (bio !== undefined) updateData.bio = bio;
            if (profesi !== undefined) updateData.profesi = profesi;
            if (domisili !== undefined) updateData.domisili = domisili;
            if (website !== undefined) updateData.website = website;

            if (karyaEksternal !== undefined) {
                let parsed = karyaEksternal;
                if (typeof parsed === "string") {
                    try { parsed = JSON.parse(parsed); } catch (e) {}
                }
                updateData.karyaEksternal = parsed;
            }

            const rawImage = image || fotoProfil;
            if (rawImage !== undefined) {
                updateData.image = saveAvatarIfBase64(rawImage, userId);
            }

            // Biodata fields
            if (tempatLahir !== undefined) updateData.tempatLahir = tempatLahir;
            if (tanggalLahir !== undefined) updateData.tanggalLahir = tanggalLahir;
            if (pekerjaan !== undefined) updateData.pekerjaan = pekerjaan;
            if (instansi !== undefined) updateData.instansi = instansi;
            if (alamatLengkap !== undefined) updateData.alamatLengkap = alamatLengkap;
            else if (alamat !== undefined) updateData.alamatLengkap = alamat;
            if (provinsi !== undefined) updateData.provinsi = provinsi;
            if (kota !== undefined) updateData.kota = kota;
            if (kecamatan !== undefined) updateData.kecamatan = kecamatan;
            if (kelurahan !== undefined) updateData.kelurahan = kelurahan;
            if (phone !== undefined) updateData.phone = phone;

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

// ── LAPORAN TERPADU SIPENA (Katalog Buku, Manajemen Naskah, Pengguna, Kegiatan) ──
export const SipenaReportsController = {
    getComprehensiveReport: async (req: Request, res: Response) => {
        try {
            const requestedYear = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
            const selectedYear = isNaN(requestedYear) ? new Date().getFullYear() : requestedYear;

            // 1. DATA KATALOG BUKU
            const allBooks = await db.query.books.findMany({
                orderBy: (b, { desc }) => [desc(b.createdAt)],
                with: { author: true }
            });

            const kategoriMap = new Map<string, { count: number, downloads: number, reads: number }>();
            let totalBukuDownloads = 0;
            let totalBukuReads = 0;

            allBooks.forEach(b => {
                const cat = (b.category || 'Umum').trim();
                const dls = b.downloadCount || 0;
                const rds = b.readCount || 0;
                totalBukuDownloads += dls;
                totalBukuReads += rds;

                const curr = kategoriMap.get(cat) || { count: 0, downloads: 0, reads: 0 };
                kategoriMap.set(cat, {
                    count: curr.count + 1,
                    downloads: curr.downloads + dls,
                    reads: curr.reads + rds,
                });
            });

            const kategoriStats = Array.from(kategoriMap.entries()).map(([kategori, st]) => ({
                kategori,
                totalJudul: st.count,
                totalUnduh: st.downloads,
                totalBaca: st.reads
            })).sort((a, b) => b.totalJudul - a.totalJudul);

            // Monthly trends for selectedYear
            const monthlyReadsDb = await db
                .select({
                    month: sql<number>`EXTRACT(MONTH FROM ${bookReads.createdAt})::int`,
                    count: count()
                })
                .from(bookReads)
                .where(sql`EXTRACT(YEAR FROM ${bookReads.createdAt}) = ${selectedYear}`)
                .groupBy(sql`EXTRACT(MONTH FROM ${bookReads.createdAt})`);

            const monthlyDownloadsDb = await db
                .select({
                    month: sql<number>`EXTRACT(MONTH FROM ${bookDownloads.downloadedAt})::int`,
                    count: count()
                })
                .from(bookDownloads)
                .where(sql`EXTRACT(YEAR FROM ${bookDownloads.downloadedAt}) = ${selectedYear}`)
                .groupBy(sql`EXTRACT(MONTH FROM ${bookDownloads.downloadedAt})`);

            const readsMap = new Map<number, number>();
            monthlyReadsDb.forEach(r => readsMap.set(Number(r.month), Number(r.count || 0)));

            const dlMap = new Map<number, number>();
            monthlyDownloadsDb.forEach(d => dlMap.set(Number(d.month), Number(d.count || 0)));

            const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

            // Data tren bulanan 100% riil dari database (tanpa baseline fiktif)
            const monthlyTrends = MONTH_NAMES.map((name, idx) => {
                const monthNum = idx + 1;
                return {
                    month: name,
                    monthNum,
                    dibaca: readsMap.get(monthNum) || 0,
                    diunduh: dlMap.get(monthNum) || 0,
                };
            });

            // Top Books
            const topBuku = allBooks
                .slice()
                .sort((a, b) => ((b.downloadCount || 0) + (b.readCount || 0)) - ((a.downloadCount || 0) + (a.readCount || 0)))
                .slice(0, 10)
                .map((b, i) => ({
                    rank: i + 1,
                    id: b.id,
                    judul: b.title,
                    penulis: b.authorName || (b.author ? b.author.name : 'Penulis Anonim'),
                    kategori: b.category || 'Umum',
                    unduhan: b.downloadCount || 0,
                    pembaca: b.readCount || 0,
                    ratingAvg: b.ratingAvg || 0,
                    ratingCount: b.ratingCount || 0,
                    status: b.status || 'published',
                    tahun: b.year,
                    isbn: b.isbn || b.isbnDigital,
                }));

            const bukuList = allBooks.map((b, i) => ({
                no: i + 1,
                id: b.id,
                judul: b.title,
                penulis: b.authorName || (b.author ? b.author.name : 'Penulis Anonim'),
                kategori: b.category || 'Umum',
                unduhan: b.downloadCount || 0,
                pembaca: b.readCount || 0,
                ratingAvg: b.ratingAvg || 0,
                status: b.status || 'published',
                tahun: b.year,
                isbn: b.isbn || b.isbnDigital || '-',
                nip: b.nip || '-',
                coverUrl: b.coverUrl,
                createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
            }));

            // 2. DATA MANAJEMEN NASKAH & PROYEK
            const allProjects = await ProjectService.getAllProjects();
            const now = new Date();

            let proyekAktif = 0;
            let proyekSelesai = 0;
            let proyekTerlambat = 0;

            const proyekList = allProjects.map((p, i) => {
                const stgs = p.stages || [];
                const totalStages = stgs.length;
                const doneStages = stgs.filter((s: any) => s.status === 'done').length;
                const isCompleted = totalStages > 0 && doneStages === totalStages;
                
                let hasOverdueStage = false;
                stgs.forEach((s: any) => {
                    if (s.status !== 'done' && s.deadline) {
                        const d = new Date(s.deadline);
                        if (d < now) hasOverdueStage = true;
                    }
                });

                if (isCompleted || p.status === 'archived') {
                    proyekSelesai++;
                } else {
                    proyekAktif++;
                }

                if (hasOverdueStage) {
                    proyekTerlambat++;
                }

                const currentStage = stgs.find((s: any) => s.status === 'active' || s.status === 'review' || s.status === 'revision') || stgs[stgs.length - 1];
                const calcProgress = totalStages > 0 ? Math.round((doneStages / totalStages) * 100) : 0;

                return {
                    no: i + 1,
                    id: p.id,
                    judul: p.title,
                    penulis: p.author || 'Anonim',
                    kategori: p.category,
                    tipe: p.type || 'Reguler',
                    status: isCompleted ? 'selesai' : p.status,
                    progress: calcProgress,
                    tahapTerkini: currentStage ? currentStage.label : 'Belum Mulai',
                    pjNama: currentStage?.pj?.name || 'Belum Ditugaskan',
                    deadline: currentStage?.deadline ? new Date(currentStage.deadline).toISOString() : null,
                    isOverdue: hasOverdueStage,
                    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
                };
            });

            // Pengajuan naskah luar dari tabel manuscripts
            const allManuscripts = await db.query.manuscripts.findMany({
                orderBy: (m, { desc }) => [desc(m.createdAt)],
                with: { author: true }
            });

            let pengajuanPending = 0;
            let pengajuanApproved = 0;
            let pengajuanRejected = 0;

            const pengajuanList = allManuscripts.map((m, i) => {
                if (m.status === 'approved') pengajuanApproved++;
                else if (m.status === 'rejected') pengajuanRejected++;
                else pengajuanPending++;

                return {
                    no: i + 1,
                    id: m.id,
                    judul: m.title,
                    penulisNama: m.author?.name || 'Penulis',
                    penulisEmail: m.author?.email || '-',
                    kategori: m.category || 'Umum',
                    status: m.status || 'pending',
                    fileUrl: m.fileUrl,
                    createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
                    reviewerNotes: m.reviewerNotes || null,
                };
            });

            // 3. DATA PENGGUNA SISTEM
            const allUsers = await db.query.users.findMany({
                orderBy: (u, { desc }) => [desc(u.createdAt)]
            });

            const roleCounts: Record<string, number> = {
                admin: 0,
                personil: 0,
                penulis: 0,
                calon_penulis: 0,
                pengunjung: 0
            };
            const statusCounts = { active: 0, pending: 0, disabled: 0 };

            allUsers.forEach(u => {
                const r = (u.role || 'pengunjung').toLowerCase();
                roleCounts[r] = (roleCounts[r] || 0) + 1;
                const s = (u.status || 'active').toLowerCase() as keyof typeof statusCounts;
                if (statusCounts[s] !== undefined) statusCounts[s]++;
                else statusCounts.active++;
            });

            const roleLabels: Record<string, string> = {
                admin: 'Super Admin',
                personil: 'Personil Redaksi',
                penulis: 'Penulis Terdaftar',
                calon_penulis: 'Calon Penulis',
                pengunjung: 'Pengunjung Umum'
            };

            const roleStats = Object.keys(roleCounts).map(k => ({
                role: k,
                label: roleLabels[k] || k,
                count: roleCounts[k],
                percentage: allUsers.length > 0 ? Math.round((roleCounts[k] / allUsers.length) * 100) : 0
            }));

            // Agregasi aktivitas user
            const userReads = await db
                .select({ userId: bookReads.userId, count: count() })
                .from(bookReads)
                .where(sql`${bookReads.userId} IS NOT NULL`)
                .groupBy(bookReads.userId);

            const userDownloads = await db
                .select({ userId: bookDownloads.userId, count: count() })
                .from(bookDownloads)
                .where(sql`${bookDownloads.userId} IS NOT NULL`)
                .groupBy(bookDownloads.userId);

            const userSessions = await db
                .select({
                    userId: sessions.userId,
                    count: count(),
                    lastActive: sql<string>`MAX(${sessions.updatedAt})`
                })
                .from(sessions)
                .groupBy(sessions.userId);

            const uReadsMap = new Map<string, number>();
            userReads.forEach(r => { if (r.userId) uReadsMap.set(r.userId, Number(r.count || 0)); });

            const uDownloadsMap = new Map<string, number>();
            userDownloads.forEach(d => { if (d.userId) uDownloadsMap.set(d.userId, Number(d.count || 0)); });

            const uSessionsMap = new Map<string, { count: number, lastActive: string | null }>();
            userSessions.forEach(s => {
                if (s.userId) uSessionsMap.set(s.userId, {
                    count: Number(s.count || 0),
                    lastActive: s.lastActive ? new Date(s.lastActive).toISOString() : null
                });
            });

            const topActiveUsers = allUsers
                .map(u => {
                    const r = uReadsMap.get(u.id) || 0;
                    const d = uDownloadsMap.get(u.id) || 0;
                    const sess = uSessionsMap.get(u.id) || { count: 0, lastActive: null };
                    const totalAktivitas = (r * 2) + (d * 3) + sess.count;
                    return {
                        id: u.id,
                        nama: u.name,
                        email: u.email,
                        role: roleLabels[u.role || 'pengunjung'] || u.role,
                        bukuDibaca: r,
                        bukuDiunduh: d,
                        loginCount: sess.count,
                        totalAktivitas,
                        terakhirAktif: sess.lastActive || (u.updatedAt ? new Date(u.updatedAt).toISOString() : null),
                    };
                })
                .sort((a, b) => b.totalAktivitas - a.totalAktivitas)
                .slice(0, 15);

            const authorUsers = allUsers.filter(u => u.role === 'penulis');
            const authorBooksCount = new Map<string, number>();
            allBooks.forEach(b => {
                if (b.authorId) authorBooksCount.set(b.authorId, (authorBooksCount.get(b.authorId) || 0) + 1);
            });

            const penulisList = authorUsers.map((u, i) => ({
                no: i + 1,
                id: u.id,
                nama: u.name,
                email: u.email,
                profesi: u.profesi || 'Penulis SiPena',
                domisili: u.domisili || (u.kota ? `${u.kota}, ${u.provinsi || ''}` : '-'),
                totalBukuTerbit: authorBooksCount.get(u.id) || 0,
                status: u.status || 'active',
                createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
            }));

            // 4. DATA KEGIATAN & SERTIFIKAT
            const allEvents = await db.query.events.findMany({
                orderBy: (e, { desc }) => [desc(e.date)],
                with: { participants: true }
            });

            let totalPesertaTerdaftar = 0;
            let totalSertifikatKlaim = 0;

            const kegiatanList = allEvents.map((ev, i) => {
                const parts = ev.participants || [];
                const totalDaftar = parts.length;
                const totalHadir = parts.filter((p: any) => p.status === 'Hadir' || p.certificateNumber).length;
                const pct = totalDaftar > 0 ? Math.round((totalHadir / totalDaftar) * 100) : 0;

                totalPesertaTerdaftar += totalDaftar;
                totalSertifikatKlaim += totalHadir;

                return {
                    no: i + 1,
                    id: ev.id,
                    judul: ev.title,
                    tanggal: ev.date ? new Date(ev.date).toISOString() : new Date().toISOString(),
                    lokasi: ev.location || (ev.zoomUrl ? 'Virtual Zoom' : 'Perpusnas Press'),
                    tipe: ev.zoomUrl ? 'Virtual Zoom' : 'Tatap Muka',
                    status: ev.status || 'Akan Datang',
                    token: ev.certificateToken || '-',
                    isClaimOpen: !!ev.isClaimOpen,
                    totalPeserta: totalDaftar,
                    totalHadir,
                    persentaseHadir: pct,
                };
            });

            const allParts = await db.query.eventParticipants.findMany({
                orderBy: (p, { desc }) => [desc(p.claimedAt)],
                limit: 20,
                with: { event: true }
            });

            const pesertaTerbaru = allParts.map(p => ({
                id: p.id,
                kegiatanJudul: p.event?.title || 'Kegiatan Literasi',
                namaPeserta: p.name,
                email: p.email,
                instansi: p.institution || '-',
                nomorSertifikat: p.certificateNumber || '-',
                waktuKlaim: p.claimedAt ? new Date(p.claimedAt).toISOString() : new Date().toISOString(),
            }));

            const reportYears = Array.from(new Set(allBooks.map(b => b.year).filter((y): y is number => typeof y === 'number' && y >= 2015))).sort((a, b) => b - a);
            const availableYears = reportYears.length > 0 ? reportYears : [2026, 2025, 2024, 2023, 2022];
            if (!availableYears.includes(selectedYear)) {
                availableYears.unshift(selectedYear);
            }

            res.json({
                selectedYear,
                availableYears,
                overview: {
                    totalBukuTerbit: allBooks.length,
                    totalProyekNaskah: allProjects.length,
                    totalPengguna: allUsers.length,
                    totalKegiatan: allEvents.length,
                    totalUnduhan: totalBukuDownloads,
                    totalPembaca: totalBukuReads,
                    totalNaskahMasuk: allManuscripts.length,
                    totalSertifikatDiterbitkan: totalSertifikatKlaim,
                },
                katalogBuku: {
                    total: allBooks.length,
                    totalUnduh: totalBukuDownloads,
                    totalBaca: totalBukuReads,
                    kategoriStats,
                    monthlyTrends,
                    topBuku,
                    bukuList,
                },
                manajemenNaskah: {
                    totalProyek: allProjects.length,
                    proyekAktif,
                    proyekSelesai,
                    proyekTerlambat,
                    totalPengajuan: allManuscripts.length,
                    pengajuanPending,
                    pengajuanApproved,
                    pengajuanRejected,
                    proyekList,
                    pengajuanList,
                },
                pengguna: {
                    total: allUsers.length,
                    roleStats,
                    statusStats: statusCounts,
                    topActiveUsers,
                    penulisList,
                    recentUsers: allUsers.slice(0, 10).map(u => ({
                        id: u.id,
                        nama: u.name,
                        email: u.email,
                        role: roleLabels[u.role || 'pengunjung'] || u.role,
                        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
                        status: u.status || 'active',
                    })),
                },
                kegiatan: {
                    totalKegiatan: allEvents.length,
                    totalPesertaTerdaftar,
                    totalSertifikatKlaim,
                    rataRataKehadiran: allEvents.length > 0 && totalPesertaTerdaftar > 0
                        ? Math.round((totalSertifikatKlaim / totalPesertaTerdaftar) * 100) : 0,
                    kegiatanList,
                    pesertaTerbaru,
                }
            });
        } catch (error) {
            console.error("SipenaReportsController.getComprehensiveReport error:", error);
            res.status(500).json({ error: "Failed to generate comprehensive report" });
        }
    }
};
