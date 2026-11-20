# 참고문헌 후보 목록

> 본문의 `[인용 필요]` 자리에 넣을 수 있는 참고문헌 후보이다. 조사일: 2026-11-18.
> 서지 형식은 학과 지정 형식이 정해지지 않아 APA 7판 형식으로 적었다.

## 본문 반영 현황 (2026-11-18)

1~4장의 `[인용 필요]`를 모두 APA 7판 본문 인용으로 바꾸고, 인용한 33건을 [references.md](references.md)에 정리하였다.

- **반영:** R01~R19, R21~R23, T01~T05, 그리고 3장 보안 표준 3건(Hardt, 2012 / Jones et al., 2015 / Dworkin, 2007. Dworkin은 2026-11-19 토큰 암호화 절을 빼면서 다시 제외), 2장 장문맥·추론 기능 근거로 Anthropic 공식 문서 2건(Context windows, Extended thinking)을 추가로 인용함
- **보류:** R20(저자 미확인), R24~R28(5장 작성 시 사용)
- **근거가 없어 문장을 완화한 곳:** 1장 가절과 2장 가-1)의 "WBS 작성 시간·작성자 경험에 따른 품질 차이", 1장 가절과 2장 나-2)의 "후속 조치 누락의 영향"은 인용 없이 성립하는 표현으로 고쳤음. 2장 나-1)의 회의 유형은 킥오프·진도 점검만 PMBOK을 인용하고 나머지는 본 연구의 구분으로 밝힘

**제출 전에 원문과 대조할 항목** (기억에 근거하거나 일부만 확인한 서지 정보)

| 문헌 | 확인할 내용 |
|---|---|
| Brown 외(2020), Kojima 외(2022), Ouyang 외(2022), Vaswani 외(2017), Wei 외(2022) | 학회 논문집 쪽수, 저자 목록 |
| Ji 외(2023), Haynes 외(2009), Kelley·Walker(1959), Malcolm 외(1959) | DOI, 쪽수, 저자 목록 |
| Leach 외(2009) | 호(issue) 번호 (1) |
| Hou 외(2024) | 권·호·논문 번호 (33(8), Article 220) |
| Sarim 외(2025) | 논문 번호(article number) |
| Korba·Pawluk(2026) | 학술지 권·호, 본문 수치(480분 → 약 20분) |
| Rogelberg(2019) | 부제 |
| 도구 문서와 Anthropic 문서 (n.d.) | 게시일이 있으면 n.d. 대신 날짜 기재 |
| Project Management Institute(2017, 2025) | 인용한 내용(의존 관계 유형, PDM, 이슈 기록부, 킥오프·진도 점검 회의)이 해당 판에 실제로 있는지 |

**상태 표기**

- ✅ 웹 검색으로 제목, 저자, 학술지·출판사, 연도를 확인함
- 📘 널리 알려진 원전으로 서지 정보를 기억에 근거해 적음. 원문(DOI, 출판사 페이지)과 대조 필요
- ⚠️ 일부 정보가 확인되지 않음. 비고를 보고 확인 필요

**공통 주의:** 어떤 문헌이든 본문에 인용하기 전에 원문을 직접 읽고 인용하는 주장이 실제로 그 문헌에 있는지 확인해야 한다. 아래 "뒷받침하는 내용"은 초록과 검색 결과에 근거한 것이다.

---

## A. 프로젝트 관리 표준과 고전

| ID | 서지 정보 | 상태 | 뒷받침하는 내용 |
|---|---|---|---|
| R01 | Project Management Institute. (2025). *A guide to the project management body of knowledge (PMBOK® guide)* (8th ed.). Project Management Institute. ISBN 9781628258295 | ✅ | 프로젝트 관리 일반, WBS의 역할. 2025년 11월 발행된 최신판 |
| R02 | Project Management Institute. (2017). *A guide to the project management body of knowledge (PMBOK® guide)* (6th ed.). Project Management Institute. | 📘 | WBS 작성 절차, 의존 관계 4유형과 PDM, 기간 추정 기법, 이슈 기록부. 7판(2021)부터는 원칙 중심으로 바뀌어 이러한 절차 설명은 6판이 더 자세하다 |
| R03 | Project Management Institute. (2019). *Practice standard for work breakdown structures* (3rd ed.). Project Management Institute. ISBN 9781628256192 | ✅ | WBS 정의, 100% 규칙, 작업 패키지, 분해 수준 |
| R04 | Kelley, J. E., & Walker, M. R. (1959). Critical-path planning and scheduling. In *Proceedings of the Eastern Joint Computer Conference* (pp. 160–173). | 📘 | CPM 원전. 쪽수 확인 필요 |
| R05 | Malcolm, D. G., Roseboom, J. H., Clark, C. E., & Fazar, W. (1959). Application of a technique for research and development program evaluation. *Operations Research, 7*(5), 646–669. | 📘 | PERT 원전 |

