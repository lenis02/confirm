# 부록

## 부록 1. WBS 생성 프롬프트 전문

4장 가절 3)에서 설명한 WBS 생성 프롬프트의 전문을 수록한다. 프롬프트는 서버 소스의 `backend/src/prompts/wbs-generator.prompt.ts`에 정의되어 있으며, LLM에 시스템 프롬프트로 전달된다. 아래의 프롬프트는 코드에 있는 그대로 옮겼으므로 서비스 이름이 화면 표기인 "Conf:rm"으로 적혀 있다.

### 가. 시스템 프롬프트

```text
<system_role>
당신은 IT 프로젝트 관리에 특화된 최고 수준의 수석 PM(Project Manager)이자, '컨펌(Conf:rm)' 플랫폼의 AI 에이전트입니다.
당신의 핵심 목표는 [수행계획서]를 분석하여 부서 간 병목(Delay)이 없는 가장 효율적이고 현실적인 프로젝트 WBS를 JSON 형태로 자동 생성하는 것입니다.
</system_role>

<instructions>
주어진 [수행계획서] 텍스트를 바탕으로 아래의 <step>들을 순차적으로 수행하십시오. 최종 출력은 반드시 <json_schema>에 맞춘 JSON 포맷이어야 하며, JSON 외의 다른 인사말이나 설명 텍스트는 절대 출력하지 마십시오.

<step1_extraction>
문서에서 다음의 전체적인 정보를 심층 추출하십시오:
1. 프로젝트 배경 및 목표
2. 프로젝트 전체 기간 (시작일과 종료일, 또는 총 소요 기간)
3. 구현해야 할 기능 명세 목록
4. 부서별 팀원 정보 (부서, 직급, 경력, 역할 등)
*주의:* 팀원 정보가 문서에 명시되어 있지 않거나 부족할 경우, 일반적인 IT 프로젝트 표준(기획, 디자인, 프론트엔드, 백엔드)에 맞추어 가상의 역할과 인력으로 가정하여 초안을 생성하십시오.
</step1_extraction>

<step2_task_breakdown>
추출된 구현 기능 목록을 실제 작업 가능한 최소 단위의 '태스크(Task)'로 분리하십시오.
- 각 태스크는 특정 부서(기획, 디자인, 개발 등)가 전담할 수 있는 명확한 단위여야 합니다.
</step2_task_breakdown>

<step3_scheduling_and_reasoning>
분할된 태스크들을 바탕으로 부서 간 지연(Delay)을 최소화하는 최적의 스케줄링을 진행하십시오. 다음의 '효율성 기준'을 반드시 엄격하게 적용하십시오:
1. 의존성 관리 (Dependency): 선행 작업이 완료되어야 후행 작업이 시작될 수 있습니다. (예: [기획 부서]의 '기능명세' 완료 -> [디자인 부서]의 'UI/UX 디자인' 시작 -> [프론트엔드 부서]의 '개발' 시작)
2. 유동적 기간 할당: 모든 태스크의 기간을 단순히 N등분하지 마십시오. 작업의 난이도와 담당자의 경력/연차를 추론하여, 간단한 작업은 짧게(예: 1~2일), 복잡한 작업은 길게(예: 5~10일) 현실적인 소요 기간을 유동적으로 부여하십시오.
3. 병렬 처리 극대화: 서로 의존성이 없는 태스크들은 동일한 기간에 병렬로 진행되도록 일정을 겹치게 배치하여 전체 인력의 유휴 시간을 최소화하십시오.
4. 일정 배정: 태스크별 '시작 날짜'와 '마감 날짜'를 산정하십시오. (문서에 명확한 날짜가 없다면 프로젝트 시작일을 'Day 1'으로 가정하여 'D+1, D+5' 형식으로 작성해도 무방합니다.)
</step3_scheduling_and_reasoning>
</instructions>

<json_schema>
{
  "project_context": {
    "background_and_goals": "추출된 배경 및 목표 요약",
    "total_duration": "전체 수행 기간",
    "team_resources": [
      {
        "department": "부서명",
        "role": "역할",
        "experience_level": "직급/연차 (추론 또는 추출)"
      }
    ]
  },
  "wbs_tasks": [
    {
      "task_id": "T01 (고유 ID)",
      "task_name": "태스크 명",
      "department": "담당 부서",
      "complexity": "High / Medium / Low (작업 크기 추론)",
      "duration_days": 3,
      "start_date": "시작 날짜 (YYYY-MM-DD 또는 D+N)",
      "end_date": "마감 날짜 (YYYY-MM-DD 또는 D+N)",
      "dependencies": ["선행 태스크 ID (없으면 빈 배열)"],
      "reasoning": "해당 작업 기간 및 배정에 대한 추론 논리 (예: 기능명세 완료 직후 착수 가능하며, 난이도가 낮아 2일 할당)"
    }
  ]
}
</json_schema>

<output_constraint>
반드시 <json_schema> 구조를 엄격히 따르는 유효한 JSON 객체 하나만 출력하십시오. JSON 블록 외의 어떠한 텍스트도 포함해서는 안 됩니다.
</output_constraint>
```

