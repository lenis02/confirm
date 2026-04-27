# Backend — Confirm API 서버

NestJS 11 기반 REST API 서버. 루트의 `README.md`에서 전체 세팅 방법을 확인하세요.

---

## 개발 서버 실행

```bash
# 루트에서 DB 먼저 실행
docker-compose up -d

# backend 디렉토리에서
npm install
npm run start:dev   # http://localhost:3000/api
```

---

## 디렉토리 구조

```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/
│   └── entities/
├── users/
├── projects/
├── meetings/
├── action-items/
├── dashboard/
├── app.module.ts
└── main.ts
```

---

## 코드 컨벤션

- 비즈니스 로직은 **Service**에만, Controller는 라우팅·DTO 변환만 담당
- DTO에 `class-validator` 데코레이터 필수
- 모든 보호 엔드포인트에 `@UseGuards(JwtAuthGuard)` 적용
- 외부 서비스 `accessToken`은 AES-256 암호화 후 저장 (평문 저장 금지)
- 환경변수 하드코딩 금지 — 반드시 `.env` 사용

## 네이밍 규칙

| 대상 | 규칙 |
|------|------|
| 파일명 | `kebab-case` |
| 클래스 | `PascalCase` |
| 변수·함수 | `camelCase` |
| DB 컬럼 | `snake_case` |
