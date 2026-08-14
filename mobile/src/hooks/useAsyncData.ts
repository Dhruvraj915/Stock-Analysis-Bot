import { useCallback, useEffect, useState } from 'react';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

/** Fetch-on-mount with pull-to-refresh support — the only data-fetching
 * pattern this app needs (a couple of static JSON/CSV files, no caching
 * library required at this scale). */
export function useAsyncData<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const run = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      else setState({ status: 'loading' });
      try {
        const data = await loader();
        setState({ status: 'ready', data });
      } catch (err) {
        setState({ status: 'error', message: (err as Error).message });
      } finally {
        if (isRefresh) setRefreshing(false);
      }
    },
    [loader],
  );

  useEffect(() => {
    run(false);
  }, [run]);

  return { state, refreshing, refresh: () => run(true) };
}
