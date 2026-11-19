/** True inside a Vite dev session, where Vite gives this package a hot context. */
export function isViteDevSession(): boolean {
  // Must stay the literal `import.meta.hot`: Vite only injects the hot context for that form.
  return !!(import.meta as ImportMeta & { hot?: unknown }).hot;
}
