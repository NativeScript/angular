import { Component, inject, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { SplitViewState } from './split-view.state';
import { EventData, Slider } from '@nativescript/core';

@Component({
  selector: 'ns-split-view-inspector',
  templateUrl: './split-view-inspector.component.html',
  styleUrls: ['./split-view-inspector.component.css'],
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class SplitViewInspectorComponent {
  splitViewState = inject(SplitViewState);

  jingleBells = signal(true);
  snowEffects = signal(true);
  christmasMusic = signal(false);
  twinkleLights = signal(true);
  magicLevel = signal(62);

  onJingleBellsChange(event: any) {
    this.jingleBells.set(event.value);
  }

  onSnowEffectsChange(event: any) {
    this.snowEffects.set(event.value);
  }

  onChristmasMusicChange(event: any) {
    this.christmasMusic.set(event.value);
  }

  onTwinkleLightsChange(event: any) {
    this.twinkleLights.set(event.value);
  }

  onMagicLevelChange(event: any) {
    this.magicLevel.set(Math.round(event.value));
  }

  loadedSlider(args: EventData) {
    const slider = args.object as Slider;

    if (slider.ios) {
      const ui = slider.ios as UISlider;
      ui.minimumTrackTintColor = UIColor.redColor; // filled
      ui.maximumTrackTintColor = UIColor.lightGrayColor; // unfilled
    }
  }
}
