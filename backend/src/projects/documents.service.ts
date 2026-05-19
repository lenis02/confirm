import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';
import { ProjectsService } from './projects.service';
import { WbsService } from './wbs.service';
import { Document, DocumentStatus } from './entities/document.entity';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'documents');

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly projectsService: ProjectsService,
    private readonly wbsService: WbsService,
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(
    userId: string,
    projectId: string,
    file: Express.Multer.File,
  ): Promise<Document> {
    await this.projectsService.findOne(userId, projectId);

    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(this.uploadDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    const document = this.documentRepo.create({
      projectId,
      uploadedById: userId,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      filePath,
      status: DocumentStatus.PENDING,
    });
    const saved = await this.documentRepo.save(document);

    // 비동기 처리 — 응답 즉시 반환 후 백그라운드에서 실행
    setImmediate(() => this.processDocument(saved.id).catch((e) => this.logger.error(e)));

    return saved;
  }

  async findAll(userId: string, projectId: string, status?: DocumentStatus): Promise<Document[]> {
    await this.projectsService.findOne(userId, projectId);
    const where: any = { projectId };
    if (status) where.status = status;
    return this.documentRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(userId: string, projectId: string, documentId: string): Promise<Document> {
    await this.projectsService.findOne(userId, projectId);
    const document = await this.documentRepo.findOne({ where: { id: documentId, projectId } });
    if (!document) throw new NotFoundException('문서를 찾을 수 없습니다.');
    return document;
  }

  private async processDocument(documentId: string): Promise<void> {
    const document = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!document) return;

    try {
      await this.documentRepo.update(documentId, { status: DocumentStatus.IN_PROGRESS });

      const text = await this.extractPdfText(document.filePath);

      await this.documentRepo.update(documentId, { parsedContent: text });
      await this.wbsService.generateFromDocument(document.projectId, documentId, text);
      await this.documentRepo.update(documentId, { status: DocumentStatus.COMPLETED });
    } catch (err) {
      this.logger.error(`문서 처리 실패: ${documentId}`, err);
      await this.documentRepo.update(documentId, {
        status: DocumentStatus.FAILED,
        errorMessage: err instanceof Error ? err.message : '알 수 없는 오류',
      });
    }
  }

  private async extractPdfText(filePath: string): Promise<string> {
    const fileBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: fileBuffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
}
