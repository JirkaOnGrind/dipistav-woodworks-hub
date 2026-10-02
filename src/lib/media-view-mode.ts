import { useState } from "react";

export type MediaViewMode = "visualization" | "gallery";

const DEFAULT_MODE: MediaViewMode = "gallery";

export function useMediaViewMode(scopeKey: string) {
  const [selection, setSelection] = useState({ scopeKey, mode: DEFAULT_MODE });
  const mode = selection.scopeKey === scopeKey ? selection.mode : DEFAULT_MODE;

  const setMode = (nextMode: MediaViewMode) => {
    setSelection({ scopeKey, mode: nextMode });
  };

  return [mode, setMode] as const;
}
