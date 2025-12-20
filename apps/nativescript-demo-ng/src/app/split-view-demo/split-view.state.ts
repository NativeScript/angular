import { Injectable, signal } from '@angular/core';
import { SplitView } from '@nativescript/core';

@Injectable({
  providedIn: 'root',
})
export class SplitViewState {
  inspectorVisible = signal(true);
  
  // Santa's List Counts
  niceCount = signal(7);
  naughtyCount = signal(3);
  
  // Delivery Tracker
  deliveredCount = signal(12);

  onInspectorChange(event: any) {
    console.log(`[SplitViewState] Inspector visibility changed: ${event.data.showing}`);
    if (!event.data.showing) {
      this.inspectorVisible.set(event.data.showing);
    }
  }

  setInspectorVisible(visible: boolean) {
    this.inspectorVisible.set(visible);
    SplitView.getInstance().showInspector();
  }
}
