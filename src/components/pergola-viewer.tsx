import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PERGOLA_MODELS, type PergolaConfig } from "@/lib/pergola";
import type { createPergolaScene } from "./pergola-scene";

export function PergolaViewer({
  config,
  annotationsVisible,
}: {
  config: PergolaConfig;
  annotationsVisible: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof createPergolaScene> | null>(null);
  const latest = useRef(config);
  const latestAnnotationsVisible = useRef(annotationsVisible);
  const updateFrame = useRef<number | null>(null);
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  const queueSceneUpdate = useCallback(() => {
    if (updateFrame.current !== null) return;
    updateFrame.current = window.requestAnimationFrame(() => {
      updateFrame.current = null;
      scene.current?.update(latest.current);
    });
  }, []);
  useLayoutEffect(() => {
    latest.current = config;
    queueSceneUpdate();
  }, [config, queueSceneUpdate]);
  useLayoutEffect(() => {
    latestAnnotationsVisible.current = annotationsVisible;
    scene.current?.setAnnotationsVisible(annotationsVisible);
  }, [annotationsVisible]);
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    import("./pergola-scene")
      .then(({ createPergolaScene }) => {
        if (cancelled || !host.current) return;
        scene.current = createPergolaScene(
          host.current,
          () => setStatus("error"),
          latestAnnotationsVisible.current,
        );
        queueSceneUpdate();
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      if (updateFrame.current !== null) {
        window.cancelAnimationFrame(updateFrame.current);
        updateFrame.current = null;
      }
      scene.current?.dispose();
      scene.current = null;
    };
  }, [attempt, queueSceneUpdate]);
  return (
    <div
      className="pergola-viewer"
      data-viewer-status={status}
      data-annotations-visible={annotationsVisible}
    >
      <div
        ref={host}
        className="pergola-canvas"
        role="region"
        tabIndex={0}
        aria-label={`Interaktivní 3D model: ${PERGOLA_MODELS[config.model].label}`}
        onKeyDown={(event) => {
          const keys = {
            ArrowLeft: "left",
            ArrowRight: "right",
            ArrowUp: "up",
            ArrowDown: "down",
            "+": "in",
            "-": "out",
            Home: "reset",
          } as const;
          const command = keys[event.key as keyof typeof keys];
          if (command) {
            event.preventDefault();
            scene.current?.command(command);
          }
        }}
      />
      {status !== "ready" && (
        <div className="pergola-viewer-message" role="status" data-status={status}>
          {status === "loading" ? (
            "Připravujeme vaši pergolu…"
          ) : (
            <>
              <p>3D náhled se nepodařilo spustit. Konfigurace a cena jsou stále dostupné.</p>
              <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
                Zkusit znovu
              </Button>
            </>
          )}
        </div>
      )}
      <div className="pergola-viewer-bottom">
        <div className="pergola-viewer-actions">
          <Button
            variant="outline"
            size="icon"
            aria-label="Oddálit model"
            disabled={status !== "ready"}
            onClick={() => scene.current?.command("out")}
          >
            <Minus />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Přiblížit model"
            disabled={status !== "ready"}
            onClick={() => scene.current?.command("in")}
          >
            <Plus />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Obnovit pohled"
            disabled={status !== "ready"}
            onClick={() => scene.current?.command("reset")}
          >
            <RotateCcw />
          </Button>
        </div>
      </div>
    </div>
  );
}
