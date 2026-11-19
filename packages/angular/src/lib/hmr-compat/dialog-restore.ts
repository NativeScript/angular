// Runtime-import free so it can be unit tested without Angular or NativeScript.
import type { Type } from '@angular/core';
import type { NativeDialogConfig } from '../cdk/dialog/dialog-config';
import type { HmrLog } from '../hmr-snapshots';
import type { NativeScriptHmrParticipant } from '../tokens';

export const DIALOG_PARTICIPANT_KEY = '@nativescript/angular/dialogs';
export const DIALOG_PARTICIPANT_VERSION = 1;

export interface PreservedDialog {
  component: Type<unknown>;
  /** Class name, matched against the next app's dialog components to pick up an edited class. */
  name: string;
  config: NativeDialogConfig;
}

export interface DialogSnapshot {
  dialogs: PreservedDialog[];
}

export interface OpenDialogLike {
  componentInstance?: unknown;
  config?: NativeDialogConfig;
}

// This package is never re-evaluated in a dev session, so module scope outlives every HMR reboot.
const registeredComponents = new Map<string, Type<unknown>>();

/** @internal Fed by the deprecated `__NS_HMR_REGISTER_COMPONENT__` global. */
export function registerHmrComponentClass(name: unknown, component: unknown): void {
  if (typeof name === 'string' && name && typeof component === 'function') {
    registeredComponents.set(name, component as Type<unknown>);
  }
}

/** @internal */
export function registeredHmrComponentClasses(): ReadonlyMap<string, Type<unknown>> {
  return registeredComponents;
}

/** Component dialogs opened with `preserveOnHmr`, without the references that die with the app. */
export function preservedDialogs(open: readonly OpenDialogLike[]): PreservedDialog[] {
  const preserved: PreservedDialog[] = [];
  for (const ref of open) {
    const config = ref.config;
    const instance = ref.componentInstance;
    // A TemplateRef dialog has no component instance.
    if (!config?.preserveOnHmr || !instance || typeof instance !== 'object') {
      continue;
    }
    const component = (instance as object).constructor as Type<unknown>;
    if (typeof component !== 'function' || component === Object) {
      continue;
    }
    // The view container, injector and host view die with the app; the new app has only its root view.
    const { viewContainerRef: _viewContainerRef, injector: _injector, ...rest } = config;
    preserved.push({ component, name: component.name, config: { ...rest, renderIn: 'root' } });
  }
  return preserved;
}

export function isDialogSnapshot(value: unknown): value is DialogSnapshot {
  const snapshot = value as DialogSnapshot | null;
  return (
    !!snapshot &&
    typeof snapshot === 'object' &&
    Array.isArray(snapshot.dialogs) &&
    snapshot.dialogs.every((d) => !!d && typeof d.component === 'function' && typeof d.name === 'string' && !!d.config)
  );
}

export interface DialogParticipantDeps {
  openDialogs(): readonly OpenDialogLike[];
  open(component: Type<unknown>, config: NativeDialogConfig): void;
  /** Resolves true once the new app's root view is loaded, false when it never loads. */
  whenRootViewLoaded(): Promise<boolean>;
  /** Dialog components the next app lists, matched by class name. */
  dialogComponents: readonly Type<unknown>[];
  log: HmrLog;
}

/** The newest class for a preserved dialog: one the app lists, then one registered, then the saved one. */
export function resolveDialogComponent(dialog: PreservedDialog, listed: readonly Type<unknown>[]): Type<unknown> {
  return listed.find((c) => c.name === dialog.name) ?? registeredComponents.get(dialog.name) ?? dialog.component;
}

/** Reopens, in the new app, the component dialogs that were open with `preserveOnHmr`. */
export function createDialogParticipant(deps: DialogParticipantDeps): NativeScriptHmrParticipant {
  return {
    key: DIALOG_PARTICIPANT_KEY,
    version: DIALOG_PARTICIPANT_VERSION,
    save: (): DialogSnapshot => ({ dialogs: preservedDialogs(deps.openDialogs()) }),
    async restore(snapshot: unknown): Promise<void> {
      if (!isDialogSnapshot(snapshot)) {
        deps.log('Ignoring an invalid dialog snapshot.');
        return;
      }
      if (!snapshot.dialogs.length) {
        return;
      }
      if (!(await deps.whenRootViewLoaded())) {
        deps.log('The root view never loaded after an HMR reboot; dialogs were not reopened.');
        return;
      }
      for (const dialog of snapshot.dialogs) {
        try {
          deps.open(resolveDialogComponent(dialog, deps.dialogComponents), {
            ...dialog.config,
            nativeOptions: { ...dialog.config.nativeOptions, animated: false },
          });
        } catch (error) {
          deps.log(`Could not reopen the dialog ${dialog.name} after an HMR reboot.`, error);
        }
      }
    },
  };
}
