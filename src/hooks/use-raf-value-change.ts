import { startTransition, useCallback, useEffect, useRef } from "react";

export function useRafValueChange(
  onChange: (value: number) => void,
  { transition = true }: { transition?: boolean } = {},
) {
  const onChangeRef = useRef(onChange);
  const pendingValueRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const publish = useCallback(
    (value: number) => {
      if (transition) startTransition(() => onChangeRef.current(value));
      else onChangeRef.current(value);
    },
    [transition],
  );

  const flush = useCallback(
    (value?: number) => {
      if (value !== undefined) pendingValueRef.current = value;
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (pendingValueRef.current === null) return;
      const nextValue = pendingValueRef.current;
      pendingValueRef.current = null;
      publish(nextValue);
    },
    [publish],
  );

  const schedule = useCallback(
    (value: number) => {
      pendingValueRef.current = value;
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        if (pendingValueRef.current === null) return;
        const nextValue = pendingValueRef.current;
        pendingValueRef.current = null;
        publish(nextValue);
      });
    },
    [publish],
  );

  return { schedule, flush };
}
