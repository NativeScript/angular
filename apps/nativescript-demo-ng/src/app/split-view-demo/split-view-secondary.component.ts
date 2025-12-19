import { Component, inject, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { SplitViewState } from './split-view.state';

@Component({
  selector: 'ns-split-view-secondary',
  template: `
    <GridLayout rows="*" class="h-full bg-white dark:bg-slate-950">
      <ScrollView>
        <StackLayout class="p-5">
          <GridLayout columns="*,*" class="mb-4" columnGap="12">
            <StackLayout
              col="0"
              class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 mr-1"
            >
              <Label text="Active" class="text-xs font-semibold  text-slate-500 dark:text-slate-400"></Label>
              <Label text="12" class="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-100"></Label>
              <Label text="items" class="text-xs text-slate-500 dark:text-slate-400"></Label>
            </StackLayout>
            <StackLayout
              col="1"
              class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 ml-1"
            >
              <Label text="Updated" class="text-xs font-semibold  text-slate-500 dark:text-slate-400"></Label>
              <Label text="2m" class="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-100"></Label>
              <Label text="ago" class="text-xs text-slate-500 dark:text-slate-400"></Label>
            </StackLayout>
          </GridLayout>

          <StackLayout class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <Label text="Summary" class="text-base font-semibold text-slate-900 dark:text-slate-100"></Label>
            <Label
              text="This column is ideal for the main content. Put your routed page content here."
              class="mt-2 text-sm text-slate-700 dark:text-slate-200 leading-[3]"
              textWrap="true"
            ></Label>

            <GridLayout rows="auto,auto,auto" columns="*,auto" class="mt-4" rowGap="10">
              <Label row="0" col="0" text="Status" class="text-sm text-slate-500 dark:text-slate-400"></Label>
              <Label
                row="0"
                col="1"
                text="Ready"
                class="text-sm font-semibold text-slate-900 dark:text-slate-100"
              ></Label>

              <Label row="1" col="0" text="Owner" class="text-sm text-slate-500 dark:text-slate-400"></Label>
              <Label
                row="1"
                col="1"
                text="Demo"
                class="text-sm font-semibold text-slate-900 dark:text-slate-100"
              ></Label>

              <Label row="2" col="0" text="Mode" class="text-sm text-slate-500 dark:text-slate-400"></Label>
              <Label
                row="2"
                col="1"
                text="Two-beside"
                class="text-sm font-semibold text-slate-900 dark:text-slate-100"
              ></Label>
            </GridLayout>
          </StackLayout>

          <StackLayout
            class="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4"
          >
            <Label text="Next" class="text-xs font-semibold text-slate-500 dark:text-slate-400"></Label>
            <Label
              text="Add your real detail view here (lists, charts, forms)."
              class="mt-1 text-sm text-slate-700 dark:text-slate-200"
              textWrap="true"
            ></Label>
          </StackLayout>

          @if (!splitViewState.inspectorVisible()) {
            <StackLayout
              class="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4"
              (tap)="splitViewState.setInspectorVisible(true)"
            >
              <Label text="Open Inspector" class="text-xs font-semibold text-slate-500 dark:text-slate-400"></Label>
              <Label
                text="You can open the Inspector to adjust properties."
                class="mt-1 text-sm text-slate-700 dark:text-slate-200"
                textWrap="true"
              ></Label>
            </StackLayout>
          }
        </StackLayout>
      </ScrollView>
    </GridLayout>
  `,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class SplitViewSecondaryComponent {
  splitViewState = inject(SplitViewState);
}
