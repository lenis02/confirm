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

    // multipart 파일명은 multer가 latin1로 디코딩하므로 UTF-8로 복원 (한글 깨짐 방지)
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const fileName = `${Date.now()}-${originalName}`;
    const filePath = path.join(this.uploadDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    const document = this.documentRepo.create({
      projectId,
      uploadedById: userId,
      fileName: originalName,
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

  async remove(userId: string, projectId: string, documentId: string): Promise<void> {
    const document = await this.findOne(userId, projectId, documentId);
    // 디스크 파일 삭제 — Render 등 ephemeral 환경에선 이미 없을 수 있어 존재 시에만
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }
    // documents 행 삭제 — project_wbs.document_id는 FK onDelete:SET NULL로 자동 처리
    await this.documentRepo.delete(documentId);
  }

  private async processDocument(documentId: string): Promise<void> {
    const document = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!document) return;

    try {
      await this.documentRepo.update(documentId, { status: DocumentStatus.IN_PROGRESS });

      const text = await this.extractPdfText(document.filePath);

      await this.documentRepo.update(documentId, { parsedContent: text });

      // 분석 도중 취소(삭제)된 문서면 WBS 생성·덮어쓰기를 중단
      const stillExists = await this.documentRepo.findOne({ where: { id: documentId } });
      if (!stillExists) return;

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
