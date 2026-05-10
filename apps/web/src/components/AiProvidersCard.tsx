import type { AiProvider } from '@home-archive/shared';

export interface AiProvidersCardProps {
  providers: AiProvider[];
}

const statusLabel: Record<AiProvider['status'], string> = {
  connected: '연결됨',
  disconnected: '연결 안 됨',
  error: '오류'
};

export function AiProvidersCard({ providers }: AiProvidersCardProps): JSX.Element {
  return (
    <section className="card card--providers" aria-label="AI 연결 설정">
      <header className="card__header">
        <h2 className="card__title">AI 연결 설정</h2>
        <span className="card__hint">Claude · GPT · Ollama</span>
      </header>
      <ul className="provider-list">
        {providers.map((p) => (
          <li key={p.id} className="provider-list__item">
            <div className="provider-list__main">
              <p className="provider-list__label">{p.label}</p>
              <p className="provider-list__model">{p.model}</p>
            </div>
            <span className={`status status--${p.status}`}>{statusLabel[p.status]}</span>
          </li>
        ))}
      </ul>
      <p className="card__hint card__hint--muted">
        키는 이 집 컴퓨터 설정 파일에만 저장되고 외부로 전송되지 않습니다.
      </p>
    </section>
  );
}
