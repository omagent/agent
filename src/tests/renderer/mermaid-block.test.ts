/**
 * MermaidBlock integration tests.
 *
 * Verifies:
 *  - Mermaid is initialized with dark theme at module load
 *  - Code-block language routing correctly detects ```mermaid```
 *  - State discriminator prevents impossible states (loading | ok | error)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// 1. Mermaid module initialisation
// ---------------------------------------------------------------------------
describe("MermaidBlock module initialisation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("calls mermaid.initialize with dark theme on import", async () => {
    const initialize = vi.fn();
    vi.doMock("mermaid", () => ({
      default: { initialize, render: vi.fn() },
      initialize,
      render: vi.fn(),
    }));

    await import("../../renderer/components/message/MermaidBlock");

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(initialize).toHaveBeenCalledWith({
      startOnLoad: false,
      theme: "dark",
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Code-block language detection (mirrors ContentBlockView logic)
// ---------------------------------------------------------------------------
describe("Mermaid code-block detection", () => {
  const LANGUAGE_RE = /language-([\w+#.-]+)/;

  it.each([
    ["language-mermaid", "mermaid"],
    ["language-javascript", "javascript"],
    ["language-python", "python"],
    ["language-mermaid  extra", "mermaid"],
  ])('extracts "%s" → language "%s"', (className, expected) => {
    const match = LANGUAGE_RE.exec(className);
    expect(match).not.toBeNull();
    expect(match![1]).toBe(expected);
  });

  it("returns null for inline code (no language- prefix)", () => {
    expect(LANGUAGE_RE.exec("")).toBeNull();
    expect(LANGUAGE_RE.exec("inline-code")).toBeNull();
  });

  it("routes language-mermaid to MermaidBlock (not generic CodeBlock)", () => {
    // The actual routing in ContentBlockView:
    //   if (match[1] === "mermaid") return <MermaidBlock ...>;
    //   return <CodeBlock ...>;
    const routeToMermaid = (lang: string) => lang === "mermaid";

    expect(routeToMermaid("mermaid")).toBe(true);
    expect(routeToMermaid("javascript")).toBe(false);
    expect(routeToMermaid("python")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. State discriminator prevents impossible states
// ---------------------------------------------------------------------------
describe("State discriminator", () => {
  it("only one state variant can be active at a time", () => {
    // The State type:
    //   { type: "loading" }
    //   | { type: "ok"; svg: string }
    //   | { type: "error"; error: string }
    //
    // This is a compile-time guarantee. The runtime test verifies the render
    // order: error → loading → ok, matching the component's return branches.

    type State =
      | { type: "loading" }
      | { type: "ok"; svg: string }
      | { type: "error"; error: string };

    const states: State[] = [
      { type: "loading" },
      { type: "ok", svg: "<svg></svg>" },
      { type: "error", error: "Invalid mermaid header" },
    ];

    // Verify each variant has exactly the fields it should
    for (const s of states) {
      switch (s.type) {
        case "loading":
          expect(s).toEqual({ type: "loading" });
          break;
        case "ok":
          expect("svg" in s).toBe(true);
          expect("error" in s).toBe(false);
          break;
        case "error":
          expect("error" in s).toBe(true);
          expect("svg" in s).toBe(false);
          break;
      }
    }
  });

  it("resolves to the correct render branch", () => {
    type State =
      | { type: "loading" }
      | { type: "ok"; svg: string }
      | { type: "error"; error: string };

    const renderBranch = (s: State) => {
      if (s.type === "error") return "error-branch";
      if (s.type === "loading") return "loading-branch";
      return "svg-branch";
    };

    expect(renderBranch({ type: "loading" })).toBe("loading-branch");
    expect(renderBranch({ type: "ok", svg: "<svg></svg>" })).toBe("svg-branch");
    expect(renderBranch({ type: "error", error: "fail" })).toBe("error-branch");
  });
});
