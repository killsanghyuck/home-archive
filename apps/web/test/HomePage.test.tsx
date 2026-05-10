import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomePage } from '../src/pages/HomePage.js';
import type { LibraryHome } from '@home-archive/shared';

const sampleLibrary: LibraryHome = {
  householdName: '김씨네',
  recentPhotos: [
    {
      id: 'photo-1',
      takenAt: '2026-05-08T14:00:00Z',
      thumbnailPath: '/thumbs/1.jpg',
      caption: '주말 산책',
      people: ['엄마', '준이'],
      place: '동네 공원'
    }
  ],
  highlights: [
    {
      id: 'h1',
      generatedAt: '2026-05-09T09:00:00Z',
      title: '이번 주 가족 하이라이트',
      body: '준이가 자전거를 처음 탄 주말이었어요.',
      providerId: 'claude-default',
      providerKind: 'claude',
      scopeType: 'week',
      scopeId: '2026-W19',
      photoCount: 1
    }
  ],
  family: [
    { id: 'm1', name: '엄마', role: 'owner' },
    { id: 'm2', name: '준이', role: 'family' }
  ],
  providers: [
    {
      id: 'claude-default',
      kind: 'claude',
      label: 'Claude',
      model: 'claude-opus-4-7',
      status: 'connected'
    }
  ],
  timelineMonths: [
    {
      month: '2024-12',
      label: '2024년 12월',
      photoCount: 2,
      dayCount: 1,
      coverPhotos: [
        {
          id: 'photo-1',
          takenAt: '2024-12-31T12:34:56.000Z',
          thumbnailPath: '/thumbs/1.jpg',
          caption: '연말 가족 사진',
          people: [],
          place: '거실'
        }
      ],
      days: [
        {
          date: '2024-12-31',
          label: '12월 31일',
          title: '연말 가족 사진',
          photoCount: 2,
          place: '거실',
          coverPhotoIds: ['photo-1']
        }
      ]
    }
  ]
};

describe('HomePage', () => {
  it('shows the product name 우리집 기록관', () => {
    render(<HomePage library={sampleLibrary} />);
    expect(screen.getByRole('heading', { name: /우리집 기록관/ })).toBeInTheDocument();
  });

  it('communicates the local-first / 집 컴퓨터 설치형 message', () => {
    render(<HomePage library={sampleLibrary} />);
    expect(screen.getAllByText(/집 컴퓨터/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/로컬 우선/).length).toBeGreaterThan(0);
  });

  it('renders the four primary cards: 최근 사진, AI 요약, 가족 초대, AI 연결 설정', () => {
    render(<HomePage library={sampleLibrary} />);
    expect(screen.getByRole('region', { name: /최근 사진/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /AI 요약/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /가족 초대/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /AI 연결 설정/ })).toBeInTheDocument();
  });

  it('renders recent photo data inside the 최근 사진 card', () => {
    render(<HomePage library={sampleLibrary} />);
    const card = screen.getByRole('region', { name: /최근 사진/ });
    expect(within(card).getByText(/주말 산책/)).toBeInTheDocument();
  });

  it('renders recent photo thumbnails via API and links to the original photo', () => {
    render(<HomePage library={sampleLibrary} />);
    const card = screen.getByRole('region', { name: /최근 사진/ });
    const image = within(card).getByRole('img', { name: /주말 산책/ });
    expect(image).toHaveAttribute('src', '/api/photos/photo-1/thumbnail');
    expect(within(card).getByRole('link', { name: /주말 산책/ })).toHaveAttribute(
      'href',
      '/api/photos/photo-1/original'
    );
  });

  it('renders the AI highlight inside the AI 요약 card', () => {
    render(<HomePage library={sampleLibrary} />);
    const card = screen.getByRole('region', { name: /AI 요약/ });
    expect(within(card).getByText(/자전거를 처음 탄/)).toBeInTheDocument();
  });

  it('lets the user generate a mock monthly AI summary for the latest timeline month', async () => {
    const user = userEvent.setup();
    const onGenerateMonthlySummary = vi.fn().mockResolvedValue(undefined);

    render(
      <HomePage
        library={{ ...sampleLibrary, highlights: [] }}
        onGenerateMonthlySummary={onGenerateMonthlySummary}
      />
    );

    const card = screen.getByRole('region', { name: /AI 요약/ });
    await user.click(within(card).getByRole('button', { name: /2024년 12월 AI 요약 만들기/ }));

    expect(onGenerateMonthlySummary).toHaveBeenCalledWith('2024-12');
  });

  it('shows a friendly message when there is no month available for AI summary generation', () => {
    render(
      <HomePage
        library={{ ...sampleLibrary, highlights: [], timelineMonths: [] }}
      />
    );

    const card = screen.getByRole('region', { name: /AI 요약/ });
    expect(within(card).getByText(/사진을 올리면 월별 AI 요약을 만들 수 있어요/)).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: /AI 요약 만들기/ })).not.toBeInTheDocument();
  });

  it('lists family members inside the 가족 초대 card', () => {
    render(<HomePage library={sampleLibrary} />);
    const card = screen.getByRole('region', { name: /가족 초대/ });
    expect(within(card).getByText(/엄마/)).toBeInTheDocument();
    expect(within(card).getByText(/준이/)).toBeInTheDocument();
  });

  it('lists configured AI providers inside the AI 연결 설정 card', () => {
    render(<HomePage library={sampleLibrary} />);
    const card = screen.getByRole('region', { name: /AI 연결 설정/ });
    expect(within(card).getByText('claude-opus-4-7')).toBeInTheDocument();
    expect(within(card).getAllByText(/Claude/).length).toBeGreaterThan(0);
  });

  it('uses the design-system landing copy and warm family archive tone', () => {
    render(<HomePage library={sampleLibrary} />);
    expect(
      screen.getByText(/사진은 각자의 폰에 흩어져 있지만, 기억은 한 가족 공간에 평생 쌓입니다/)
    ).toBeInTheDocument();
    expect(screen.getByText(/AI가 시간, 사람, 장소별로 정리해줘요/)).toBeInTheDocument();
  });

  it('renders the actual family timeline from uploaded photo taken dates', () => {
    render(<HomePage library={sampleLibrary} />);
    const card = screen.getByRole('region', { name: /우리집 타임라인/ });
    expect(within(card).getByText(/언제 무슨 일이 있었는지/)).toBeInTheDocument();
    expect(within(card).getByText(/2024년 12월/)).toBeInTheDocument();
    expect(within(card).getByText(/12월 31일/)).toBeInTheDocument();
    expect(within(card).getByText(/연말 가족 사진/)).toBeInTheDocument();
    expect(within(card).getByText(/사진 2장/)).toBeInTheDocument();
  });

  it('renders AI collection cards with design-system tag labels', () => {
    render(<HomePage library={sampleLibrary} />);
    const card = screen.getByRole('region', { name: /AI가 정리한 묶음/ });
    expect(within(card).getByText(/엄마와 함께한 주말/)).toBeInTheDocument();
    expect(within(card).getByText(/시기/)).toBeInTheDocument();
    expect(within(card).getAllByText(/장소/).length).toBeGreaterThan(0);
  });
});
