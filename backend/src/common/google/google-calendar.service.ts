import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../crypto/encryption.service';

export interface CalendarEventInput {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
}

const TIME_ZONE = 'Asia/Seoul';
const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly encryption: EncryptionService,
  ) {}

  // 생성 성공 시 구글 이벤트 ID 반환, 실패 시 null (호출부는 best-effort)
  async createEvent(refreshTokenEnc: string, input: CalendarEventInput): Promise<string | null> {
    const accessToken = await this.getAccessToken(refreshTokenEnc);
    if (!accessToken) return null;
    try {
      const res = await fetch(EVENTS_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(this.toEventBody(input)),
      });
      if (!res.ok) {
        this.logger.warn(`구글 캘린더 일정 생성 실패: ${res.status}`);
        return null;
      }
      const data = (await res.json()) as { id?: string };
      return data.id ?? null;
    } catch (err) {
      this.logger.warn('구글 캘린더 일정 생성 오류', err as Error);
      return null;
    }
  }

  async updateEvent(refreshTokenEnc: string, eventId: string, input: CalendarEventInput): Promise<void> {
    const accessToken = await this.getAccessToken(refreshTokenEnc);
    if (!accessToken) return;
    try {
      const res = await fetch(`${EVENTS_URL}/${eventId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(this.toEventBody(input)),
      });
      if (!res.ok) this.logger.warn(`구글 캘린더 일정 수정 실패: ${res.status}`);
    } catch (err) {
      this.logger.warn('구글 캘린더 일정 수정 오류', err as Error);
    }
  }

  async deleteEvent(refreshTokenEnc: string, eventId: string): Promise<void> {
    const accessToken = await this.getAccessToken(refreshTokenEnc);
    if (!accessToken) return;
    try {
      const res = await fetch(`${EVENTS_URL}/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      // 이미 삭제(410)/없음(404)은 정상 취급
      if (!res.ok && res.status !== 404 && res.status !== 410) {
        this.logger.warn(`구글 캘린더 일정 삭제 실패: ${res.status}`);
      }
    } catch (err) {
      this.logger.warn('구글 캘린더 일정 삭제 오류', err as Error);
    }
  }

  private toEventBody(input: CalendarEventInput) {
    return {
      summary: input.summary,
      description: input.description ?? '',
      start: { dateTime: input.start.toISOString(), timeZone: TIME_ZONE },
      end: { dateTime: input.end.toISOString(), timeZone: TIME_ZONE },
    };
  }

  // 저장된 리프레시 토큰(암호화)으로 access token 발급
  private async getAccessToken(refreshTokenEnc: string): Promise<string | null> {
    let refreshToken: string;
    try {
      refreshToken = this.encryption.decrypt(refreshTokenEnc);
    } catch {
      this.logger.warn('리프레시 토큰 복호화 실패');
      return null;
    }

    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      this.logger.warn('GOOGLE_CLIENT_ID/SECRET 미설정');
      return null;
    }

    try {
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      if (!res.ok) {
        this.logger.warn(`구글 액세스 토큰 갱신 실패: ${res.status}`);
        return null;
      }
      const data = (await res.json()) as { access_token?: string };
      return data.access_token ?? null;
    } catch (err) {
      this.logger.warn('구글 액세스 토큰 갱신 오류', err as Error);
      return null;
    }
  }
}
