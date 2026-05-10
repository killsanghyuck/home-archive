import { useCallback, useEffect, useState } from 'react';
import type { LibraryHome } from '@home-archive/shared';
import { HomePage } from './pages/HomePage.js';
import { fallbackLibrary } from './data/fallbackLibrary.js';

export function App(): JSX.Element {
  const [library, setLibrary] = useState<LibraryHome>(fallbackLibrary);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetch('/api/library')
      .then(async (res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return (await res.json()) as LibraryHome;
      })
      .then((data) => {
        setLibrary(data);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'unknown error');
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const generateMonthlySummary = useCallback(
    async (month: string) => {
      const res = await fetch('/api/ai/monthly-summary', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ month })
      });
      if (!res.ok) {
        throw new Error(`summary status ${res.status}`);
      }
      refresh();
    },
    [refresh]
  );

  return (
    <HomePage
      library={library}
      loadError={loadError}
      onUploaded={() => refresh()}
      onGenerateMonthlySummary={generateMonthlySummary}
    />
  );
}
