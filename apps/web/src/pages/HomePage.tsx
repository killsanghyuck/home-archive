import type { CSSProperties } from 'react';
import type { FamilyTimelineMonth, LibraryHome, UploadPhotoResponse } from '@home-archive/shared';
import { RecentPhotosCard } from '../components/RecentPhotosCard.js';
import { AiHighlightsCard } from '../components/AiHighlightsCard.js';
import { FamilyInviteCard } from '../components/FamilyInviteCard.js';
import { AiProvidersCard } from '../components/AiProvidersCard.js';
import { UploadCard } from '../components/UploadCard.js';

export interface HomePageProps {
  library: LibraryHome;
  loadError?: string | null;
  onUploaded?: (photo: UploadPhotoResponse) => void;
  onGenerateMonthlySummary?: (month: string) => Promise<void> | void;
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

function HeroPreview(): JSX.Element {
  return (
    <section className="hero-preview" aria-label="이번 달 우리 가족 기록">
      <div className="hero-preview__eyebrow">이번 달 우리 가족 기록</div>
      <p className="hero-preview__body">
        <strong>12장</strong>의 사진이 새로 올라왔고, AI가 그중{' '}
        <em>4장</em>을 '엄마와 함께한 주말', <strong>3장</strong>을 '집에서 보낸 저녁'으로
        정리했어요.
      </p>
      <div className="hero-preview__photos">
        {[0, 3, 4, 1].map((t) => (
          <PhotoTile key={t} tint={t} />
        ))}
      </div>
    </section>
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

function TimelineCard({ months }: { months: FamilyTimelineMonth[] }): JSX.Element {
  const totalPhotos = months.reduce((sum, month) => sum + month.photoCount, 0);
  const totalDays = months.reduce((sum, month) => sum + month.dayCount, 0);

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

export function HomePage({
  library,
  loadError,
  onUploaded,
  onGenerateMonthlySummary
}: HomePageProps): JSX.Element {
  return (
    <div className="workspace">
      <header className="workspace__hero">
        <nav className="workspace__topbar" aria-label="제품 정보">
          <div className="workspace__brand">
            <span className="workspace__brand-mark">기</span>
            <span className="workspace__wordmark">우리집 기록관</span>
          </div>
          <div className="workspace__chips">
            <span className="chip chip--accent">로컬 우선</span>
            <span className="chip">집 컴퓨터 설치형</span>
            <span className="chip">{library.householdName}</span>
          </div>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <h1 className="workspace__title">
              <span className="workspace__kicker">우리집 기록관</span>
              사진은 각자의 폰에 흩어져 있지만, 기억은 한 가족 공간에 평생 쌓입니다.
            </h1>
            <p className="workspace__subtitle">
              가족이 함께 사진을 올리면 AI가 시간, 사람, 장소별로 정리해줘요.
            </p>
            <div className="hero-actions" aria-label="주요 작업">
              <a className="button button--accent" href="#upload-card">사진 올리기</a>
              <a className="button button--secondary" href="#timeline-card">타임라인 보기</a>
            </div>
            <p className="hero-local-note">
              사진과 메타데이터는 모두 이 집 컴퓨터에만 저장돼요. 외부 클라우드로 보내지 않습니다.
            </p>
          </div>
          <HeroPreview />
        </div>
      </header>

      {loadError ? (
        <div className="workspace__notice" role="status">
          서버에 연결하지 못했습니다 ({loadError}). 표시된 내용은 임시 데이터입니다.
        </div>
      ) : null}

      <main className="workspace__grid">
        <div className="workspace__primary">
          <AiSummaryDesignCard photoCount={library.recentPhotos.length} />
          <AiHighlightsCard
            highlights={library.highlights}
            latestMonth={library.timelineMonths[0]}
            onGenerateMonthlySummary={onGenerateMonthlySummary}
          />
          <div id="timeline-card">
            <TimelineCard months={library.timelineMonths} />
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

      <footer className="workspace__footer">
        집 컴퓨터에 설치해 우리집 Wi-Fi 안에서만 동작하는 로컬 우선 가족 사진 저장소
      </footer>
    </div>
  );
}
