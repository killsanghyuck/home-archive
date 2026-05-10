import { useId, useRef, useState, type FormEvent } from 'react';
import type { UploadPhotoResponse } from '@home-archive/shared';

export interface UploadCardProps {
  onUploaded: (photo: UploadPhotoResponse) => void;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export function UploadCard({ onUploaded }: UploadCardProps): JSX.Element {
  const uploadedById = useId();
  const memoId = useId();
  const fileId = useId();

  const formRef = useRef<HTMLFormElement | null>(null);
  const [uploadedBy, setUploadedBy] = useState('');
  const [memo, setMemo] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const canSubmit =
    uploadedBy.trim().length > 0 && file !== null && status.kind !== 'uploading';

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!canSubmit || !file) return;
    const fd = new FormData();
    fd.append('uploadedBy', uploadedBy.trim());
    if (memo.trim().length > 0) fd.append('memo', memo.trim());
    fd.append('photo', file);

    setStatus({ kind: 'uploading' });
    try {
      const res = await fetch('/api/photos', { method: 'POST', body: fd });
      if (!res.ok) {
        const detail = await res
          .json()
          .then((j: { error?: string }) => j.error)
          .catch(() => undefined);
        setStatus({
          kind: 'error',
          message: detail ?? `상태 코드 ${res.status}`
        });
        return;
      }
      const photo = (await res.json()) as UploadPhotoResponse;
      onUploaded(photo);
      setStatus({
        kind: 'success',
        message: `사진을 잘 받았어요. AI 분석은 ${photo.aiStatus} 상태예요.`
      });
      formRef.current?.reset();
      setUploadedBy('');
      setMemo('');
      setFile(null);
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : '알 수 없는 오류'
      });
    }
  }

  return (
    <section className="card card--upload" aria-label="사진 올리기">
      <header className="card__header">
        <h2 className="card__title">사진 올리기</h2>
        <span className="card__hint">집 컴퓨터에 바로 저장</span>
      </header>
      <form ref={formRef} className="upload-form" onSubmit={handleSubmit}>
        <label className="upload-form__label" htmlFor={uploadedById}>
          올린 사람
        </label>
        <input
          id={uploadedById}
          className="upload-form__input"
          type="text"
          value={uploadedBy}
          onChange={(e) => setUploadedBy(e.target.value)}
          placeholder="엄마"
          required
        />

        <label className="upload-form__label" htmlFor={memoId}>
          메모
        </label>
        <textarea
          id={memoId}
          className="upload-form__textarea"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="이 사진에 어떤 이야기가 있나요?"
          rows={2}
        />

        <label className="upload-form__label" htmlFor={fileId}>
          사진 파일
        </label>
        <input
          id={fileId}
          className="upload-form__input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <button
          type="submit"
          className="card__action"
          disabled={!canSubmit}
        >
          {status.kind === 'uploading' ? '올리는 중…' : '올리기'}
        </button>

        {status.kind === 'success' ? (
          <p className="upload-form__notice upload-form__notice--ok" role="status">
            {status.message}
          </p>
        ) : null}
        {status.kind === 'error' ? (
          <p className="upload-form__notice upload-form__notice--err" role="alert">
            사진을 올리지 못했어요 ({status.message}).
          </p>
        ) : null}
        <p className="card__hint card__hint--muted">
          사진은 외부로 나가지 않고 이 집 컴퓨터에만 저장돼요.
        </p>
      </form>
    </section>
  );
}
