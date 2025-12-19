import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';

@Component({
  selector: 'ns-split-view-supplementary',
  template: `
    <GridLayout rows="auto,*" class="h-full bg-slate-50 dark:bg-slate-950">
      <StackLayout row="0" class="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800">
        <Label text="Activity" class="text-xl font-semibold text-slate-900 dark:text-slate-100"></Label>
        <Label text="Supplementary" class="text-sm text-slate-500 dark:text-slate-400"></Label>
      </StackLayout>

      <ScrollView row="1">
        <StackLayout class="p-5">
          <StackLayout class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <Label text="Today" class="text-base font-semibold text-slate-900 dark:text-slate-100"></Label>

            <GridLayout columns="auto,*" class="mt-3" columnGap="10">
              <Label col="0" text="•" class="text-lg text-slate-500 dark:text-slate-400"></Label>
              <Label
                col="1"
                text="Opened the split view demo"
                class="text-sm text-slate-700 leading-[3] dark:text-slate-200"
                textWrap="true"
              ></Label>
            </GridLayout>
            <GridLayout columns="auto,*" class="mt-2" columnGap="10">
              <Label col="0" text="•" class="text-lg text-slate-500 dark:text-slate-400"></Label>
              <Label
                col="1"
                text="Routed pages into named outlets"
                class="text-sm text-slate-700 leading-[3] dark:text-slate-200"
                textWrap="true"
              ></Label>
            </GridLayout>
            <GridLayout columns="auto,*" class="mt-2" columnGap="10">
              <Label col="0" text="•" class="text-lg text-slate-500 dark:text-slate-400"></Label>
              <Label
                col="1"
                text="Verified controller mapping on iOS"
                class="text-sm text-slate-700 leading-[3] dark:text-slate-200"
                textWrap="true"
              ></Label>
            </GridLayout>
          </StackLayout>

          <StackLayout
            class="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4"
          >
            <Label text="Notes" class="text-base font-semibold text-slate-900 dark:text-slate-100"></Label>
            <Label
              text="Supplementary is great for context: recent items, related data, or quick shortcuts."
              class="mt-2 text-sm text-slate-700 dark:text-slate-200 leading-[3]"
              textWrap="true"
            ></Label>
          </StackLayout>
        </StackLayout>
      </ScrollView>
    </GridLayout>
  `,
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class SplitViewSupplementaryComponent {}
