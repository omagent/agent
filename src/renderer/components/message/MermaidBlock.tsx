import { useEffect, useState, memo } from "react";
import mermaid from "mermaid";

// ponytail: one-time init with dark theme, no light mode until needed
mermaid.initialize({ startOnLoad: false, theme: "dark" });

type State =
  | { type: "loading" }
  | { type: "ok"; svg: string }
  | { type: "error"; error: string };

export const MermaidBlock = memo(function MermaidBlock({
  code,
}: {
  code: string;
}) {
  const [state, setState] = useState<State>({ type: "loading" });

  useEffect(() => {
    let cancelled = false;
    const id = `m-${Math.random().toString(36).slice(2, 8)}`;

    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (!cancelled) setState({ type: "ok", svg });
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setState({
            type: "error",
            error: e instanceof Error ? e.message : "Render failed",
          });
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (state.type === "error") {
    return <div className="text-red-400 text-xs mt-2">Mermaid: {state.error}</div>;
  }

  if (state.type === "loading") {
    return <div className="my-2 h-16 animate-pulse rounded bg-surface-muted/30" />;
  }

  return (
    <div
      className="my-2 flex justify-center"
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  );
});
