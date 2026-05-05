import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { WBS_GENERATOR_SYSTEM_PROMPT } from '../../prompts/wbs-generator.prompt';

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
    this.modelName = this.config.get('GEMINI_MODEL', 'gemini-1.5-flash');

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

  private async generateWithGemini(documentText: string): Promise<WbsGenerationResult> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: WBS_GENERATOR_SYSTEM_PROMPT,
      });

      const result = await model.generateContent(
        `<input_data>\n${documentText}\n</input_data>`,
      );

      const text = result.response.text().trim();
      const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      const parsed: WbsGenerationResult = JSON.parse(cleaned);

      if (!parsed.wbs_tasks || !Array.isArray(parsed.wbs_tasks)) {
        throw new Error('WBS 태스크가 올바른 형식이 아닙니다.');
      }

      return parsed;
    } catch (err) {
      this.logger.error('Gemini WBS 생성 실패', err);
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
