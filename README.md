# Confirm (컨펌)

PM 전용 AI 에이전트 플랫폼. 수행계획서 업로드 → WBS 자동 생성 → 회의 실시간 어시스트 → 의사결정 이력 관리.

---

## 프로젝트 구조

```
confirm/
├── backend/        # NestJS API 서버
└── docker-compose.yml
```

---

## 로컬 개발 환경 세팅

### 사전 준비

- Node.js 20+
- Docker Desktop
- Git

### 1. 저장소 클론

```bash
git clone <repo-url>
cd confirm
```

### 2. 환경변수 설정

```bash
cd backend
cp .env.example .env
```

`.env` 파일을 열어 값을 채웁니다. DB 설정은 기본값 그대로 사용 가능합니다.

> **주의:** 로컬에 PostgreSQL이 설치되어 있으면 5432 포트가 충돌합니다.
> `services.msc`에서 `postgresql-x64-XX` 서비스를 **수동(Manual)** 시작으로 변경 후 중지하세요.

### 3. DB 실행 (Docker)

프로젝트 루트(`confirm/`)에서 실행합니다.

```bash
docker-compose up -d
```

### 4. 패키지 설치 및 서버 실행

```bash
cd backend
npm install
npm run start:dev
```

서버가 뜨면 `http://localhost:3000/api` 에서 확인 가능합니다.

---

## 기술 스택

| 구분 | 스택 |
|------|------|
| Backend | NestJS 11, TypeScript |
| ORM | TypeORM 0.3 |
| DB | PostgreSQL 16 (Docker) |
| 인증 | Google OAuth 2.0 + JWT |
| LLM | Claude API (문서 분석·WBS), GPT-4o/Gemini (STT 검증) |
| STT | 회의 음성 녹음·화자 분리 |
| 외부 연동 | Naver Works, Notion API |

---

## 주요 명령어

```bash
npm run start:dev     # 개발 서버 (watch 모드)
npm run build         # 프로덕션 빌드
npm run test          # 유닛 테스트
npm run test:e2e      # E2E 테스트
npm run lint          # 린트 검사
```

---

## 모듈 구조

```
src/
├── auth/           # Google OAuth, JWT 발급·갱신·로그아웃
├── users/          # 사용자 프로필, 외부 서비스 연동
├── projects/       # 프로젝트 CRUD, 문서 업로드, WBS, 팀원 관리
├── meetings/       # 회의 CRUD, 체크리스트, STT, 회의록
├── action-items/   # Action Item 상태 관리
├── dashboard/      # 주간 캘린더 통합 조회
└── app.module.ts
```

---

## 환경변수 목록

`.env.example` 참고. 주요 항목:

| 키 | 설명 |
|----|------|
| `DB_*` | PostgreSQL 접속 정보 |
| `JWT_SECRET` | Access Token 서명 키 |
| `JWT_REFRESH_SECRET` | Refresh Token 서명 키 |
| `ANTHROPIC_API_KEY` | Claude API 키 |
| `OPENAI_API_KEY` | GPT-4o API 키 |
| `GEMINI_API_KEY` | Gemini API 키 |
| `AES_SECRET_KEY` | 외부 서비스 토큰 암호화 키 (32바이트) |

---

## 트러블슈팅

**DB 연결 실패 — `password authentication failed`**
로컬 PostgreSQL 서비스가 5432를 선점 중입니다. [세팅 3번](#3-db-실행-docker) 참고.

**`@nestjs/mapped-types` 모듈 없음 오류**
```bash
npm install @nestjs/mapped-types
```

**Docker 컨테이너가 안 뜰 때**
Docker Desktop이 실행 중인지 트레이 아이콘을 확인하세요.
