import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface SavedAsset {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  extractedText: string;
}

export class StorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  computeHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  saveFile(file: Express.Multer.File): SavedAsset {
    const sha256 = this.computeHash(file.buffer);
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}_${sha256.substring(0, 12)}${ext}`;
    const targetPath = path.join(this.uploadDir, filename);

    fs.writeFileSync(targetPath, file.buffer);

    let extractedText = '';
    if (file.mimetype.startsWith('text/') || ext === '.txt' || ext === '.md' || ext === '.json') {
      extractedText = file.buffer.toString('utf-8').slice(0, 10000);
    } else {
      extractedText = `[Uploaded Binary File: ${file.originalname} (${file.mimetype}, ${file.size} bytes)]`;
    }

    return {
      storageKey: filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      sha256,
      extractedText,
    };
  }
}

export const storageService = new StorageService();

