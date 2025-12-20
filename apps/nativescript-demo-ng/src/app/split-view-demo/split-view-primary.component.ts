import { Component, Directive, ElementRef, inject, Input, NO_ERRORS_SCHEMA, OnDestroy, OnInit, signal } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { Label, StackLayout } from '@nativescript/core';
import { SplitViewState } from './split-view.state';

@Directive({
  selector: '[numericText]',
  standalone: true,
})
export class NumericTextDirective implements OnDestroy {
  private container: StackLayout;
  private characterLabels: Label[] = [];
  private previousValue = '';
  private currentValue = '';
  private busyChars = new Set<number>();
  private loadedHandler: () => void;

  @Input() set numericText(value: string) {
    this.currentValue = value;
    this.updateCharacters(value);
  }

  @Input() numericTextDuration = 160;
  @Input() numericTextCountsDown = true;

  constructor(elementRef: ElementRef) {
    this.container = elementRef.nativeElement;
    // Set up the container as a horizontal stack
    this.container.orientation = 'horizontal';

    // Listen for when the container becomes visible again (e.g., after column is reopened)
    this.loadedHandler = () => this.resetLabelsVisibility();
    this.container.on('loaded', this.loadedHandler);
  }

  ngOnDestroy() {
    this.busyChars.clear();
    this.characterLabels = [];
    this.container.off('loaded', this.loadedHandler);
  }

  private resetLabelsVisibility() {
    // Reset all labels to visible state in case animations were interrupted
    for (const label of this.characterLabels) {
      label.opacity = 1;
      label.translateX = 0;
      label.translateY = 0;
    }
    // Re-sync the text in case it changed while hidden
    if (this.currentValue) {
      for (let i = 0; i < this.characterLabels.length; i++) {
        if (this.currentValue[i]) {
          this.characterLabels[i].text = this.currentValue[i];
        }
      }
      this.previousValue = this.currentValue;
    }
  }

  private updateCharacters(newValue: string) {
    const oldValue = this.previousValue;

    // Ensure we have enough labels
    while (this.characterLabels.length < newValue.length) {
      const label = new Label();
      // Copy styles from container to each character label
      label.className = this.container.className;
      this.container.addChild(label);
      this.characterLabels.push(label);
    }

    // Remove extra labels if new value is shorter
    while (this.characterLabels.length > newValue.length) {
      const label = this.characterLabels.pop();
      if (label) {
        this.container.removeChild(label);
      }
    }

    // Update each character
    for (let i = 0; i < newValue.length; i++) {
      const oldChar = oldValue[i] || '';
      const newChar = newValue[i];
      const label = this.characterLabels[i];

      if (oldChar !== newChar && oldValue.length > 0) {
        // Character changed - animate it
        this.animateCharacter(label, oldChar, newChar, i);
      } else if (oldValue.length === 0) {
        // First render - just set text
        label.text = newChar;
      }
    }

    this.previousValue = newValue;
  }

  private async animateCharacter(label: Label, oldChar: string, newChar: string, index: number) {
    if (this.busyChars.has(index)) {
      // If mid-animation, snap to newest value
      label.text = newChar;
      return;
    }
    this.busyChars.add(index);

    const duration = this.numericTextDuration;
    const curve = 'easeInOut' as const;

    // Determine direction
    let direction: 'up' | 'down' = 'down';
    if (!this.numericTextCountsDown) {
      const a = Number(oldChar);
      const b = Number(newChar);
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        direction = b > a ? 'up' : 'down';
      }
    }

    // Slide distance based on font size
    const fontSize = (label.style?.fontSize as number) || 14;
    const dy = Math.round(fontSize * 0.8);

    try {
      // Slide/fade out
      await label.animate({
        translate: { x: 0, y: direction === 'down' ? dy : -dy },
        opacity: 0,
        duration,
        curve,
      });
    } catch {
      // Animation cancelled
    }

    // Swap text
    label.text = newChar;

    // Reset position off-screen opposite direction
    label.opacity = 0;
    label.translateY = direction === 'down' ? -dy : dy;

    try {
      // Slide/fade in
      await label.animate({
        translate: { x: 0, y: 0 },
        opacity: 1,
        duration,
        curve,
      });
    } catch {
      // Animation cancelled
    }

    this.busyChars.delete(index);
  }
}

@Component({
  selector: 'ns-split-view-primary',
  templateUrl: './split-view-primary.component.html',
  styleUrls: ['./split-view-primary.component.css'],
  imports: [NativeScriptCommonModule, NumericTextDirective],
  schemas: [NO_ERRORS_SCHEMA],
})
export class SplitViewPrimaryComponent implements OnInit, OnDestroy {
  splitViewState = inject(SplitViewState);
  selectedMenu = signal('dashboard');
  countdown = signal('00:00:00:00');

  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private readonly bootTime = new Date();

  ngOnInit() {
    this.updateCountdown();
    this.countdownInterval = setInterval(() => this.updateCountdown(), 1000);
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private updateCountdown() {
    const now = new Date();
    const currentYear = now.getFullYear();
    // Target Christmas Day of the current year, or next year if Christmas has passed
    let christmas = new Date(currentYear, 11, 25, 0, 0, 0, 0);
    if (now > christmas) {
      christmas = new Date(currentYear + 1, 11, 25, 0, 0, 0, 0);
    }

    const diff = christmas.getTime() - now.getTime();

    if (diff <= 0) {
      this.countdown.set('🎄 Merry Christmas! 🎄');
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n: number) => n.toString().padStart(2, '0');
    this.countdown.set(`${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
  }

  selectMenu(menu: string) {
    this.selectedMenu.set(menu);
  }
}
