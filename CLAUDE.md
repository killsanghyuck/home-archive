# CLAUDE.md — 우리집 기록관

이 저장소에서 작업할 때 따라야 하는 규칙과 맥락.

## 제품 정체성

- **이름**: 우리집 기록관 (Home Archive)
- **형태**: 클라우드 SaaS 가 아니라 **집 컴퓨터 설치형 로컬 우선** 서비스
- **저장소**: 사진 원본 / 메타데이터 / AI 결과는 전부 로컬
- **접속**: 가족은 같은 Wi-Fi 의 모바일 웹/PWA 로 접속
- **AI**: 사용자가 연결한 Claude / GPT / Ollama Provider Adapter 로만 호출

## 모노레포 구조

```
apps/
  web/      Vite + React + TypeScript (PWA, 모바일 웹 우선)
  server/   Node + Fastify + TypeScript (로컬 HTTP API)
packages/
  shared/   공통 타입 (AiProvider, PhotoSummary, HealthResponse ...)
```

워크스페이스 매니저는 **pnpm** 입니다. `pnpm-workspace.yaml` 참고.

## 코딩 원칙

- TypeScript strict 유지. `any` 자제.
- 외부 SaaS 호출은 **사용자가 연결한 AI Provider** 외에는 하지 말 것.
- 비밀값은 코드에 박지 말고 환경 변수로. 기본값으로 가짜 키 만들어 두지 말 것.
- UI 는 **가족이 거실에서 쓰는 워크스페이스** 느낌. admin dashboard 처럼 만들지 말 것.

## TDD 작업 흐름

1. 기능 추가/수정 시 **테스트를 먼저** 작성하고 실패 확인.
2. 최소 구현으로 통과시키고, 필요하면 리팩터.
3. 마무리 단계에서 다음 명령으로 검증:
   ```bash
   pnpm test
   pnpm build
   pnpm lint
   ```

## 주요 명령어

| 명령 | 설명 |
| --- | --- |
| `pnpm dev` | web + server 병렬 실행 |
| `pnpm test` | 모든 워크스페이스 Vitest 실행 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm lint` | ESLint 검사 |
| `pnpm typecheck` | tsc --noEmit |

## 로컬 저장소 규칙

- 기본 라이브러리 루트: `~/HomeArchiveLibrary` (env `HOME_ARCHIVE_LIBRARY_DIR` 로 override).
- 하위 폴더: `config / database / originals / thumbnails / exports / backups`.
- SQLite DB: `database/homearchive.sqlite`. `better-sqlite3` 로 동기 접근.
- 테이블: `families`, `members`, `photos`, `ai_summaries`. 첫 실행 시 `우리집` 가족 / `집주인` 멤버를 시드.
- 원본 사진은 `originals/YYYY/MM/<photo-id>-original.<ext>` 로만 저장. 외부 SaaS 로 절대 업로드하지 않음.
- 테스트는 항상 `mkdtemp` 임시 디렉토리 + 임시 SQLite 파일을 사용해야 함. 사용자 홈을 건드리지 말 것.

## 보안/안전 규칙

- 위험한 삭제 명령 (`rm -rf`, `git reset --hard`, force push 등) 사용 금지.
- 실제 API key / 비밀값을 만들지 말 것. 필요하면 인터페이스/mock 까지만.
- 외부 통신은 명시적인 Provider Adapter 를 통해서만.
