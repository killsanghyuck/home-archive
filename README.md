# 우리집 기록관 (Home Archive)

집 컴퓨터에 설치해 우리집 Wi-Fi 안에서만 동작하는 **로컬 우선 가족 사진/기억 저장소**.

- 사진 원본, 메타데이터, AI 결과는 모두 **집 컴퓨터(로컬)** 에 저장됩니다.
- 가족은 같은 Wi-Fi에서 **모바일 웹/PWA** 로 접속해 공유 라이브러리를 봅니다.
- AI 기능은 사용자가 연결한 **Claude / GPT / Ollama** 등 Provider Adapter 를 통해서만 동작합니다.
- 클라우드 SaaS 로 데이터를 보내지 않습니다.

## 모노레포 구성

```
apps/
  web/      Vite + React + TypeScript — 가족 친화적 PWA UI
  server/   Node + Fastify + TypeScript — 집 컴퓨터에서 도는 로컬 API
packages/
  shared/   공통 타입 (AiProvider, PhotoSummary, HealthResponse, LocalLibraryConfig ...)
```

## 빠른 시작

```bash
pnpm install
pnpm dev      # web + server 동시 실행
pnpm test     # 모든 워크스페이스 테스트
pnpm build    # 프로덕션 빌드
pnpm lint     # ESLint 검사
```

처음 서버를 띄우면 `~/HomeArchiveLibrary` 가 자동으로 생성됩니다.

## 로컬 라이브러리 폴더

기본값은 `~/HomeArchiveLibrary` 이며, `HOME_ARCHIVE_LIBRARY_DIR` 환경 변수로 다른 위치를 지정할 수 있습니다.

```
~/HomeArchiveLibrary/
  config/        — 사용자 설정 (Provider 키 등은 여기로만 저장)
  database/      — SQLite (homearchive.sqlite)
  originals/     — 원본 사진 (originals/YYYY/MM/<photo-id>-original.<ext>)
  thumbnails/    — 썸네일 (다음 마일스톤에서 생성)
  exports/       — 가족에게 공유할 묶음 내보내기
  backups/       — 외장 디스크 백업 임시 저장소
```

## API

| 메소드 | 경로 | 설명 |
| --- | --- | --- |
| `GET`  | `/api/health`  | 로컬 서버 상태 |
| `GET`  | `/api/library` | 가족 홈 데이터 (DB 기반 최근 사진 포함) |
| `POST` | `/api/photos`  | 사진 업로드 (`multipart/form-data`) |

### `POST /api/photos`

- `multipart/form-data` 로 전송합니다.
- 필드
  - `photo` (file, 필수) — `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif` 만 허용
  - `uploadedBy` (text, 필수) — 올린 사람 이름
  - `memo` (text, 선택) — 가족에게 남길 한 줄 메모
  - `takenAt` (text, 선택) — ISO-8601 촬영 시각
  - `place` (text, 선택) — 장소 메모
- 성공 시 `201` 과 다음 형태의 JSON 반환

```json
{
  "id": "photo-...",
  "uploadedBy": "엄마",
  "uploadedAt": "2026-05-10T10:00:00.000Z",
  "originalPath": "/.../originals/2026/05/photo-...-original.jpg",
  "memo": "주말 산책",
  "mimeType": "image/jpeg",
  "byteSize": 12345,
  "aiStatus": "pending"
}
```

원본은 `originals/YYYY/MM/<photo-id>-original.<ext>` 로 저장되고, sha256 해시와 메타데이터는 SQLite `photos` 테이블에 기록됩니다. 썸네일과 AI 분석은 다음 마일스톤에서 활성화됩니다.

## 설계 원칙

1. **로컬 우선** — 외부 클라우드는 사용자가 연결한 AI Provider 외에는 접근하지 않음
2. **가족 중심 UI** — admin dashboard 가 아니라 거실 TV / 폰에서 보기 편한 워크스페이스 느낌
3. **모듈식 AI** — Provider Adapter 인터페이스 뒤로 모델 호출을 숨겨 자유롭게 교체 가능

자세한 개발 가이드는 [`CLAUDE.md`](./CLAUDE.md) 참고.
# home-archive
