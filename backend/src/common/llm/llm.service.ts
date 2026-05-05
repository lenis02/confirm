import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface WbsItemRaw {
  order: number;
  phase: string;
  title: string;
  description: string;
  assignedRole: string;
  durationDays: number;
  startDate: string;
  endDate: string;
  isDecisionPoint: boolean;
}

export interface WbsGenerationResult {
  projectSummary: string;
  items: WbsItemRaw[];
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = this.config.get('GEMINI_MODEL', 'gemini-1.5-flash');
  }

  async generateWbs(documentText: string): Promise<WbsGenerationResult> {
    const today = new Date().toISOString().split('T')[0];

    const prompt = `당신은 PM(프로젝트 매니저)을 위한 WBS 생성 전문가입니다.
아래 프로젝트 문서를 분석하여 상세한 WBS(Work Breakdown Structure)를 생성하세요.

[프로젝트 문서]
${documentText}

반드시 아래 JSON 형식으로만 응답하세요. 마크다운 코드블록 없이 순수 JSON만 출력하세요:
{
  "projectSummary": "프로젝트 핵심 내용 요약 (2-3문장)",
  "items": [
    {
      "order": 1,
      "phase": "계획",
      "title": "업무명",
      "description": "업무 상세 설명",
      "assignedRole": "PM",
      "durationDays": 5,
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "isDecisionPoint": false
    }
  ]
}

규칙:
- items는 10~20개로 구성 (프로젝트 규모에 따라 조정)
- phase는 "계획", "분석", "설계", "개발", "테스트", "배포", "유지보수" 중 선택
- isDecisionPoint가 true인 항목은 3~5개 (주요 의사결정 마일스톤)
- startDate는 오늘(${today})부터 시작하여 순차적으로 배치
- 날짜는 YYYY-MM-DD 형식`;

    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // 마크다운 코드블록 제거
      const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      const parsed: WbsGenerationResult = JSON.parse(cleaned);

      if (!parsed.items || !Array.isArray(parsed.items)) {
        throw new Error('WBS 항목이 올바른 형식이 아닙니다.');
      }

      return parsed;
    } catch (err) {
      this.logger.error('Gemini WBS 생성 실패', err);
      throw new InternalServerErrorException('WBS 생성 중 오류가 발생했습니다.');
    }
  }
}
