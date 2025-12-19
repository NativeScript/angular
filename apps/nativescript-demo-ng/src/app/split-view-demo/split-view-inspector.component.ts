import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';

@Component({
  selector: 'ns-split-view-inspector',
  template: `
    <ActionBar title="Inspector" flat="true"></ActionBar>
    <GridLayout rows="*" class="h-full bg-slate-50 dark:bg-slate-950">
      <ScrollView>
        <StackLayout class="p-5">
          <StackLayout class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <GridLayout rows="auto" columns="*,auto" class="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <Label col="0" text="Pinned" class="text-sm text-slate-700 dark:text-slate-200"></Label>
              <Switch col="1" checked="true"></Switch>
            </GridLayout>
            <GridLayout rows="auto" columns="*,auto" class="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <Label col="0" text="Show badges" class="text-sm text-slate-700 dark:text-slate-200"></Label>
              <Switch col="1" checked="false"></Switch>
            </GridLayout>
            <GridLayout rows="auto" columns="*,auto" class="px-4 py-3">
              <Label col="0" text="Compact" class="text-sm text-slate-700 dark:text-slate-200"></Label>
              <Switch col="1" checked="true"></Switch>
            </GridLayout>
          </StackLayout>

          <StackLayout
            class="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4"
          >
            <Label text="Opacity" class="text-base font-semibold text-slate-900 dark:text-slate-100"></Label>
            <Label
              text="Use the inspector for controls and metadata."
              class="mt-2 text-sm text-slate-700 dark:text-slate-200 leading-[3]"
              textWrap="true"
            ></Label>
            <Slider class="mt-3" minValue="0" maxValue="100" value="85"></Slider>
          </StackLayout>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  `,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class SplitViewInspectorComponent {}
