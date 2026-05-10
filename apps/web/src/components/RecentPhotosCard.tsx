import type { PhotoSummary } from '@home-archive/shared';

export interface RecentPhotosCardProps {
  photos: PhotoSummary[];
}

function photoLabel(photo: PhotoSummary): string {
  return photo.caption ?? '제목 없는 사진';
}

export function RecentPhotosCard({ photos }: RecentPhotosCardProps): JSX.Element {
  return (
    <section className="card card--photos" aria-label="최근 사진">
      <header className="card__header">
        <h2 className="card__title">최근 사진</h2>
        <span className="card__hint">{photos.length}장</span>
      </header>
      {photos.length === 0 ? (
        <p className="card__empty">아직 추가된 사진이 없어요. 폴더를 연결해 보세요.</p>
      ) : (
        <ul className="photo-list">
          {photos.map((photo) => {
            const label = photoLabel(photo);
            return (
              <li key={photo.id} className="photo-list__item">
                <a
                  className="photo-list__thumb-link"
                  href={`/api/photos/${photo.id}/original`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${label} 원본 보기`}
                >
                  <img
                    className="photo-list__thumb photo-list__thumb--image"
                    src={`/api/photos/${photo.id}/thumbnail`}
                    alt={label}
                    loading="lazy"
                  />
                </a>
                <div className="photo-list__meta">
                  <p className="photo-list__caption">{label}</p>
                  <p className="photo-list__sub">
                    {new Date(photo.takenAt).toLocaleDateString('ko-KR')}
                    {photo.place ? ` · ${photo.place}` : ''}
                  </p>
                  {photo.people.length > 0 ? (
                    <p className="photo-list__people">{photo.people.join(', ')}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
