import { isAngularDevMode, isAngularHmrEnabled, isNativeScriptViteHmrActive, isWebpackHmrActive } from './hmr-environment';

interface MutableGlobal {
  ngDevMode?: boolean;
  __NS_DEV_PLACEHOLDER_ROOT_EARLY__?: unknown;
  __NS_HMR_BOOT_COMPLETE__?: unknown;
  __webpack_require__?: unknown;
}

describe('hmr-environment', () => {
  const g = globalThis as unknown as MutableGlobal;

  // We snapshot/restore globals so each spec runs in isolation. The test
  // runner does not control whether `ngDevMode` is defined, so we record
  // its descriptor before mutating.
  let originalNgDevModeDefined = false;
  let originalNgDevModeValue: boolean | undefined;
  let originalPlaceholderFlag: unknown;
  let originalBootCompleteFlag: unknown;
  let originalWebpackRequire: unknown;

  beforeEach(() => {
    originalNgDevModeDefined = Object.prototype.hasOwnProperty.call(g, 'ngDevMode');
    originalNgDevModeValue = g.ngDevMode;
    originalPlaceholderFlag = g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__;
    originalBootCompleteFlag = g.__NS_HMR_BOOT_COMPLETE__;
    originalWebpackRequire = g.__webpack_require__;
  });

  afterEach(() => {
    if (originalNgDevModeDefined) {
      g.ngDevMode = originalNgDevModeValue;
    } else {
      delete g.ngDevMode;
    }
    if (originalPlaceholderFlag === undefined) {
      delete g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__;
    } else {
      g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__ = originalPlaceholderFlag;
    }
    if (originalBootCompleteFlag === undefined) {
      delete g.__NS_HMR_BOOT_COMPLETE__;
    } else {
      g.__NS_HMR_BOOT_COMPLETE__ = originalBootCompleteFlag;
    }
    if (originalWebpackRequire === undefined) {
      delete g.__webpack_require__;
    } else {
      g.__webpack_require__ = originalWebpackRequire;
    }
  });

  describe('isAngularDevMode', () => {
    it('treats undefined ngDevMode as dev (Angular convention)', () => {
      delete g.ngDevMode;
      expect(isAngularDevMode()).toBe(true);
    });

    it('returns false when Angular built in production mode', () => {
      g.ngDevMode = false;
      expect(isAngularDevMode()).toBe(false);
    });

    it('returns true when ngDevMode is explicitly truthy', () => {
      g.ngDevMode = true;
      expect(isAngularDevMode()).toBe(true);
    });
  });

  describe('isNativeScriptViteHmrActive', () => {
    it('returns false when neither NS Vite dev flag is set', () => {
      delete g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__;
      delete g.__NS_HMR_BOOT_COMPLETE__;

      expect(isNativeScriptViteHmrActive()).toBe(false);
    });

    it('returns true while the early-boot placeholder flag is still set', () => {
      // Reproduces the window between root-placeholder install and
      // tryFinalizeBootPlaceholder finishing. Services constructed during
      // bootstrap (route tracker, etc.) hit this path.
      g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__ = true;
      delete g.__NS_HMR_BOOT_COMPLETE__;

      expect(isNativeScriptViteHmrActive()).toBe(true);
    });

    it('returns true after the placeholder is cleared and boot-complete flag is set', () => {
      // Reproduces the typical late-construction window — e.g. NativeDialog
      // is instantiated lazily on first modal open, by which point the NS
      // Vite root-placeholder runtime has already deleted the early flag
      // and set the persistent boot-complete flag.
      delete g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__;
      g.__NS_HMR_BOOT_COMPLETE__ = true;

      expect(isNativeScriptViteHmrActive()).toBe(true);
    });

    it('returns true when both flags are concurrently set', () => {
      // Defensive: a future runtime could leave both set briefly during
      // the finalize transition. The OR guarantees we never miss it.
      g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__ = true;
      g.__NS_HMR_BOOT_COMPLETE__ = true;

      expect(isNativeScriptViteHmrActive()).toBe(true);
    });
  });

  describe('isWebpackHmrActive', () => {
    it('reads the webpack runtime function on globalThis', () => {
      delete g.__webpack_require__;
      expect(isWebpackHmrActive()).toBe(false);

      g.__webpack_require__ = () => undefined;
      expect(isWebpackHmrActive()).toBe(true);
    });

    it('treats a non-function value on globalThis.__webpack_require__ as inactive', () => {
      g.__webpack_require__ = 'not-a-function' as unknown as object;
      expect(isWebpackHmrActive()).toBe(false);
    });
  });

  describe('isAngularHmrEnabled', () => {
    it('returns false in production builds even when bundler signals slip through', () => {
      g.ngDevMode = false;
      g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__ = true;
      g.__NS_HMR_BOOT_COMPLETE__ = true;
      g.__webpack_require__ = () => undefined;

      expect(isAngularHmrEnabled()).toBe(false);
    });

    it('returns true in dev when the NS Vite early placeholder flag is set', () => {
      g.ngDevMode = true;
      g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__ = true;
      delete g.__NS_HMR_BOOT_COMPLETE__;
      delete g.__webpack_require__;

      expect(isAngularHmrEnabled()).toBe(true);
    });

    it('returns true in dev when only the post-boot complete flag is set (late instantiation case)', () => {
      // Regression test for the bug that caused modal HMR and route replay
      // to silently no-op: services injected after the placeholder commits
      // (e.g. NativeDialog on first modal open) saw the early flag deleted
      // and would previously decide HMR was disabled.
      g.ngDevMode = true;
      delete g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__;
      g.__NS_HMR_BOOT_COMPLETE__ = true;
      delete g.__webpack_require__;

      expect(isAngularHmrEnabled()).toBe(true);
    });

    it('returns true in dev when webpack HMR is active even without the Vite flag', () => {
      g.ngDevMode = true;
      delete g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__;
      delete g.__NS_HMR_BOOT_COMPLETE__;
      g.__webpack_require__ = () => undefined;

      expect(isAngularHmrEnabled()).toBe(true);
    });

    it('returns false in dev when no bundler HMR signal is present', () => {
      g.ngDevMode = true;
      delete g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__;
      delete g.__NS_HMR_BOOT_COMPLETE__;
      delete g.__webpack_require__;

      expect(isAngularHmrEnabled()).toBe(false);
    });

    it('treats undefined ngDevMode as dev so unit tests still see the gate working', () => {
      delete g.ngDevMode;
      g.__NS_DEV_PLACEHOLDER_ROOT_EARLY__ = true;

      expect(isAngularHmrEnabled()).toBe(true);
    });
  });
});
