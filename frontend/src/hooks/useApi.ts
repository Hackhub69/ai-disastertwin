import { useState, useEffect, useCallback } from 'react';

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function usePolling<T>(fetcher: () => Promise<T>, intervalMs: number = 15000, deps: any[] = []) {
  const result = useApi<T>(fetcher, deps);

  useEffect(() => {
    const interval = setInterval(result.refetch, intervalMs);
    return () => clearInterval(interval);
  }, [result.refetch, intervalMs]);

  return result;
}
