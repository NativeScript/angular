import { IMAGE_CONFIG } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { NativeScriptModule } from '@nativescript/angular';

describe('IMAGE_CONFIG', () => {
  beforeEach(() => {
    return TestBed.configureTestingModule({
      imports: [NativeScriptModule],
    }).compileComponents();
  });

  // Both flags are required: with either one unset, Angular reaches for `document` during
  // bootstrap on any runtime that exposes a global PerformanceObserver.
  it('disables both dev-mode image warnings', () => {
    const config = TestBed.inject(IMAGE_CONFIG);

    expect(config.disableImageSizeWarning).toBe(true);
    expect(config.disableImageLazyLoadWarning).toBe(true);
  });
});
