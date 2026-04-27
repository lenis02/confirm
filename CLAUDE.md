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

> 인증: 구글 소셜 로그인 단일 방식. 이메일/비밀번호 로그인 미지원.

### 인증 (`/api/auth`)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| POST | `/api/auth/google` | 구글 OAuth 인가 코드로 JWT 발급. 신규 유저 자동 회원가입. AccessToken 2시간 / RefreshToken 2주 | 비로그인 |
| POST | `/api/auth/refresh` | RefreshToken으로 AccessToken 재발급. 만료 시 재로그인 요구 | 비로그인 |
| POST | `/api/auth/logout` | Access Token 삭제 | 로그인 |

### 사용자 (`/api/users`)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/users/me` | 로그인한 사용자 본인 정보 조회 | 로그인 |
| PATCH | `/api/users/me` | 이름, 직군 등 프로필 수정. 이메일 변경 불가 | 로그인 |
| POST | `/api/users/integrations` | 외부 서비스 연동 등록. accessToken AES-256 암호화 저장. 서비스당 1개 제한 | 로그인 |
| GET | `/api/users/integrations` | 연동된 외부 서비스 목록. ACTIVE/EXPIRED 상태 포함 | 로그인 |
| DELETE | `/api/users/integrations/{integrationId}` | 외부 서비스 연동 해제. 해제 시 알림 발송 중단 | 로그인 |

### 프로젝트 (`/api/projects`)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/projects` | PM이 속한 프로젝트 목록. 상태(ACTIVE/ARCHIVED) 필터링 | 로그인 |
| POST | `/api/projects` | 신규 프로젝트 생성. 프로젝트명·기간 등 기본 메타데이터 입력 | 로그인 |
| GET | `/api/projects/{projectId}` | 프로젝트 상세 조회. 해당 프로젝트 멤버만 접근 가능 | 로그인 |
| PATCH | `/api/projects/{projectId}` | 프로젝트명·기간 등 수정. PM 역할만 가능 | 로그인 |
| DELETE | `/api/projects/{projectId}` | 프로젝트 삭제. WBS·회의·Action Item cascade 삭제. PM 역할만 가능 | 로그인 |

### 문서 (`/api/projects/{projectId}/documents`)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| POST | `/api/projects/{projectId}/documents` | PDF/HWP 업로드. multipart/form-data. OCR 후 비동기 LLM 파싱 큐 등록. 상태 PENDING으로 저장 | 로그인 |
| GET | `/api/projects/{projectId}/documents` | 업로드 문서 목록. status(PENDING/IN_PROGRESS/COMPLETED/FAILED) 필터링 | 로그인 |
| GET | `/api/projects/{projectId}/documents/{documentId}` | 문서 상세 및 파싱 결과. status COMPLETED일 때만 분석 결과 반환 | 로그인 |

### WBS (`/api/projects/{projectId}/wbs`)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/projects/{projectId}/wbs` | LLM이 생성한 WBS 조회. 업무별 기간·담당 직군 포함. status COMPLETED일 때만 응답 | 로그인 |
| PATCH | `/api/projects/{projectId}/wbs` | AI 제안 WBS 최종 검토 및 확정. 확정 시 프로젝트 베이스라인 설정 | 로그인 |
| PATCH | `/api/projects/{projectId}/wbs/{milestoneId}` | 마일스톤 개별 수정. isDecisionPoint 변경 시 회의 추천 일정 재계산 트리거 | 로그인 |
| GET | `/api/projects/{projectId}/meeting-recommendations` | 확정 WBS 마일스톤 기반 회의 일정 추천 반환 | 로그인 |

### 팀원 (`/api/projects/{projectId}/members`)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/projects/{projectId}/members` | 프로젝트 참여자 목록 및 역할 조회. 직군·역할별 필터링 | 로그인 |
| POST | `/api/projects/{projectId}/members` | 팀원 초대 및 역할 할당. 초대 링크 발송 또는 시스템 내 유저 매핑 | 로그인 |
| PATCH | `/api/projects/{projectId}/members/{memberId}` | 팀원 역할 수정. PM 역할만 가능 | 로그인 |
| DELETE | `/api/projects/{projectId}/members/{memberId}` | 팀원 제거. PM 역할만 가능. 해당 팀원 알림 발송 | 로그인 |

### Action Item (`/api/projects/{projectId}/action-items`, `/api/action-items`)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/projects/{projectId}/action-items` | 프로젝트 내 전체 Action Item 목록. 상태(PENDING/COMPLETED)·담당자 필터링 | 로그인 |
| POST | `/api/projects/{projectId}/action-items` | PM이 수동으로 Action Item 추가. 담당자·데드라인 필수 | 로그인 |
| PATCH | `/api/action-items/{itemId}` | 완료/미완료 상태 토글. 완료 시 완료 시각·처리자 서버 기록 | 로그인 |

### 회의 (`/api/projects/{projectId}/meetings`, `/api/meetings`)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/projects/{projectId}/meetings` | 프로젝트 회의 목록. 상태(SCHEDULED/IN_PROGRESS/COMPLETED) 필터링 | 로그인 |
| POST | `/api/projects/{projectId}/meetings` | 회의 생성. 회의 종류 필수(킥오프/진도점검/이슈체크/합의). LLM이 체크리스트 초안 생성 | 로그인 |
| GET | `/api/meetings/{meetingId}` | 회의 상세 조회 | 로그인 |
| PATCH | `/api/meetings/{meetingId}` | 회의 일정·제목 수정. 상태 SCHEDULED일 때만 가능 | 로그인 |
| DELETE | `/api/meetings/{meetingId}` | 회의 삭제. 상태 SCHEDULED일 때만 가능. 체크리스트·Action Item cascade 삭제 | 로그인 |
| GET | `/api/meetings/{meetingId}/checklists` | 회의 체크리스트 전체 조회. isDone 포함 반환 | 로그인 |
| PATCH | `/api/meetings/{meetingId}/checklists` | AI 제안 체크리스트 항목 추가·수정. 회의 시작 전 최종 어젠다 세팅 | 로그인 |
| GET | `/api/meetings/{meetingId}/briefing` | 이전 회의 미결 사항 및 맥락 조회. 이월된 Action Item 반환 | 로그인 |
| POST | `/api/meetings/{meetingId}/stt` | 녹음 파일 업로드. multipart/form-data. 비동기 STT 변환 및 체크리스트 자동 검증 트리거 | 로그인 |
| GET | `/api/meetings/{meetingId}/transcript` | STT 변환 텍스트 조회. status COMPLETED일 때만 응답 | 로그인 |
| POST | `/api/meetings/{meetingId}/completion` | 회의 종료 및 완료 처리. 비동기: STT 요약·달성률 계산·미결 항목 다음 회의 이월 | 로그인 |
| GET | `/api/meetings/{meetingId}/metrics` | 최종 회의록·요약 데이터 조회. status COMPLETED일 때만 응답. 체크리스트 달성률 포함 | 로그인 |

### 대시보드 (`/api/dashboard`)
| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/dashboard/calendar` | PM 소속 전체 프로젝트의 주간 일정 및 의사결정 마일스톤 조회. week 쿼리 파라미터로 기준 날짜 전달 | 로그인 |

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
