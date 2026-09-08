import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";

type ProfileCommit = {
  id: string;
  phase: "mount" | "update" | "nested-update";
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
};

declare global {
  interface Window {
    __reactProfileCommits?: ProfileCommit[];
  }
}

const recordCommit: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
) => {
  const commits = (window.__reactProfileCommits ??= []);
  commits.push({ id, phase, actualDuration, baseDuration, startTime, commitTime });
  if (commits.length > 500) commits.splice(0, commits.length - 500);
};

export function PerformanceProfiler({ id, children }: { id: string; children: ReactNode }) {
  const enabled =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("react-profile");

  if (!enabled) return children;
  return (
    <Profiler id={id} onRender={recordCommit}>
      {children}
    </Profiler>
  );
}
