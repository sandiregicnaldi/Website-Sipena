import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Sanitize and create unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// Configure upload limits and file types if necessary
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export const UploadController = {
    // Middleware
    uploadSingle: upload.single('attachment'),

    // Handler
    async handleUpload(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: "Tidak ada file yang diunggah" });
            }
            
            // Construct the file URL
            const fileUrl = `/api/uploads/${req.file.filename}`;
            
            res.json({ url: fileUrl, filename: req.file.originalname });
        } catch (error) {
            console.error("Upload error:", error);
            res.status(500).json({ error: "Gagal mengunggah file" });
        }
    }
};