## B. 회의 운영과 후속 조치

| ID | 서지 정보 | 상태 | 뒷받침하는 내용 |
|---|---|---|---|
| R06 | Leach, D. J., Rogelberg, S. G., Warr, P. B., & Burnfield, J. L. (2009). Perceived meeting effectiveness: The role of design characteristics. *Journal of Business and Psychology, 24*, 65–76. https://doi.org/10.1007/s10869-009-9092-6 | ✅ | 안건 사용이 회의 효과성 인식과 관련됨(두 연구, N=958, N=292) |
| R07 | Rogelberg, S. G. (2019). *The surprising science of meetings*. Oxford University Press. | 📘 | 회의 과학 개관, 회의 설계와 효과성 |
| R08 | Haynes, A. B., Weiser, T. G., Berry, W. R., Lipsitz, S. R., Breizat, A. H. S., Dellinger, E. P., … Gawande, A. A. (2009). A surgical safety checklist to reduce morbidity and mortality in a global population. *New England Journal of Medicine, 360*(5), 491–499. | 📘 | 체크리스트의 누락·오류 감소 효과(의료 분야 사례) |
| R09 | Nygard, M. (2011, November 15). *Documenting architecture decisions*. Cognitect. https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions | 📘 | ADR(의사결정 기록) 방법의 출처. URL 확인 필요 |
| R10 | Asthana, S., Hilleli, S., He, P., & Halfaker, A. (2025). Summaries, highlights, and action items: Design, implementation and evaluation of an LLM-powered meeting recap system. *Proceedings of the ACM on Human-Computer Interaction, 9*(2), Article CSCW176. https://doi.org/10.1145/3711074 | ✅ | LLM 기반 회의 요약·Action Item 추출 시스템과 사용자 평가(정보 근로자 7명). 개인별 관련성 파악 한계, 중요 정보 누락 위험 보고 |

## C. 대규모 언어 모델과 프롬프트

| ID | 서지 정보 | 상태 | 뒷받침하는 내용 |
|---|---|---|---|
| R11 | Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, Ł., & Polosukhin, I. (2017). Attention is all you need. In *Advances in Neural Information Processing Systems 30*. | 📘 | 트랜스포머 구조 |
| R12 | Brown, T. B., et al. (2020). Language models are few-shot learners. In *Advances in Neural Information Processing Systems 33*. | 📘 | 규모 확장과 소수 예시 학습 능력 |
| R13 | Ouyang, L., et al. (2022). Training language models to follow instructions with human feedback. In *Advances in Neural Information Processing Systems 35*. | 📘 | 지시 학습과 RLHF |
| R14 | Wei, J., Wang, X., Schuurmans, D., Bosma, M., Ichter, B., Xia, F., Chi, E., Le, Q., & Zhou, D. (2022). Chain-of-thought prompting elicits reasoning in large language models. In *Advances in Neural Information Processing Systems 35*. | 📘 | 사고의 사슬 프롬프트 |
| R15 | Kojima, T., Gu, S. S., Reid, M., Matsuo, Y., & Iwasawa, Y. (2022). Large language models are zero-shot reasoners. In *Advances in Neural Information Processing Systems 35*. | 📘 | 제로샷 단계적 추론 |
| R16 | Ji, Z., Lee, N., Frieske, R., Yu, T., Su, D., Xu, Y., Ishii, E., Bang, Y. J., Madotto, A., & Fung, P. (2023). Survey of hallucination in natural language generation. *ACM Computing Surveys, 55*(12), Article 248. | 📘 | 환각 현상 조사 |
| R17 | Willard, B. T., & Louf, R. (2023). *Efficient guided generation for large language models* (arXiv:2307.09702). arXiv. https://doi.org/10.48550/arXiv.2307.09702 | ✅ | 정규식·문법 기반 제약 디코딩(구조화된 출력) |
| R18 | LLM 공급자의 프롬프트 작성 지침 문서 (예: Anthropic, OpenAI, Google의 공식 문서) | ⚠️ | 지시와 데이터를 태그로 구분하는 권장 사항, 구조화된 출력 기능. 인용할 문서와 URL, 접속일을 정해야 함 |

## D. LLM의 프로젝트 관리·소프트웨어 공학 적용 (2장 다절 TODO용 선행 연구)

