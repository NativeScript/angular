import { Injectable, signal } from '@angular/core';
import { SplitView } from '@nativescript/core';

@Injectable({
  providedIn: 'root',
})
export class SplitViewState {
  inspectorVisible = signal(true);

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
