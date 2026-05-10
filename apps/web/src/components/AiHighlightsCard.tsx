import type { AiHighlight, FamilyTimelineMonth } from '@home-archive/shared';

export interface AiHighlightsCardProps {
  highlights: AiHighlight[];
  latestMonth?: FamilyTimelineMonth;
  onGenerateMonthlySummary?: (month: string) => Promise<void> | void;
}

export function AiHighlightsCard({
  highlights,
  latestMonth,
  onGenerateMonthlySummary
}: AiHighlightsCardProps): JSX.Element {
  return (
    <section className="card card--highlights" aria-label="AI 요약">
      <header className="card__header">
        <div>
          <h2 className="card__title">AI 요약</h2>
          <p className="card__eyebrow">Mock Provider</p>
        </div>
        {latestMonth ? <span className="card__hint">{latestMonth.label}</span> : null}
      </header>
      {highlights.length === 0 ? (
        <p className="card__empty">
          {latestMonth
            ? `${latestMonth.label} 사진 ${latestMonth.photoCount}장을 바탕으로 월별 AI 요약을 만들 수 있어요.`
            : '사진을 올리면 월별 AI 요약을 만들 수 있어요.'}
        </p>
      ) : (
        <ul className="highlight-list">
          {highlights.map((h) => (
            <li key={h.id} className="highlight-list__item">
              <h3 className="highlight-list__title">{h.title}</h3>
              <p className="highlight-list__body">{h.body}</p>
              <p className="highlight-list__meta">
                {new Date(h.generatedAt).toLocaleDateString('ko-KR')} · {h.providerId} · 사진 {h.photoCount}장
              </p>
            </li>
          ))}
        </ul>
      )}
      {latestMonth && onGenerateMonthlySummary ? (
        <button
          type="button"
          className="button button--accent button--full"
          onClick={() => void onGenerateMonthlySummary(latestMonth.month)}
        >
          {latestMonth.label} AI 요약 만들기
        </button>
      ) : null}
    </section>
  );
}