| ID | 서지 정보 | 상태 | 뒷받침하는 내용 |
|---|---|---|---|
| R19 | Hou, X., Zhao, Y., Liu, Y., Yang, Z., Wang, K., Li, L., Luo, X., Lo, D., Grundy, J., & Wang, H. (2024). Large language models for software engineering: A systematic literature review. *ACM Transactions on Software Engineering and Methodology, 33*(8), Article 220. https://doi.org/10.1145/3695988 | ⚠️ | LLM의 소프트웨어 공학 적용 체계적 문헌 고찰. 소프트웨어 관리 분야 연구가 가장 적었다는 결과. DOI는 확인, 권·호와 저자 목록은 원문 대조 필요 |
| R20 | (저자 확인 필요). (2027). Large language models in software project management: A two-phase systematic literature review. *Journal of Systems and Software, 244*, Article 113129. | ⚠️ | LLM의 소프트웨어 프로젝트 관리 적용은 노력 추정, 프로젝트 계획, 요구사항 활동에 집중되고, 대부분 개념 증명 수준이며 산업 검증이 부족함. 저자와 DOI, 발행 연도(온라인 2026, 권호 2027) 확인 필요 |
| R21 | Sarim, M., Masood, F., & Maheshwari, M. (2025). Generating reliable software project task flows using large language models through prompt engineering and robust evaluation. *Scientific Reports, 15*. https://doi.org/10.1038/s41598-025-19170-9 | ✅ | 프로젝트 설명으로부터 작업 흐름 생성. LLM 5종 × 프롬프트 전략 5종(제로샷, 퓨샷, 사고의 사슬, 역할 지정, ISO 21502 기반) 비교, 의미 유사도와 구조 평가. 본 연구와 가장 가까운 선행 연구. 논문 번호(article number) 확인 필요 |
| R22 | Zadenoori, et al. (2025). *Large language models (LLMs) for requirements engineering (RE): A systematic literature review* (arXiv:2509.11446). arXiv. | ⚠️ | 2023~2024년 74편 분석. GPT 계열과 제로샷·퓨샷 위주, 통제된 환경 평가가 많고 산업 적용이 적음. 저자 목록 확인 필요 |
| R23 | Korba, B., & Pawluk, K. (2026). Automation of the planning phase of a construction project using AI agents. *Technologies, 14*(6), 351. https://doi.org/10.3390/technologies14060351 | ⚠️ | 건설 프로젝트에서 다중 에이전트로 WBS/CPM 작성, 작성 시간 480분 → 약 20분 보고. 저자와 학술지 정보가 서로 다른 출처에서 나와 대조 필요 |

## E. 평가 방법 (5장용)

| ID | 서지 정보 | 상태 | 뒷받침하는 내용 |
|---|---|---|---|
| R24 | Brooke, J. (1996). SUS: A "quick and dirty" usability scale. In P. W. Jordan, B. Thomas, B. A. Weerdmeester, & I. L. McClelland (Eds.), *Usability evaluation in industry* (pp. 189–194). Taylor & Francis. | 📘 | SUS 원전 |
| R25 | Bangor, A., Kortum, P., & Miller, J. (2009). Determining what individual SUS scores mean: Adding an adjective rating scale. *Journal of Usability Studies, 4*(3), 114–123. | 📘 | SUS 점수 해석 기준 |
| R26 | Nielsen, J., & Landauer, T. K. (1993). A mathematical model of the finding of usability problems. In *Proceedings of the INTERACT '93 and CHI '93 Conference on Human Factors in Computing Systems* (pp. 206–213). | 📘 | 소수 참여자 사용성 평가의 근거 |
| R27 | Koo, T. K., & Li, M. Y. (2016). A guideline of selecting and reporting intraclass correlation coefficients for reliability research. *Journal of Chiropractic Medicine, 15*(2), 155–163. | 📘 | 평가자 간 일치도(ICC) |
| R28 | Krippendorff, K. (2018). *Content analysis: An introduction to its methodology* (4th ed.). SAGE. | 📘 | 크리펜도르프 알파 |

## F. 도구 공식 문서 (2장 [표 1]용, 접속일 2026-11-18)