### 나. 사용자 메시지

수행계획서 PDF에서 추출한 텍스트는 다음과 같이 `<input_data>` 태그로 감싸 사용자 메시지로 전달한다. 시스템 프롬프트에서 말하는 [수행계획서]는 이 태그 안의 텍스트를 가리킨다.

```text
<input_data>
{수행계획서 PDF에서 추출한 텍스트}
</input_data>
```

### 다. 출력 필드와 저장 방식

LLM은 하나의 JSON 객체를 출력하며, 각 필드의 의미와 서버의 저장 방식은 [부표 1]과 같다. 서버는 응답이 마크다운 코드 블록 기호로 감싸여 있으면 기호를 제거한 뒤 JSON으로 해석하고, 태스크 목록(wbs_tasks)이 배열이 아니면 생성 실패로 처리한다. 생성에 실패한 문서는 실패(FAILED) 상태로 기록된다.

[부표 1] WBS 생성 출력 필드

| 필드 | 형식 | 의미 | 서버 저장 |
|---|---|---|---|
| project_context.background_and_goals | 문자열 | 프로젝트 배경과 목표 요약 | WBS의 프로젝트 요약 |
| project_context.total_duration | 문자열 | 전체 수행 기간 | WBS의 전체 기간 |
| project_context.team_resources | 배열 | 투입 인력 목록. 항목마다 부서(department), 역할(role), 직급·연차(experience_level)를 가짐 | WBS의 투입 인력. PM이 화면에서 수정할 수 있음 |
| wbs_tasks[].task_id | 문자열 | 태스크 식별자(T01 형식) | 태스크의 표시 식별자. 태스크를 삭제하면 다시 매김 |
| wbs_tasks[].task_name | 문자열 | 태스크명 | 태스크명 |
| wbs_tasks[].department | 문자열 | 담당 부서 | 태스크의 부서와 담당 역할 |
| wbs_tasks[].complexity | 문자열 | 작업 크기(High, Medium, Low) | 복잡도 |
| wbs_tasks[].duration_days | 숫자 | 소요 기간(일) | 기간 |
| wbs_tasks[].start_date | 문자열 | 시작일(YYYY-MM-DD 또는 D+N) | 시작일. D+N 형식이면 비워 둠 |
| wbs_tasks[].end_date | 문자열 | 종료일(YYYY-MM-DD 또는 D+N) | 종료일. D+N 형식이면 비워 둠 |
| wbs_tasks[].dependencies | 문자열 배열 | 선행 태스크의 식별자 목록 | 선행 태스크 |
| wbs_tasks[].reasoning | 문자열 | 기간과 배정의 산정 근거 | 산정 근거 |

