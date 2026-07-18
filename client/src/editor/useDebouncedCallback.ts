import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a stable debounced wrapper around `fn`. Rapid calls collapse into a
 * single invocation `delay` ms after the last one. Used for autosave so text
 * edits persist without a save button and without a request per keystroke.
 */
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay: number,
): (...args: A) => void {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return useCallback(
    (...args: A) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fnRef.current(...args), delay);
    },
    [delay],
  );
}
