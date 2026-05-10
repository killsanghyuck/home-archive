# 우리집 기록관 (Home Archive)

집 컴퓨터에 설치해 우리집 Wi-Fi 안에서만 동작하는 **로컬 우선 가족 사진/기억 저장소**입니다.

- 사진 원본, 메타데이터, AI 결과는 기본적으로 **집 컴퓨터(로컬)** 에 저장됩니다.
- 가족은 같은 Wi-Fi 또는 Tailscale 같은 사설 네트워크에서 **모바일 웹/PWA** 로 접속합니다.
- AI 기능은 사용자가 연결한 **Claude / GPT / Ollama** 등 Provider Adapter 를 통해서만 동작하도록 설계합니다.
- 클라우드 SaaS 로 가족 사진을 맡기는 구조가 아닙니다.

## 현재 구현된 기능

- Vite + React 기반 웹 UI
- Fastify 기반 로컬 API 서버
- SQLite 로컬 DB 초기화
- `~/HomeArchiveLibrary` 로컬 라이브러리 폴더 자동 생성
- 사진 업로드 API/UX
- 업로드한 원본 사진 저장
- `sharp` 기반 WebP 썸네일 생성
- 원본/썸네일 이미지 API 제공
- `exifr` 기반 EXIF 촬영일 추출
- 실제 촬영일 기준 월/일 가족 타임라인
- Mock AI Provider 기반 월별 가족 요약 생성
- AI 요약 결과 SQLite 저장 및 홈 화면 표시
- Vitest 테스트, TypeScript 빌드, ESLint 검증

## 모노레포 구성

```text
apps/
  web/      Vite + React + TypeScript — 가족 친화적 PWA UI
  server/   Node + Fastify + TypeScript — 집 컴퓨터에서 도는 로컬 API
packages/
  shared/   공통 타입
```

## 빠른 시작

```bash
pnpm install
pnpm dev      # web + server 동시 실행
pnpm test     # 모든 워크스페이스 테스트
pnpm build    # 프로덕션 빌드
pnpm lint     # ESLint 검사
```

기본 실행 주소:

- Web: `http://localhost:5173`
- API: `http://localhost:4319`
- Health: `http://localhost:4319/api/health`

처음 서버를 띄우면 `~/HomeArchiveLibrary` 가 자동으로 생성됩니다.

## 로컬 라이브러리 폴더

기본값은 `~/HomeArchiveLibrary` 이며, `HOME_ARCHIVE_LIBRARY_DIR` 환경 변수로 다른 위치를 지정할 수 있습니다.

```text
~/HomeArchiveLibrary/
  config/        — 사용자 설정
  database/      — SQLite (`homearchive.sqlite`)
  originals/     — 원본 사진 (`originals/YYYY/MM/<photo-id>-original.<ext>`)
  thumbnails/    — WebP 썸네일 (`thumbnails/YYYY/MM/<photo-id>-thumb.webp`)
  exports/       — 가족에게 공유할 묶음 내보내기
  backups/       — 백업 임시 저장소
```

## API

- `GET /api/health`
  - 로컬 서버 상태
- `GET /api/library`
  - 가족 홈 데이터
  - 최근 사진
  - 실제 촬영일 기준 `timelineMonths`
- `POST /api/photos`
  - 사진 업로드
- `GET /api/photos/:id/thumbnail`
  - WebP 썸네일 반환
- `GET /api/photos/:id/original`
  - 원본 이미지 반환
- `POST /api/ai/monthly-summary`
  - Mock AI Provider로 월별 가족 요약 생성
  - 결과를 SQLite `ai_summaries`에 저장
  - 같은 월 요약을 다시 생성하면 기존 Mock 요약을 교체

### `POST /api/photos`

`multipart/form-data` 로 전송합니다.

필드:

- `photo` 필수: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`
- `uploadedBy` 필수: 올린 사람 이름
- `memo` 선택: 가족에게 남길 한 줄 메모
- `takenAt` 선택: ISO-8601 촬영 시각
- `place` 선택: 장소 메모

촬영일 처리:

1. 사용자가 `takenAt`을 직접 보내면 그 값을 우선 사용합니다.
2. `takenAt`이 없으면 EXIF `DateTimeOriginal`, `CreateDate`, `ModifyDate` 등에서 촬영일을 추출합니다.
3. 촬영일이 있으면 가족 타임라인은 업로드일이 아니라 실제 촬영일 기준으로 정리됩니다.

## 설계 원칙

1. **로컬 우선** — 외부 클라우드는 사용자가 연결한 AI Provider 외에는 접근하지 않음
2. **가족 중심 UI** — admin dashboard 가 아니라 거실 TV / 폰에서 보기 편한 워크스페이스 느낌
3. **모듈식 AI** — Provider Adapter 인터페이스 뒤로 모델 호출을 숨겨 자유롭게 교체 가능
4. **파일 경로 보호** — 로컬 절대 경로를 브라우저에 직접 노출하지 않고 API로 원본/썸네일 제공

자세한 개발 가이드는 [`CLAUDE.md`](./CLAUDE.md) 참고.