이 밖에 서버는 태스크마다 출력된 순서대로 정렬 순서를 부여하고, 의사결정 지점 여부는 지정하지 않은 상태로 초기화한다. 생성된 WBS는 초안(DRAFT) 상태로 저장되며, 같은 프로젝트에 이전 WBS가 있으면 새 WBS로 대체된다.

## 부록 2. 회의 추천 프롬프트 전문

4장 나절 2)에서 설명한 회의 추천 프롬프트의 전문을 수록한다. 프롬프트는 `backend/src/prompts/meeting-recommender.prompt.ts`에 정의되어 있으며, 부록 1과 마찬가지로 코드에 있는 그대로 옮겼다. 따라서 회의 유형 이름도 본문의 표기(진도 점검, 이슈 체크)가 아닌 코드의 표기를 따른다.

### 가. 시스템 프롬프트

```text
<system_role>
당신은 IT 프로젝트 관리에 특화된 수석 PM이자 '컨펌(Conf:rm)' 플랫폼의 AI 에이전트입니다.
당신의 목표는 확정된 [WBS]를 분석하여, 프로젝트 진행에 꼭 필요한 회의를 적절한 시점에 추천하는 것입니다.
</system_role>

<instructions>
주어진 [WBS]를 바탕으로 아래 기준에 따라 회의를 추천하십시오. 최종 출력은 반드시 <json_schema>에 맞춘 JSON이어야 하며, JSON 외의 인사말이나 설명은 절대 출력하지 마십시오.

<criteria>
1. 킥오프(KICKOFF): 프로젝트 착수 시점(가장 이른 시작일 무렵)에 1회 추천.
2. 진도점검(PROGRESS_CHECK): 개발/구현 등 장기 단계가 진행되는 동안 주기적으로 추천(2~3주 간격 권장).
3. 이슈체크(ISSUE_CHECK): 부서 간 의존성이 몰리거나 일정이 빡빡한 구간 직전에 추천.
4. 합의(CONSENSUS): 의사결정이 필요한 핵심 분기(설계 확정, 산출물 검수, 배포 승인 등) 직전에 추천.
5. 회의는 과하지 않게, 프로젝트 규모에 맞춰 3~6개 내외로 추천하십시오.
6. suggested_date는 관련 태스크 일정을 근거로 산정하되, 해당 분기 작업 '시작 2~3일 전' 같은 현실적인 날짜로 정하십시오.
7. WBS 태스크에 구체적 날짜(YYYY-MM-DD)가 없으면, 가능한 범위에서 합리적으로 추정하십시오.
</criteria>
</instructions>

<json_schema>
{
  "recommendations": [
    {
      "title": "회의 제목 (예: 킥오프 회의, 1차 진도점검, 설계 확정 합의)",
      "meeting_type": "KICKOFF | PROGRESS_CHECK | ISSUE_CHECK | CONSENSUS 중 하나",
      "suggested_date": "YYYY-MM-DD",
      "reason": "이 회의를 이 시점에 추천하는 한 줄 근거",
      "related_phase": "관련 단계/부서 (선택)"
    }
  ]
}
</json_schema>
```

### 나. 사용자 메시지

서버는 확정된 WBS로부터 다음 형식의 텍스트를 만들고 `<wbs_data>` 태그로 감싸 사용자 메시지로 전달한다. 프로젝트 요약과 전체 기간은 값이 있을 때만 포함하고, 태스크는 WBS의 정렬 순서대로 한 줄씩 나열하며, 날짜가 비어 있는 태스크는 '미정'으로 표시한다. 시스템 프롬프트에서 말하는 [WBS]는 이 태그 안의 텍스트를 가리킨다.

```text
<wbs_data>
프로젝트 요약: {WBS의 프로젝트 요약}
전체 기간: {WBS의 전체 기간}
태스크 목록:
- [{부서}] {태스크명} (시작: {YYYY-MM-DD 또는 미정}, 종료: {YYYY-MM-DD 또는 미정})
- …
</wbs_data>
```

### 다. 출력 필드와 응답 변환

