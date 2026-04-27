# Confirm (컨펌) — PM 전용 AI 에이전트 플랫폼

## 프로젝트 개요

**서비스명:** 컨펌(Confirm)
**핵심 콘셉트:** PM이 수행계획서를 업로드하면 WBS를 자동 생성하고, 회의 진행을 실시간으로 어시스트하며, 의사결정 이력까지 관리해 주는 AI 에이전트.

### 3대 핵심 기능
1. **WBS 자동 생성** — 문서(PDF) 업로드 → OCR + LLM 분석 → 팀/역할별 업무 배분 포함 WBS 생성 + 의사결정 마일스톤 추천
2. **회의 실시간 어시스트** — 유형별 표준 템플릿 제공 · 실시간 STT 체크리스트 검증 · 미결 Action Item 자동 이월
3. **통합 대시보드** — 주간 캘린더 UI · Naver Works·Notion API 알림 연동

---

## 기술 스택

### Backend (`/backend`)
- **Framework:** NestJS 11
- **ORM:** TypeORM 0.3 + PostgreSQL
- **Validation:** class-validator / class-transformer (GlobalValidationPipe 적용)
- **Config:** @nestjs/config (환경변수 `.env` 파일)
- **Global prefix:** `/api`

### LLM 파이프라인
- **Claude 3.5 / 4.6:** 대용량 문서(수행계획서) 분석, 복잡한 WBS 구조 설계
- **GPT-4o / Gemini Pro:** 실시간 회의 요약, 체크리스트 검증
- **Gemini:** 무료 토큰 범위 내 보조

### 기타
- **STT / Diarization:** 회의 음성 녹음·화자 분리
- **외부 연동:** Naver Works, Notion (OAuth / accessToken — AES-256 암호화 후 DB 저장)

---

## 디렉토리 구조

```
confirm/
├── backend/          # NestJS API 서버
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   ├── auth/           # 인증 (JWT, refresh token)
│   │   ├── users/          # 사용자 · 외부서비스 연동
│   │   ├── projects/       # 프로젝트 · WBS · Action Item
│   │   ├── meetings/       # 회의 · 템플릿 · 체크리스트 · STT
│   │   └── common/         # 공통 Guard, Pipe, Decorator
│   └── package.json
└── CLAUDE.md
```

> 모듈은 기능 단위(auth / users / projects / meetings)로 분리한다.  
> 각 모듈은 `module / controller / service / entity / dto` 파일 세트를 갖는다.

---

## API 엔드포인트 목록

### 인증 (`/api/auth`)
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/users/signup` | 회원가입 |
| POST | `/api/auth/login` | 로그인 (JWT 발급) |
| POST | `/api/auth/refresh` | Access Token 갱신 |
| POST | `/api/auth/logout` | 로그아웃 |

### 프로젝트 & WBS (`/api/projects`)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/projects` | 프로젝트 목록 조회 |
| POST | `/api/projects` | 프로젝트 생성 |
| GET | `/api/projects/{projectId}` | 프로젝트 상세 조회 |
| PUT | `/api/projects/{projectId}` | 프로젝트 수정 |
| DELETE | `/api/projects/{projectId}` | 프로젝트 삭제 |
| POST | `/api/projects/{projectId}/documents` | 문서 업로드 (수행계획서 등 PDF) |
| POST | `/api/projects/{projectId}/wbs/generate` | WBS 자동 생성 (LLM 호출) |
| GET | `/api/projects/{projectId}/wbs` | WBS 조회 |
| PUT | `/api/projects/{projectId}/wbs` | WBS 수동 수정 |
| POST | `/api/projects/{projectId}/action-items` | Action Item 수동 추가 |

### 회의 (`/api/meetings`)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/projects/{projectId}/meetings` | 회의 목록 조회 |
| POST | `/api/projects/{projectId}/meetings` | 회의 생성 |
| GET | `/api/meetings/{meetingId}` | 회의 상세 |
| PUT | `/api/meetings/{meetingId}` | 회의 수정 |
| GET | `/api/meetings/{meetingId}/template` | 회의 유형별 표준 템플릿 조회 |
| POST | `/api/meetings/{meetingId}/checklist` | 체크리스트 항목 생성 |
| PUT | `/api/meetings/{meetingId}/checklist/{itemId}` | 체크리스트 항목 상태 업데이트 |
| POST | `/api/meetings/{meetingId}/stt` | STT 텍스트 업로드 → 체크리스트 자동 검증 |
| GET | `/api/meetings/{meetingId}/summary` | 회의록 요약 조회 |
| GET | `/api/meetings/{meetingId}/action-items` | 미결 Action Item 목록 |

### 사용자 & 외부 서비스 연동 (`/api/users`)
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/users/me` | 내 프로필 조회 |
| PUT | `/api/users/me` | 내 프로필 수정 |
| POST | `/api/users/integrations` | 외부 서비스 연동 등록 (accessToken AES-256 암호화 저장) |
| GET | `/api/users/integrations` | 연동된 외부 서비스 목록 (ACTIVE/EXPIRED 상태 포함) |
| DELETE | `/api/users/integrations/{integrationId}` | 외부 서비스 연동 해제 (해제 시 알림 발송 중단) |

---

## 개발 규칙 & 컨벤션

### NestJS 패턴
- 모든 엔드포인트는 `@UseGuards(JwtAuthGuard)` 로 보호 (공개 API 제외)
- DTO는 class-validator 데코레이터 필수 사용
- 서비스 레이어에서만 비즈니스 로직 처리, 컨트롤러는 라우팅·DTO 변환만 담당
- Entity에 `synchronize: true` 는 개발 환경에서만 허용 (프로덕션에서는 Migration 사용)

### 보안
- accessToken(외부 서비스)은 **서버에서 AES-256 암호화 후 저장**, 평문 노출 금지
- 사용자당 동일 serviceType 연동은 1개로 제한
- 환경변수는 반드시 `.env` 파일로 관리 (절대 하드코딩 금지)

### LLM 호출
- WBS 생성·문서 분석은 Claude API 사용 (대용량 컨텍스트 처리)
- 실시간 STT 체크리스트 검증은 응답속도 우선 모델 사용
- LLM 호출은 별도 `LlmService` 로 추상화하여 모델 교체 가능하게 설계

### 코드 스타일
- TypeScript strict mode 유지
- 파일명: `kebab-case`, 클래스명: `PascalCase`, 변수/함수: `camelCase`
- 주석은 WHY가 불명확한 경우에만 작성

---

## 환경변수 (`.env`)

```
# DB
DB_HOST=
DB_PORT=5432
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=7d

# LLM
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=

# 암호화
AES_SECRET_KEY=        # 외부 서비스 accessToken 암호화용 (32바이트)

# 서버
PORT=3000
```

---

## 개발 우선순위 (멘토링 기준)

1. WBS 자동 생성 (핵심 기능)
2. 킥오프 회의 템플릿 & 체크리스트
3. 메인 화면 UI — 캘린더 중심, 프로젝트 목록, 의사결정 일정 표시
4. LLM 모델 성능 비교 테스트 (Claude / Gemini / GPT)
5. 외부 서비스 연동 (Naver Works, Notion)

---

## 로컬 개발 실행

```bash
cd backend
npm install
npm run start:dev   # http://localhost:3000/api
```
