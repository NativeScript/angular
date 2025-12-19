import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';

@Component({
  selector: 'ns-split-view-primary',
  template: `
    <ActionBar title="Primary" flat="true"></ActionBar>
    <GridLayout rows="auto,*" class="h-full bg-slate-50 dark:bg-slate-950">
      <StackLayout row="0" class="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-slate-800">
        <Label text="Split View" class="text-xl font-semibold text-slate-900 dark:text-slate-100"></Label>
        <Label text="Primary" class="text-sm text-slate-500 dark:text-slate-400"></Label>
      </StackLayout>

      <ScrollView row="1">
        <StackLayout class="p-5">
          <GridLayout columns="*,auto" class="mb-4">
            <Label col="0" text="Navigation" class="text-base font-semibold text-slate-900 dark:text-slate-100"></Label>
            <Label col="1" text="4 items" class="text-xs text-slate-500 dark:text-slate-400"></Label>
          </GridLayout>

          <StackLayout class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <GridLayout rows="auto" columns="auto,*" class="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <Label col="0" text="•" class="text-lg text-slate-500 dark:text-slate-400"></Label>
              <Label col="1" text="Overview" class="text-base text-slate-900 dark:text-slate-100"></Label>
            </GridLayout>
            <GridLayout rows="auto" columns="auto,*" class="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <Label col="0" text="•" class="text-lg text-slate-500 dark:text-slate-400"></Label>
              <Label col="1" text="Accounts" class="text-base text-slate-900 dark:text-slate-100"></Label>
            </GridLayout>
            <GridLayout rows="auto" columns="auto,*" class="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <Label col="0" text="•" class="text-lg text-slate-500 dark:text-slate-400"></Label>
              <Label col="1" text="Reports" class="text-base text-slate-900 dark:text-slate-100"></Label>
            </GridLayout>
            <GridLayout rows="auto" columns="auto,*" class="px-4 py-3">
              <Label col="0" text="•" class="text-lg text-slate-500 dark:text-slate-400"></Label>
              <Label col="1" text="Settings" class="text-base text-slate-900 dark:text-slate-100"></Label>
            </GridLayout>
          </StackLayout>

          <StackLayout
            class="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
          >
            <Label text="Tip" class="text-xs font-semibold text-slate-500 dark:text-slate-400"></Label>
            <Label
              text="On iPad, keep Primary lightweight. Use Secondary for details and Inspector for properties."
              class="mt-1 text-sm text-slate-700 dark:text-slate-200 leading-[3]"
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
export class SplitViewPrimaryComponent {}