LLM은 추천 회의 목록(recommendations) 하나를 담은 JSON 객체를 출력한다. 서버는 부록 1과 같은 방식으로 응답을 해석한 뒤 각 항목을 [부표 2]와 같이 변환하여 클라이언트에 반환한다. 이때 회의 유형 값을 대문자로 바꾸고, 네 가지 유형에 속하지 않는 항목은 제외한다.

[부표 2] 회의 추천 출력 필드

| LLM 출력 필드 | 의미 | API 응답 필드 |
|---|---|---|
| title | 회의 제목 | title |
| meeting_type | 회의 유형(KICKOFF, PROGRESS_CHECK, ISSUE_CHECK, CONSENSUS) | meetingType |
| suggested_date | 추천 일자(YYYY-MM-DD) | suggestedDate |
| reason | 이 시점에 회의를 추천하는 근거 | reason |
| related_phase | 관련 단계 또는 부서(선택) | relatedPhase. 값이 없으면 null |

## 부록 3. API 명세

3장 라절에서 요약한 API의 전체 명세를 수록한다. 명세는 서버의 컨트롤러 코드를 기준으로 정리하였으며, 9개 자원 영역의 45개 엔드포인트를 영역별 표로 제시한다.

### 가. 공통 사항

모든 경로는 `/api`로 시작하며, 아래 표에서는 이를 생략하고 그 뒤의 경로만 적는다. 경로에서 중괄호로 표시한 부분은 각 자원의 UUID이다. 요청과 응답 본문은 JSON 형식이고, 파일은 multipart/form-data 형식의 file 필드에 담아 보낸다. 날짜와 일시는 ISO 8601 형식의 문자열로 주고받는다.

인증이 필요한 요청은 Authorization 헤더에 Bearer 방식으로 토큰을 담는다. 요청 본문은 서버의 전역 검증 파이프를 거치며, DTO에 정의되지 않은 필드가 있거나 값의 형식이 맞지 않으면 400 응답을 반환한다. 아래 표의 권한 열은 [부표 3]의 표기를 따르고, 응답 열은 요청이 성공했을 때의 HTTP 상태 코드이다. 실패했을 때의 공통 응답은 [부표 4]와 같으며, 오류 응답 본문에는 상태 코드(statusCode)와 오류 메시지(message)가 담긴다.

[부표 3] 권한 표기

| 표기 | 의미 |
|---|---|
| 공개 | 인증 없이 호출할 수 있음 |
| 갱신 토큰 | Authorization 헤더에 접근 토큰 대신 갱신 토큰을 담아 호출함 |
| 로그인 | 유효한 접근 토큰이 필요함 |
| 팀원 | 로그인한 사용자가 해당 프로젝트의 팀원이어야 함 |
| PM | 해당 프로젝트에서 PM 역할을 가진 팀원이어야 함 |

[부표 4] 공통 오류 응답

| 상태 코드 | 발생 조건 |
|---|---|
| 400 | 요청 본문의 검증 실패, 현재 상태에서 허용되지 않는 작업(예: 예정 상태가 아닌 회의의 수정, 확정된 WBS가 없는 상태의 회의 추천 요청) |
| 401 | 토큰이 없거나 만료됨 |
| 403 | 프로젝트의 팀원이 아님, PM 권한이 필요한 작업을 PM이 아닌 팀원이 요청함, 자기 자신을 프로젝트에서 제거하려 함 |
| 404 | 요청한 자원이 없음 |
| 409 | 이미 프로젝트 팀원인 사용자를 다시 등록함 |
| 500 | LLM 호출 실패 등 서버 내부 오류 |

### 나. 인증

인증 API는 [부표 5]와 같다. 로그인과 토큰 갱신을 제외한 모든 API는 접근 토큰이 필요하다.

[부표 5] 인증 API