| ID | 문서 | 확인한 내용 |
|---|---|---|
| T01 | Atlassian Support. *Rovo AI features in Jira*. https://support.atlassian.com/organization-administration/docs/atlassian-intelligence-features-in-jira-software | Rovo가 상위 작업 항목의 내용을 바탕으로 하위 작업 항목 목록을 제안하고, 수락하면 하위 항목으로 생성 |
| T02 | Atlassian Community. *AI work breakdown is generally available*. https://community.atlassian.com/forums/Atlassian-AI-Rovo-articles/AI-Work-Breakdown-Is-Generally-Available/ba-p/2909859 | 작업 분해 기능은 작업 항목의 요약·설명과 기존 하위 항목, 연결된 Confluence 문서를 참고. 출시 당시 유료(Premium·Enterprise) 플랜 대상. 현재 플랜 조건은 가격 페이지로 재확인 필요 |
| T03 | Microsoft Tech Community, Planner Blog. *The next chapter for AI-powered work management in Microsoft Planner*. https://techcommunity.microsoft.com/t5/planner-blog/the-next-chapter-for-ai-powered-work-management-in-microsoft/ba-p/4469796 | Planner 에이전트(구 Project Manager 에이전트)가 목표로부터 작업 목록을 갖춘 계획을 생성. Microsoft 365 Copilot 라이선스 필요. 생성 작업에 의존 관계가 포함된다는 설명과 플랜별 제한은 Microsoft 공식 문서로 재확인 필요 |
| T04 | Notion Help Center. *Take AI meeting notes in Notion*. https://www.notion.com/help/ai-meeting-notes | 회의 음성을 받아 쓰고 핵심 내용과 Action Item을 정리. 베타 기능, Business·Enterprise 플랜 대상 |
| T05 | NAVER WORKS 도움말. *클로바노트 개요*, *AI 요약*. https://help.worksmobile.com/ko/use-guides/clovanote/overview/ , https://help.worksmobile.com/ko/use-guides/clovanote/view/ai-summary/ | 별도 상품인 네이버웍스 클로바노트가 회의를 기록하고 전체 요약, 회의 주제, 다음 할 일, 단락별 요약을 생성. 2024년 10월 기업용 출시 |

---

## 본문 위치별 후보 대응

| 장·절 | 인용이 필요한 내용 | 후보 |
|---|---|---|
| 1장 가 | WBS의 정의와 역할 | R01, R03 |
| 1장 가 | WBS 작성 소요 시간·작성자 경험에 따른 품질 차이 | 직접적 근거 미확보. R23(작성 시간 단축 사례)로 간접 보완하거나 문장 완화 필요 |
| 1장 가 | 회의 후속 조치 누락의 영향 | R06, R07, R10 (직접적 근거는 원문 확인 필요) |
| 1장 가 | 기존 도구의 기능 | T01~T05 |
| 1장 가 | LLM의 문서 이해와 구조화 출력 | R12, R13, R17, R21 |
| 2장 가-1) | WBS 정의, 100% 규칙, 작업 패키지 | R03 (R01, R02 보조) |
| 2장 가-1) | WBS 품질과 작성자 경험 | 직접적 근거 미확보. 문장 완화 검토 |
| 2장 가-2) | 의존 관계 4유형, PDM, 기간 추정 | R02 |
| 2장 가-2) | CPM, PERT | R04, R05 |
| 2장 나-1) | 회의 유형 | R01 또는 R02 |
| 2장 나-1) | 안건과 회의 효과성 | R06, R07 |
| 2장 나-1) | 체크리스트의 누락 방지 효과 | R08 |
| 2장 나-2) | 이슈 기록부·조치 목록 | R02 |
| 2장 나-2) | ADR | R09 |
| 2장 나-2) | 후속 조치 누락의 영향 | R07, R10 (원문 확인 필요) |
| 2장 다-1) | 트랜스포머, 소수 예시 학습, 지시 학습 | R11, R12, R13 |
| 2장 다-1) | 장문맥·추론 기능 | R18(공급자 기술 문서) |
| 2장 다-1) | 환각 | R16 |
| 2장 다-1) | LLM의 프로젝트 관리 적용 연구 | R19, R20, R21, R22, R23, R10 |
| 2장 다-2) | 사고의 사슬 | R14, R15 |
| 2장 다-2) | 태그 구분 권장, 구조화된 출력 | R18, R17 |
| 2장 라 | 도구 비교 | T01~T05 |
| 4장 가-3) | 구조화된 프롬프트, 단계적 추론 | R18, R14 |
| 5장 | SUS, 평가자 간 일치도, 참여자 수 | R24~R28 |

## 직접적 근거를 찾지 못한 주장

다음 두 주장은 이번 조사에서 직접 뒷받침하는 문헌을 찾지 못했다. 문헌을 더 찾거나, 본문 표현을 근거가 있는 범위로 줄이는 것이 좋다.

1. WBS 작성에 시간이 많이 들고 작성자 경험에 따라 품질이 달라진다 (1장 가, 2장 가-1))
2. 회의 후속 조치가 누락되면 같은 논의가 반복되고 일정이 지연된다 (1장 가, 2장 나-2))

추가 검색어: "work breakdown structure quality experience", "WBS development effort", "meeting action items follow-through", "meeting outcomes implementation".
