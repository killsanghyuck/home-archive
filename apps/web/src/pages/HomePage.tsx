import type { CSSProperties } from 'react';
import type { FamilyTimelineMonth, LibraryHome, PhotoSummary, UploadPhotoResponse } from '@home-archive/shared';
import { RecentPhotosCard } from '../components/RecentPhotosCard.js';
import { AiHighlightsCard } from '../components/AiHighlightsCard.js';
import { FamilyInviteCard } from '../components/FamilyInviteCard.js';
import { AiProvidersCard } from '../components/AiProvidersCard.js';
import { UploadCard } from '../components/UploadCard.js';

export type HomePageView = 'home' | 'photos';

export interface HomePageProps {
  library: LibraryHome;
  loadError?: string | null;
  activePage?: HomePageView;
  onNavigate?: (page: HomePageView) => void;
  onUploaded?: (photo: UploadPhotoResponse) => void;
  onGenerateMonthlySummary?: (month: string) => Promise<void> | void;
  onDeletePhoto?: (photoId: string) => Promise<void> | void;
}

const collections = [
  { title: '엄마와 함께한 주말', count: 24, kind: 'people', label: '사람', tints: [1, 3, 5] },
  { title: '2026년 봄', count: 47, kind: 'time', label: '시기', tints: [2, 4, 0] },
  { title: '집에서 보낸 저녁', count: 18, kind: 'place', label: '장소', tints: [4, 5, 7] },
  { title: '아직 정보가 필요한 사진', count: 6, kind: 'neutral', label: '미분류', tints: [6, 3, 1] }
];

function PhotoTile({ tint = 0, label }: { tint?: number; label?: string }): JSX.Element {
  return (
    <div className={`photo-tile photo-tile--${tint % 8}`} aria-hidden="true">
      {label ? <span className="photo-tile__label">{label}</span> : null}
    </div>
  );
}

function AiSummaryDesignCard({ photoCount }: { photoCount: number }): JSX.Element {
  const count = Math.max(photoCount, 12);
  return (
    <section className="card card--ai-summary" aria-label="AI 월간 요약">
      <div className="card__eyebrow">이번 달 우리 가족 기록</div>
      <p className="ai-summary__body">
        <strong>{count}장</strong>의 사진이 새로 올라왔고, AI가 그중{' '}
        <em className="text-clay">4장</em>을 '엄마와 함께한 주말',{' '}
        <em className="text-sage">3장</em>을 '집에서 보낸 저녁',{' '}
        <em>2장</em>을 '아직 정보가 필요한 사진'으로 정리했어요.
      </p>
      <p className="ai-summary__note">
        아무도 자세히 적지 않았지만, 사진 속 시간과 가족의 흔적은 이렇게 다시 찾을 수
        있게 남았습니다.
      </p>
    </section>
  );
}

