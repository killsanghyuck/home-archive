import type { AiHighlight } from '@home-archive/shared';

export interface AiHighlightsCardProps {
  highlights: AiHighlight[];
}

export function AiHighlightsCard({ highlights }: AiHighlightsCardProps): JSX.Element {
  return (
    <section className="card card--highlights" aria-label="AI 요약">
      <header className="card__header">
        <h2 className="card__title">AI 요약</h2>
        <span className="card__hint">이번 주</span>
      </header>
      {highlights.length === 0 ? (
        <p className="card__empty">
          AI 연결을 마치면 이번 주 가족 이야기를 요약해 드려요.
        </p>
      ) : (
        <ul className="highlight-list">
          {highlights.map((h) => (
            <li key={h.id} className="highlight-list__item">
              <h3 className="highlight-list__title">{h.title}</h3>
              <p className="highlight-list__body">{h.body}</p>
              <p className="highlight-list__meta">
                {new Date(h.generatedAt).toLocaleDateString('ko-KR')} · {h.providerId}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
