import { Injectable } from '@angular/core';

/**
 * Lives in its own module so the dynamic `import()` used by `injectAsync()`
 * code-splits it into a separate lazy chunk. It is only ever pulled in when
 * the inject-async demo actually requests it.
 */
@Injectable({ providedIn: 'root' })
export class LazyGreeter {
  private readonly loadedAt = new Date().toLocaleTimeString();

  greet(name: string): string {
    return `👋 Hello from ${name}! This greeter was lazily injected at ${this.loadedAt}.`;
  }
}
