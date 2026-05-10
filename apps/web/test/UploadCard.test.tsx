import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UploadCard } from '../src/components/UploadCard.js';

describe('UploadCard', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the upload form heading', () => {
    render(<UploadCard onUploaded={() => {}} />);
    expect(
      screen.getByRole('region', { name: /사진 올리기/ })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/올린 사람/)).toBeInTheDocument();
    expect(screen.getByLabelText(/메모/)).toBeInTheDocument();
  });

  it('disables submit until a file and uploader name are present', () => {
    render(<UploadCard onUploaded={() => {}} />);
    const submit = screen.getByRole('button', { name: /올리기/ });
    expect(submit).toBeDisabled();
  });

  it('submits multipart/form-data and shows a success message', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        id: 'photo-1',
        uploadedBy: '엄마',
        uploadedAt: '2026-05-10T10:00:00Z',
        originalPath: '/lib/originals/2026/05/photo-1-original.jpg',
        memo: '주말 산책',
        mimeType: 'image/jpeg',
        byteSize: 22,
        aiStatus: 'pending'
      })
    });

    const onUploaded = vi.fn();
    render(<UploadCard onUploaded={onUploaded} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/올린 사람/), '엄마');
    await user.type(screen.getByLabelText(/메모/), '주말 산책');

    const file = new File([new Uint8Array([1, 2, 3])], 'walk.jpg', {
      type: 'image/jpeg'
    });
    const input = screen.getByLabelText(/사진 파일/) as HTMLInputElement;
    await user.upload(input, file);

    const submit = screen.getByRole('button', { name: /올리기/ });
    expect(submit).toBeEnabled();
    await user.click(submit);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/photos');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    const fd = init.body as FormData;
    expect(fd.get('uploadedBy')).toBe('엄마');
    expect(fd.get('memo')).toBe('주말 산책');
    expect(fd.get('photo')).toBeInstanceOf(File);

    await waitFor(() =>
      expect(screen.getByText(/사진을 잘 받았어요/)).toBeInTheDocument()
    );
    expect(onUploaded).toHaveBeenCalledTimes(1);
  });

  it('shows an error message when the server rejects the upload', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'unsupported mime type: text/plain' })
    });

    render(<UploadCard onUploaded={() => {}} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/올린 사람/), '아빠');
    const file = new File([new Uint8Array([1, 2, 3])], 'walk.jpg', {
      type: 'image/jpeg'
    });
    await user.upload(
      screen.getByLabelText(/사진 파일/) as HTMLInputElement,
      file
    );
    await user.click(screen.getByRole('button', { name: /올리기/ }));

    await waitFor(() =>
      expect(
        screen.getByText(/사진을 올리지 못했어요/)
      ).toBeInTheDocument()
    );
  });
});
