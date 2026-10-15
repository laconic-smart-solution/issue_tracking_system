import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

export class StorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = config.storage.uploadDir;
    this.ensureDirectory(this.baseDir);
  }

  private ensureDirectory(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Save incoming file stream (e.g. from LINE Content API) to Windows disk
   */
  async saveFileStream(
    stream: Readable,
    ticketId: string,
    fileExtension: string = '.jpg',
    mimeType: string = 'image/jpeg'
  ): Promise<{ fileName: string; filePath: string; relativePath: string; fileSize: number }> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');

    const ticketDir = path.join(this.baseDir, year, month, ticketId);
    this.ensureDirectory(ticketDir);

    const fileName = `${uuidv4()}${fileExtension}`;
    const absolutePath = path.join(ticketDir, fileName);
    const relativePath = path.join('uploads', year, month, ticketId, fileName).replace(/\\/g, '/');

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(absolutePath);
      let size = 0;

      stream.on('data', (chunk) => {
        size += chunk.length;
      });

      stream.pipe(writeStream);

      writeStream.on('finish', () => {
        resolve({
          fileName,
          filePath: absolutePath,
          relativePath,
          fileSize: size,
        });
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    });
  }
}

export const storageService = new StorageService();
