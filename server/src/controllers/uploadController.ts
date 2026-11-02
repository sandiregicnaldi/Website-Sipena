import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
const coversDir = path.join(uploadDir, "covers");
const documentsDir = path.join(uploadDir, "documents");

[uploadDir, coversDir, documentsDir].forEach(d => {
    if (!fs.existsSync(d)) {
        fs.mkdirSync(d, { recursive: true });
    }
});

// Configure multer storage for general attachments
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// Storage for Cover Images (PNG, JPG, JPEG, WEBP, max 5MB)
const coverStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync(coversDir)) {
            fs.mkdirSync(coversDir, { recursive: true });
        }
        cb(null, coversDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase() || '.png';
        cb(null, 'cover-' + uniqueSuffix + ext);
    }
});

// Storage for Dummy PDF Documents (PDF only, max 50MB)
const docStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync(documentsDir)) {
            fs.mkdirSync(documentsDir, { recursive: true });
        }
        cb(null, documentsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'dummy-' + uniqueSuffix + '.pdf');
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const uploadCoverMulter = multer({
    storage: coverStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const allowedExts = ['.png', '.jpg', '.jpeg', '.webp'];
        const allowedMimes = ['image/png', 'image/x-png', 'image/jpeg', 'image/jpg', 'image/webp'];
        const isValid = allowedMimes.includes(file.mimetype) || allowedExts.includes(ext);
        if (isValid) {
            cb(null, true);
        } else {
            cb(new Error("Hanya berkas gambar format .PNG, .JPG, atau .WEBP yang diperbolehkan untuk sampul"));
        }
    }
});

const uploadDocMulter = multer({
    storage: docStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const isPdf = file.mimetype === 'application/pdf' || ext === '.pdf';
        if (isPdf) {
            cb(null, true);
        } else {
            cb(new Error("Hanya berkas format .PDF yang diperbolehkan untuk dummy final"));
        }
    }
});

export const UploadController = {
    // Middleware
    uploadSingle: (req: Request, res: Response, next: any) => {
        upload.any()(req, res, (err) => {
            if (err) {
                if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: "Ukuran berkas maksimal 10 MB" });
                }
                return res.status(400).json({ error: err.message || "Gagal mengunggah berkas" });
            }
            if ((req as any).files && Array.isArray((req as any).files) && (req as any).files.length > 0) {
                req.file = (req as any).files[0];
            }
            next();
        });
    },
    uploadCover: (req: Request, res: Response, next: any) => {
        uploadCoverMulter.any()(req, res, (err) => {
            if (err) {
                if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: "Ukuran berkas sampul maksimal 5 MB" });
                }
                return res.status(400).json({ error: err.message || "Gagal mengunggah gambar sampul" });
            }
            if ((req as any).files && Array.isArray((req as any).files) && (req as any).files.length > 0) {
                req.file = (req as any).files[0];
            }
            next();
        });
    },
    uploadDocument: (req: Request, res: Response, next: any) => {
        uploadDocMulter.any()(req, res, (err) => {
            if (err) {
                if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: "Ukuran berkas dummy final maksimal 50 MB" });
                }
                return res.status(400).json({ error: err.message || "Gagal mengunggah berkas dummy final" });
            }
            if ((req as any).files && Array.isArray((req as any).files) && (req as any).files.length > 0) {
                req.file = (req as any).files[0];
            }
            next();
        });
    },

    // Handler
    async handleUpload(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: "Tidak ada file yang diunggah" });
            }
            const fileUrl = `/api/uploads/${req.file.filename}`;
            res.json({ url: fileUrl, filename: req.file.originalname, size: req.file.size });
        } catch (error) {
            console.error("Upload error:", error);
            res.status(500).json({ error: "Gagal mengunggah file" });
        }
    },

    async handleUploadCover(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: "Tidak ada file sampul yang diunggah" });
            }
            const fileUrl = `/api/uploads/covers/${req.file.filename}`;
            res.json({ url: fileUrl, filename: req.file.originalname, size: req.file.size });
        } catch (error: any) {
            console.error("Upload cover error:", error);
            res.status(500).json({ error: error.message || "Gagal mengunggah file sampul" });
        }
    },

    async handleUploadDocument(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: "Tidak ada file dummy PDF yang diunggah" });
            }
            const fileUrl = `/api/uploads/documents/${req.file.filename}`;
            res.json({ url: fileUrl, filename: req.file.originalname, size: req.file.size });
        } catch (error: any) {
            console.error("Upload document error:", error);
            res.status(500).json({ error: error.message || "Gagal mengunggah file dummy PDF" });
        }
    }
};
