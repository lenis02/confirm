import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { WBS_GENERATOR_SYSTEM_PROMPT } from '../../prompts/wbs-generator.prompt';
import { MEETING_RECOMMENDER_SYSTEM_PROMPT } from '../../prompts/meeting-recommender.prompt';

// --- Claude API (추후 전환 시 주석 해제) ---
// import Anthropic from '@anthropic-ai/sdk';

export interface TeamResourceRaw {
  department: string;
  role: string;
  experience_level: string;
}

export interface WbsTaskRaw {
  task_id: string;
  task_name: string;
  department: string;
  complexity: string;
  duration_days: number;
  start_date: string;
  end_date: string;
  dependencies: string[];
  reasoning: string;
}

export interface WbsGenerationResult {
  project_context: {
    background_and_goals: string;
    total_duration: string;
    team_resources: TeamResourceRaw[];
  };
  wbs_tasks: WbsTaskRaw[];
}

export interface MeetingRecommendationRaw {
  title: string;
  meeting_type: string;
  suggested_date: string;
  reason: string;
  related_phase?: string;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  // --- Gemini ---
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName: string;

  // --- Claude (추후 전환 시 주석 해제) ---
  // private readonly client: Anthropic;
  // private readonly modelName: string;

  constructor(private readonly config: ConfigService) {
    // --- Gemini 초기화 ---
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = this.config.get('GEMINI_MODEL', 'gemini-2.5-flash');

    // --- Claude 초기화 (추후 전환 시 주석 해제) ---
    // const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    // if (!apiKey) throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.');
    // this.client = new Anthropic({ apiKey });
    // this.modelName = this.config.get('CLAUDE_MODEL', 'claude-sonnet-4-6');
  }

  async generateWbs(documentText: string): Promise<WbsGenerationResult> {
    // --- Gemini 호출 ---
    return this.generateWithGemini(documentText);

    // --- Claude 호출 (추후 전환 시 주석 해제 후 위 줄 제거) ---
    // return this.generateWithClaude(documentText);
  }

  async recommendMeetings(wbsContext: string): Promise<MeetingRecommendationRaw[]> {
    try {
      const text = await this.generateContentWithFallback(
        MEETING_RECOMMENDER_SYSTEM_PROMPT,
        `<wbs_data>\n${wbsContext}\n</wbs_data>`,
        'Gemini 회의 추천',
      );

      const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      const parsed: { recommendations?: MeetingRecommendationRaw[] } = JSON.parse(cleaned);

      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error('회의 추천 결과가 올바른 형식이 아닙니다.');
      }
      return parsed.recommendations;
    } catch (err) {
      this.logger.error(`Gemini 회의 추천 실패 (model=${this.modelName})`, err);
      throw new InternalServerErrorException('회의 추천 중 오류가 발생했습니다.');
    }
  }

  // 과부하 시 순차 시도할 모델 후보 (기본 모델 우선, 중복 제거)
  private get modelCandidates(): string[] {
    const fallbacks = ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-1.5-flash'];
    return [...new Set([this.modelName, ...fallbacks])];
  }

  // 일시적 오류(503 과부하 / 429 rate limit / 500)에 대해 지수 백오프 재시도
  private async callWithRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    const maxRetries = 3; // 최초 1회 + 재시도 3회 = 총 4회 (대기 1s, 2s, 4s)
    for (let attempt = 0; ; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const status = (err as { status?: number })?.status;
        const transient = status === 503 || status === 429 || status === 500;
        if (!transient || attempt >= maxRetries) throw err;

        const delayMs = 1000 * 2 ** attempt;
        this.logger.warn(
          `${label} 일시적 오류 (status=${status}) — ${delayMs}ms 후 재시도 (${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // 모델별로 재시도하다가 과부하(503)·레이트리밋(429)·모델없음(404)이 지속되면 다음 후보 모델로 폴백
  private async generateContentWithFallback(
    systemInstruction: string,
    userContent: string,
    label: string,
  ): Promise<string> {
    let lastErr: unknown;
    for (const modelName of this.modelCandidates) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName, systemInstruction });
        const result = await this.callWithRetry(
          () => model.generateContent(userContent),
          `${label} (model=${modelName})`,
        );
        if (modelName !== this.modelName) {
          this.logger.warn(`${label}: 기본 모델 대신 폴백 모델(${modelName})로 성공`);
        }
        return result.response.text().trim();
      } catch (err) {
        lastErr = err;
        const status = (err as { status?: number })?.status;
        const canFallback =
          status === 503 || status === 429 || status === 500 || status === 404;
        if (!canFallback) throw err;
        this.logger.warn(`${label}: ${modelName} 사용 불가(status=${status}) — 다음 모델로 폴백`);
      }
    }
    throw lastErr;
  }

  private async generateWithGemini(documentText: string): Promise<WbsGenerationResult> {
    try {
      const text = await this.generateContentWithFallback(
        WBS_GENERATOR_SYSTEM_PROMPT,
        `<input_data>\n${documentText}\n</input_data>`,
        'Gemini WBS 생성',
      );

      const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      const parsed: WbsGenerationResult = JSON.parse(cleaned);

      if (!parsed.wbs_tasks || !Array.isArray(parsed.wbs_tasks)) {
        throw new Error('WBS 태스크가 올바른 형식이 아닙니다.');
      }

      return parsed;
    } catch (err) {
      this.logger.error(`Gemini WBS 생성 실패 (model=${this.modelName})`, err);
      throw new InternalServerErrorException('WBS 생성 중 오류가 발생했습니다.');
    }
  }

  // --- Claude 구현체 (추후 전환 시 주석 해제) ---
  // private async generateWithClaude(documentText: string): Promise<WbsGenerationResult> {
  //   try {
  //     const response = await this.client.messages.create({
  //       model: this.modelName,
  //       max_tokens: 4000,
  //       system: WBS_GENERATOR_SYSTEM_PROMPT,
  //       messages: [{ role: 'user', content: `<input_data>\n${documentText}\n</input_data>` }],
  //     });
  //     const text = (response.content[0] as { type: string; text: string }).text.trim();
  //     const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  //     const parsed: WbsGenerationResult = JSON.parse(cleaned);
  //     if (!parsed.wbs_tasks || !Array.isArray(parsed.wbs_tasks)) {
  //       throw new Error('WBS 태스크가 올바른 형식이 아닙니다.');
  //     }
  //     return parsed;
  //   } catch (err) {
  //     this.logger.error('Claude WBS 생성 실패', err);
  //     throw new InternalServerErrorException('WBS 생성 중 오류가 발생했습니다.');
  //   }
  // }
}