| Method | 경로 | 설명 | 권한 | 응답 |
|---|---|---|---|---|
| GET | /auth/google | 구글 로그인 화면으로 이동시켜 OAuth 인가 절차를 시작 | 공개 | 302 |
| GET | /auth/google/callback | 구글의 인가 결과를 받아 사용자를 조회하거나 새로 가입시키고, 접근 토큰과 갱신 토큰을 발급하여 클라이언트의 콜백 주소로 이동 | 공개 | 302 |
| POST | /auth/refresh | 갱신 토큰을 검증하고 새 접근 토큰(accessToken)을 발급 | 갱신 토큰 | 200 |
| POST | /auth/logout | 로그아웃 응답을 반환. 서버에서 토큰을 무효화하지는 않음 | 로그인 | 200 |

### 다. 사용자

사용자 API는 [부표 6]과 같다. 사용자 검색은 팀원 화면에서 등록할 사용자의 이메일을 찾는 데 쓰인다.

[부표 6] 사용자 API

| Method | 경로 | 설명 | 권한 | 응답 |
|---|---|---|---|---|
| GET | /users/me | 로그인한 사용자의 정보 조회 | 로그인 | 200 |
| GET | /users/search | 이메일 일부로 가입한 사용자를 검색. 쿼리: email. 대소문자를 구분하지 않는 부분 일치로 찾아 본인을 제외하고 최대 10명 반환 | 로그인 | 200 |
| PATCH | /users/me | 이름과 직군 수정. 본문: name, jobTitle(모두 선택) | 로그인 | 200 |

### 라. 프로젝트

프로젝트 API는 [부표 7]과 같다.

[부표 7] 프로젝트 API

| Method | 경로 | 설명 | 권한 | 응답 |
|---|---|---|---|---|
| POST | /projects | 프로젝트 생성. 본문: name(필수), description, startDate, endDate, status. 생성한 사용자를 PM으로 등록 | 로그인 | 201 |
| GET | /projects | 로그인한 사용자가 속한 프로젝트 목록을 최근 생성 순으로 조회. 쿼리: status(ACTIVE, ARCHIVED) | 로그인 | 200 |
| GET | /projects/{projectId} | 프로젝트 상세와 팀원 목록 조회 | 팀원 | 200 |
| PATCH | /projects/{projectId} | 프로젝트 정보 수정. 본문: 생성 본문의 필드 가운데 바꿀 필드 | PM | 200 |
| DELETE | /projects/{projectId} | 프로젝트 삭제. 소속된 팀원, 문서, WBS, 회의, Action Item도 함께 삭제 | PM | 204 |

### 마. 팀원

팀원 API는 [부표 8]과 같다.

[부표 8] 팀원 API

| Method | 경로 | 설명 | 권한 | 응답 |
|---|---|---|---|---|
| GET | /projects/{projectId}/members | 팀원 목록과 역할 조회 | 팀원 | 200 |
| POST | /projects/{projectId}/members | 이메일로 팀원 등록. 본문: email, role. 구글 로그인을 한 번 이상 한 사용자만 등록할 수 있음 | PM | 201 |
| PATCH | /projects/{projectId}/members/{memberId} | 팀원의 역할 수정. 본문: role | PM | 200 |
| DELETE | /projects/{projectId}/members/{memberId} | 팀원 제거. 자기 자신은 제거할 수 없음 | PM | 204 |

역할(role)은 PM, DEVELOPER, DESIGNER, QA, DEVOPS, OTHER 가운데 하나이다.

### 바. 문서

문서 API는 [부표 9]와 같다. 클라이언트는 처리 중인 문서가 있는 동안 3초 간격으로 문서 목록과 WBS를 조회하여 처리 결과를 확인한다.

[부표 9] 문서 API

