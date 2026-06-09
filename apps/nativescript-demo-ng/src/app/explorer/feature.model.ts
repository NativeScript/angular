/**
 * A single Angular 22 feature surfaced in the explorer.
 */
export interface NgFeature {
  /** Stable slug used in the route: /feature/:id */
  id: string;
  /** Short, punchy name */
  title: string;
  /** One-liner shown on the card */
  tagline: string;
  /** Grouping used by the category filter */
  category: FeatureCategory;
  /** Emoji used as the card glyph */
  icon: string;
  /** Accent color (hex) used for the stripe + glow */
  accent: string;
  /** A couple of sentences explaining the feature */
  description: string;
  /** Why a developer should care */
  why: string;
  /** A representative code snippet (rendered monospace) */
  code: string;
  /** Optional interactive playground rendered on the detail page */
  demo?: DemoKind;
  /** Pre-release the feature landed in (for the timeline badge) */
  since: string;
}

export type DemoKind = 'counter' | 'debounce' | 'nullable' | 'defer' | 'signal-forms' | 'service' | 'inject-async' | 'resource' | 'switch' | 'http';

export type FeatureCategory = 'Signals' | 'Components' | 'Templates' | 'Forms' | 'Performance' | 'Resources & HTTP' | 'Tooling & AI' | 'Router' | 'Testing';

export const CATEGORIES: FeatureCategory[] = ['Signals', 'Components', 'Templates', 'Forms', 'Performance', 'Resources & HTTP', 'Tooling & AI', 'Router', 'Testing'];
