import { computed, Injectable, signal } from '@angular/core';
import { CATEGORIES, FeatureCategory, NgFeature } from './feature.model';
import { FEATURES } from './features.data';

/**
 * Signal-backed store for the Angular 22 feature catalog.
 * Search + category filtering are derived with `computed`,
 * dogfooding the very reactivity model this app showcases.
 */
@Injectable({ providedIn: 'root' })
export class FeaturesService {
  /** All curated features */
  readonly all = signal<NgFeature[]>(FEATURES);

  /** Free-text query (matched against title + tagline) */
  readonly query = signal('');

  /** `null` means "All categories" */
  readonly activeCategory = signal<FeatureCategory | null>(null);

  /** Chips rendered above the list */
  readonly categories = CATEGORIES;

  /** The filtered list shown in the explorer */
  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const cat = this.activeCategory();
    return this.all().filter((f) => {
      const matchesCat = !cat || f.category === cat;
      const matchesQuery = !q || f.title.toLowerCase().includes(q) || f.tagline.toLowerCase().includes(q) || f.category.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  });

  readonly totalCount = computed(() => this.all().length);
  readonly resultCount = computed(() => this.filtered().length);

  byId(id: string): NgFeature | undefined {
    return this.all().find((f) => f.id === id);
  }

  setCategory(cat: FeatureCategory | null) {
    this.activeCategory.set(this.activeCategory() === cat ? null : cat);
  }

  clear() {
    this.query.set('');
    this.activeCategory.set(null);
  }
}

// re-export for convenience
export type { NgFeature, FeatureCategory };