| Method | 경로 | 설명 | 권한 | 응답 |
|---|---|---|---|---|
| POST | /projects/{projectId}/documents | 수행계획서 PDF 업로드. 문서를 대기 상태로 저장하여 즉시 응답한 뒤, 백그라운드에서 텍스트 추출과 WBS 생성(부록 1)을 수행 | 팀원 | 201 |
| GET | /projects/{projectId}/documents | 업로드한 문서 목록을 최근 순으로 조회. 쿼리: status(PENDING, IN_PROGRESS, COMPLETED, FAILED) | 팀원 | 200 |
| GET | /projects/{projectId}/documents/{documentId} | 문서 상세 조회. 처리 상태, 추출한 텍스트, 실패했을 때의 오류 메시지를 포함 | 팀원 | 200 |
| DELETE | /projects/{projectId}/documents/{documentId} | 저장된 파일과 문서 기록 삭제. 이 문서로 생성한 WBS는 유지 | 팀원 | 204 |

### 사. WBS

WBS API는 [부표 10]과 같다.

[부표 10] WBS API

| Method | 경로 | 설명 | 권한 | 응답 |
|---|---|---|---|---|
| GET | /projects/{projectId}/wbs | WBS와 태스크 목록을 정렬 순서대로 조회 | 팀원 | 200 |
| PATCH | /projects/{projectId}/wbs | WBS 확정. 초안을 확정 상태로 바꾸고 확정 일시와 확정자를 기록. 이미 확정된 WBS면 400 | PM | 200 |
| PATCH | /projects/{projectId}/wbs/team-resources | 투입 인력 목록을 통째로 교체. 본문: teamResources(department, role, experience_level로 이루어진 항목의 배열) | PM | 200 |
| PATCH | /projects/{projectId}/wbs/{itemId} | 태스크 수정. 본문: title, description, assignedRole, durationDays, startDate, endDate, isDecisionPoint(모두 선택) | PM | 200 |
| DELETE | /projects/{projectId}/wbs/{itemId} | 태스크 삭제. 남은 태스크의 정렬 순서와 표시 식별자를 다시 매김 | PM | 204 |
| DELETE | /projects/{projectId}/wbs | WBS와 모든 태스크 삭제 | PM | 204 |
| GET | /projects/{projectId}/meeting-recommendations | 확정된 WBS를 바탕으로 LLM이 추천한 회의 목록(부록 2) 반환 | 팀원 | 200 |

### 아. 회의

회의 API는 [부표 11]과 같다. 회의의 생성과 목록 조회는 프로젝트 경로에서, 개별 회의에 대한 작업은 회의 경로에서 처리한다.

[부표 11] 회의 API

| Method | 경로 | 설명 | 권한 | 응답 |
|---|---|---|---|---|
| GET | /projects/{projectId}/meetings | 회의 목록을 일정의 최근 순으로 조회. 쿼리: status(SCHEDULED, IN_PROGRESS, COMPLETED) | 팀원 | 200 |
| POST | /projects/{projectId}/meetings | 회의 생성. 본문: title, type, scheduledAt(필수), departments(선택). 유형별 기본 체크리스트 5개를 함께 만듦 | 팀원 | 201 |
| POST | /projects/{projectId}/meetings/from-recommendations | 추천 회의 일괄 등록. 본문: meetings(회의 생성 본문의 배열, 1개 이상). 항목마다 회의 생성과 같은 과정을 수행 | 팀원 | 201 |
| GET | /meetings/{meetingId} | 회의 상세와 체크리스트 조회 | 팀원 | 200 |
| PATCH | /meetings/{meetingId} | 회의 제목과 일시 수정. 본문: title, scheduledAt(모두 선택). 예정 상태에서만 가능 | PM | 200 |
| DELETE | /meetings/{meetingId} | 회의 삭제. 예정 상태에서만 가능하며 체크리스트도 함께 삭제 | PM | 204 |
| GET | /meetings/{meetingId}/checklists | 체크리스트를 순서대로 조회 | 팀원 | 200 |
| PATCH | /meetings/{meetingId}/checklists | 체크리스트 전체 교체. 본문: items(content는 필수, isDone과 order는 선택인 항목의 배열). 기존 항목을 모두 지우고 보낸 목록으로 다시 만듦 | 팀원 | 200 |
| GET | /meetings/{meetingId}/briefing | 회의 브리핑 조회. 이 회의보다 앞선 회의 가운데 가장 최근에 완료된 회의의 달성률과 미완료 체크리스트, 이월된 미완료 Action Item을 반환 | 팀원 | 200 |
| POST | /meetings/{meetingId}/minutes | 회의록 업로드. HWP, DOC, DOCX, PDF 파일만 허용하며 기존 회의록은 새 파일로 대체 | 팀원 | 201 |
| GET | /meetings/{meetingId}/minutes | 회의록 내려받기. 업로드한 회의록이 없으면 404 | 팀원 | 200 |
| POST | /meetings/{meetingId}/completion | 회의 완료 처리. 체크리스트 달성률을 계산하고, 미완료 Action Item을 이월 항목으로 표시하며, 이행하지 못한 체크리스트 항목을 Action Item으로 생성. 이미 완료된 회의면 400 | PM | 200 |
| POST | /meetings/{meetingId}/reopen | 완료 취소. 완료된 회의를 진행 중 상태로 되돌리고, 달성률과 완료 일시를 지우며, 완료 처리에서 자동 생성한 Action Item을 삭제 | PM | 200 |
| GET | /meetings/{meetingId}/metrics | 완료된 회의의 결과 조회. 달성률, 완료 일시, 체크리스트를 반환하며 완료되지 않은 회의면 400 | 팀원 | 200 |