function TimelineCard({
  months,
  onDeletePhoto
}: {
  months: FamilyTimelineMonth[];
  onDeletePhoto?: (photoId: string) => Promise<void> | void;
}): JSX.Element {
  const totalPhotos = months.reduce((sum, month) => sum + month.photoCount, 0);
  const totalDays = months.reduce((sum, month) => sum + month.dayCount, 0);
  const photoLabel = (photo: FamilyTimelineMonth['days'][number]['photos'][number]): string =>
    photo.caption || photo.place || '가족 사진';

  return (
    <section className="card card--timeline" aria-label="우리집 타임라인">
      <header className="card__header">
        <div>
          <p className="card__eyebrow">우리집 타임라인</p>
          <h2 className="card__title">언제 무슨 일이 있었는지 한눈에</h2>
        </div>
        <span className="chip chip--soft">{totalDays}개 날</span>
      </header>
      {months.length === 0 ? (
        <p className="card__empty">
          아직 촬영일이 있는 사진이 없어요. 사진을 올리면 실제 찍은 날짜 기준으로 타임라인을 만들어요.
        </p>
      ) : (
        <>
          <p className="card__empty">
            지금까지 우리집에는 <strong>{totalPhotos}장</strong>의 사진이 실제 촬영일 기준으로
            정리됐어요.
          </p>
          <div className="timeline-list">
            {months.flatMap((month) =>
              month.days.slice(0, 4).map((day, index) => (
                <article key={`${month.month}-${day.date}`} className="timeline-entry">
                  <span className={`timeline-entry__dot timeline-entry__dot--${index % 2 === 0 ? 'time' : 'people'}`} />
                  <div className="timeline-entry__content">
                    <div className="timeline-entry__date">
                      {month.label} · {day.label}
                    </div>
                    <h3>{day.title}</h3>
                    <p>
                      {day.place ? `${day.place} · ` : ''}사진 {day.photoCount}장
                    </p>
                    <p className="timeline-entry__note">
                      업로드 날짜가 아니라 사진 속 EXIF 촬영일 기준으로 정리했어요.
                    </p>
                    <div className="timeline-photo-list" aria-label={`${day.label} 사진 목록`}>
                      {day.photos.map((photo) => {
                        const label = photoLabel(photo);
                        return (
                          <article key={photo.id} className="timeline-photo-item">
                            <a
                              className="timeline-photo-item__image-link"
                              href={`/api/photos/${photo.id}/original`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`원본 보기: ${label}`}
                            >
                              <img
                                src={`/api/photos/${photo.id}/thumbnail`}
                                alt={label}
                                loading="lazy"
                              />
                            </a>
                            <div className="timeline-photo-item__meta">
                              <strong>{label}</strong>
                              <span>{photo.place ? `${photo.place} · ` : ''}{new Date(photo.takenAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}</span>
                            </div>
                            {onDeletePhoto ? (
                              <button
                                type="button"
                                className="timeline-photo-item__delete"
                                onClick={() => void onDeletePhoto(photo.id)}
                                aria-label={`삭제: ${label}`}
                              >
                                삭제
                              </button>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}

function CollectionsCard(): JSX.Element {
  return (
    <section className="card card--collections" aria-label="AI가 정리한 묶음">
      <header className="card__header">
        <div>
          <p className="card__eyebrow">AI가 정리한 묶음</p>
          <h2 className="card__title">시간, 사람, 장소, 상황별로 자동 분류돼요.</h2>
        </div>
      </header>
      <div className="collection-list">
        {collections.map((c) => (
          <article key={c.title} className="collection-row">
            <div className="collection-row__stack" aria-hidden="true">
              {c.tints.map((t, idx) => (
                <span key={t} style={{ '--offset': `${idx * 5}px` } as CSSProperties}>
                  <PhotoTile tint={t} />
                </span>
              ))}
            </div>
            <div className="collection-row__main">
              <span className={`tag tag--${c.kind}`}>{c.label}</span>
              <h3>{c.title}</h3>
              <p>사진 {c.count}장</p>
            </div>
            <span className="collection-row__chevron" aria-hidden="true">›</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function collectAllPhotos(library: LibraryHome): PhotoSummary[] {
  const byId = new Map<string, PhotoSummary>();
  for (const month of library.timelineMonths) {
    for (const day of month.days) {
      for (const photo of day.photos) {
        byId.set(photo.id, photo);
      }
    }
  }
  for (const photo of library.recentPhotos) {
    if (!byId.has(photo.id)) {
      byId.set(photo.id, photo);
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
  );
}

function photoLabel(photo: PhotoSummary): string {
  return photo.caption || photo.place || '가족 사진';
}

function formatPhotoDate(photo: PhotoSummary): string {
  return new Date(photo.takenAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'UTC'
  });
}

function FullPhotoListPage({
  photos,
  onDeletePhoto
}: {
  photos: PhotoSummary[];
  onDeletePhoto?: (photoId: string) => Promise<void> | void;
}): JSX.Element {
  return (
    <section className="card all-photos-page" aria-label="전체 사진">
      <header className="all-photos-page__header">
        <div>
          <p className="card__eyebrow">사진 보관함</p>
          <h1 className="card__title">전체 사진</h1>
          <p className="card__empty">타임라인에 정리된 모든 가족 사진을 한곳에서 볼 수 있어요.</p>
        </div>
        <span className="chip chip--soft">총 {photos.length}장</span>
      </header>

      {photos.length === 0 ? (
        <p className="card__empty">아직 올라온 사진이 없어요. 사진을 올리면 이곳에 전체 목록이 생겨요.</p>
      ) : (
        <div className="all-photo-grid">
          {photos.map((photo) => {
            const label = photoLabel(photo);
            return (
              <article key={photo.id} className="all-photo-card">
                <a
                  className="all-photo-card__image-link"
                  href={`/api/photos/${photo.id}/original`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`원본 보기: ${label}`}
                >
                  <img src={`/api/photos/${photo.id}/thumbnail`} alt={label} loading="lazy" />
                </a>
                <div className="all-photo-card__body">
                  <strong>{label}</strong>
                  <span>{formatPhotoDate(photo)}</span>
                  {photo.place ? <span>{photo.place}</span> : null}
                </div>
                {onDeletePhoto ? (
                  <button
                    type="button"
                    className="all-photo-card__delete"
                    onClick={() => void onDeletePhoto(photo.id)}
                    aria-label={`삭제: ${label}`}
                  >
                    삭제
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function HomePage({
  library,
  loadError,
  activePage = 'home',
  onNavigate,
  onUploaded,
  onGenerateMonthlySummary,
  onDeletePhoto
}: HomePageProps): JSX.Element {
  const allPhotos = collectAllPhotos(library);
  const navigate = (page: HomePageView): void => {
    onNavigate?.(page);
  };

  return (
    <div className="workspace">
      <header className="workspace__header">
        <nav className="workspace__topbar" aria-label="주요 페이지">
          <div className="workspace__brand">
            <span className="workspace__brand-mark">기</span>
            <h1 className="workspace__wordmark">우리집 기록관</h1>
          </div>
          <div className="workspace__nav-actions">
            <button
              type="button"
              className={`nav-tab ${activePage === 'home' ? 'nav-tab--active' : ''}`}
              onClick={() => navigate('home')}
            >
              홈
            </button>
            <button
              type="button"
              className={`nav-tab ${activePage === 'photos' ? 'nav-tab--active' : ''}`}
              onClick={() => navigate('photos')}
            >
              전체 사진
            </button>
            <a className="button button--accent button--compact" href="#upload-card">사진 올리기</a>
          </div>
        </nav>
      </header>

      {loadError ? (
        <div className="workspace__notice" role="status">
          서버에 연결하지 못했습니다 ({loadError}). 표시된 내용은 임시 데이터입니다.
        </div>
      ) : null}

      {activePage === 'photos' ? (
        <main className="workspace__single">
          <FullPhotoListPage photos={allPhotos} onDeletePhoto={onDeletePhoto} />
          <aside className="workspace__side workspace__side--inline" aria-label="설정과 업로드">
            <div id="upload-card">
              <UploadCard onUploaded={(p) => onUploaded?.(p)} />
            </div>
          </aside>
        </main>
      ) : (
        <main className="workspace__grid">
          <div className="workspace__primary">
            <AiSummaryDesignCard photoCount={library.recentPhotos.length} />
            <AiHighlightsCard
              highlights={library.highlights}
              latestMonth={library.timelineMonths[0]}
              onGenerateMonthlySummary={onGenerateMonthlySummary}
            />
            <div id="timeline-card">
              <TimelineCard months={library.timelineMonths} onDeletePhoto={onDeletePhoto} />
            </div>
            <CollectionsCard />
            <RecentPhotosCard photos={library.recentPhotos} />
          </div>
          <aside className="workspace__side" aria-label="설정과 업로드">
            <div id="upload-card">
              <UploadCard onUploaded={(p) => onUploaded?.(p)} />
            </div>
            <FamilyInviteCard members={library.family} />
            <AiProvidersCard providers={library.providers} />
          </aside>
        </main>
      )}

      <footer className="workspace__footer">
        집 컴퓨터에 설치해 우리집 Wi-Fi 안에서만 동작하는 로컬 우선 가족 사진 저장소
      </footer>
    </div>
  );
}
