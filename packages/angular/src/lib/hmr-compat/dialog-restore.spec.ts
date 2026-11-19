import type { NativeDialogConfig } from '../cdk/dialog/dialog-config';
import {
  createDialogParticipant,
  DialogParticipantDeps,
  DialogSnapshot,
  preservedDialogs,
  registerHmrComponentClass,
} from './dialog-restore';

class DetailsDialog {}
class OtherDialog {}

function config(overrides: Partial<NativeDialogConfig> = {}): NativeDialogConfig {
  return {
    renderIn: 'viewContainerRef',
    data: { id: 1 },
    nativeOptions: { fullscreen: true },
    preserveOnHmr: true,
    ...overrides,
  };
}

function deps(overrides: Partial<DialogParticipantDeps> = {}): DialogParticipantDeps & { open: jest.Mock } {
  return {
    openDialogs: () => [],
    open: jest.fn(),
    whenRootViewLoaded: () => Promise.resolve(true),
    dialogComponents: [],
    log: jest.fn(),
    ...overrides,
  } as DialogParticipantDeps & { open: jest.Mock };
}

describe('dialog restore', () => {
  it('keeps only component dialogs opened with preserveOnHmr, without app-bound references', () => {
    const preserved = preservedDialogs([
      {
        componentInstance: new DetailsDialog(),
        config: config({ viewContainerRef: {} as never, injector: {} as never }),
      },
      { componentInstance: new OtherDialog(), config: config({ preserveOnHmr: false }) },
      { componentInstance: undefined, config: config() },
      { componentInstance: new OtherDialog(), config: config({ renderIn: {} as never }) },
    ]);
    expect(preserved.map((d) => d.name)).toEqual(['DetailsDialog', 'OtherDialog']);
    expect(preserved[0].config).toEqual({
      renderIn: 'root',
      data: { id: 1 },
      nativeOptions: { fullscreen: true },
      preserveOnHmr: true,
    });
    expect(preserved[1].config.renderIn).toBe('root');
  });

  it('reopens each dialog without animation, preferring a listed class of the same name', async () => {
    const saved = createDialogParticipant(
      deps({ openDialogs: () => [{ componentInstance: new DetailsDialog(), config: config() }] }),
    ).save() as DialogSnapshot;

    const EditedDetailsDialog = class DetailsDialog {};
    const next = deps({ dialogComponents: [EditedDetailsDialog] });
    await createDialogParticipant(next).restore(saved);

    expect(next.open).toHaveBeenCalledWith(EditedDetailsDialog, {
      renderIn: 'root',
      data: { id: 1 },
      nativeOptions: { fullscreen: true, animated: false },
      preserveOnHmr: true,
    });
  });

  it('falls back to a registered class, then to the saved one', async () => {
    const snapshot: DialogSnapshot = {
      dialogs: [
        { component: OtherDialog, name: 'RegisteredDialog', config: config() },
        { component: DetailsDialog, name: 'DetailsDialog', config: config() },
      ],
    };
    const Registered = class RegisteredDialog {};
    registerHmrComponentClass('RegisteredDialog', Registered);
    const next = deps();
    await createDialogParticipant(next).restore(snapshot);
    expect(next.open.mock.calls.map((call) => call[0])).toEqual([Registered, DetailsDialog]);
  });

  it('logs and skips what it cannot reopen', async () => {
    const snapshot: DialogSnapshot = {
      dialogs: [
        { component: DetailsDialog, name: 'DetailsDialog', config: config() },
        { component: OtherDialog, name: 'OtherDialog', config: config() },
      ],
    };
    const failing = deps({
      open: jest.fn().mockImplementationOnce(() => {
        throw new Error('boom');
      }),
    });
    await createDialogParticipant(failing).restore(snapshot);
    expect(failing.open).toHaveBeenCalledTimes(2);
    expect(failing.log).toHaveBeenCalledTimes(1);

    const noRoot = deps({ whenRootViewLoaded: () => Promise.resolve(false) });
    await createDialogParticipant(noRoot).restore(snapshot);
    expect(noRoot.open).not.toHaveBeenCalled();

    const invalid = deps();
    await createDialogParticipant(invalid).restore({ dialogs: [{ name: 'x' }] });
    expect(invalid.log).toHaveBeenCalledTimes(1);
  });
});