회의 유형(type)은 KICKOFF, PROGRESS_CHECK, ISSUE_CHECK, CONSENSUS 가운데 하나이다.

### 자. Action Item

Action Item API는 [부표 12]와 같다. 회의 완료 처리에서 자동으로 생성된 Action Item은 담당자와 기한이 비어 있는 상태로 만들어진다.

[부표 12] Action Item API

| Method | 경로 | 설명 | 권한 | 응답 |
|---|---|---|---|---|
| GET | /projects/{projectId}/action-items | Action Item 목록을 기한 순으로 조회. 쿼리: status(PENDING, COMPLETED), assigneeId | 팀원 | 200 |
| POST | /projects/{projectId}/action-items | Action Item 등록. 본문: title, assigneeId, dueDate(필수), meetingId(선택) | PM | 201 |
| PATCH | /action-items/{itemId} | 완료와 미완료 상태를 서로 전환. 완료로 바꾸면 완료 일시와 처리자를 기록하고, 미완료로 되돌리면 지움 | 팀원 | 200 |

### 차. 대시보드

대시보드 API는 [부표 13]과 같다.

[부표 13] 대시보드 API

| Method | 경로 | 설명 | 권한 | 응답 |
|---|---|---|---|---|
| GET | /dashboard/calendar | 로그인한 사용자가 속한 모든 프로젝트의 한 주 일정을 프로젝트별로 조회. 쿼리: week(기준 날짜, 생략하면 오늘). 기준 날짜가 속한 주의 월요일부터 일요일까지 열리는 회의, 그 주에 기한이 있는 Action Item, 그 주에 시작하거나 끝나는 WBS 태스크를 반환 | 로그인 | 200 |

### 카. 비활성화된 엔드포인트

기획 단계의 API 목록에 있었으나 현재 비활성화된 엔드포인트는 다섯 개이며, 위의 45개에 포함하지 않았다. 음성 녹음 업로드(POST /meetings/{meetingId}/stt)와 변환 텍스트 조회(GET /meetings/{meetingId}/transcript)는 실시간 회의 검증 기능(FR-17)을 구현 범위에서 제외하면서 회의록 업로드로 대체하였다. 외부 협업 도구 연동의 등록과 목록 조회(POST·GET /users/integrations), 해제(DELETE /users/integrations/{integrationId})는 외부 협업 도구 알림 기능(FR-18)과 함께 향후 과제로 남겼다. 이들 엔드포인트의 코드는 주석으로 보존되어 있어 기능을 구현할 때 다시 사용할 수 있다.
