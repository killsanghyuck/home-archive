import type { FamilyMember } from '@home-archive/shared';

export interface FamilyInviteCardProps {
  members: FamilyMember[];
}

const roleLabel: Record<FamilyMember['role'], string> = {
  owner: '집주인',
  family: '가족',
  guest: '손님'
};

export function FamilyInviteCard({ members }: FamilyInviteCardProps): JSX.Element {
  return (
    <section className="card card--family" aria-label="가족 초대">
      <header className="card__header">
        <h2 className="card__title">가족 초대</h2>
        <span className="card__hint">{members.length}명</span>
      </header>
      {members.length === 0 ? (
        <p className="card__empty">아직 초대된 가족이 없어요.</p>
      ) : (
        <ul className="family-list">
          {members.map((m) => (
            <li key={m.id} className="family-list__item">
              <div className="family-list__avatar" aria-hidden="true">
                {m.name.slice(0, 1)}
              </div>
              <div className="family-list__meta">
                <p className="family-list__name">{m.name}</p>
                <p className="family-list__role">{roleLabel[m.role]}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="card__action">
        같은 Wi-Fi 가족 초대 링크 만들기
      </button>
    </section>
  );
}
