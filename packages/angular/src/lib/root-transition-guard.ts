type RootTransitionGlobal = {
  __NS_DEV_ROOT_TRANSITION_IN_PROGRESS__?: boolean;
  __NS_DEV_ROOT_TRANSITION_REASON__?: string;
};

type RootTransitionTimers = {
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
};

type ResetRootViewLike = {
  resetRootView: (entry?: any) => unknown;
};

export function createAngularRootTransitionGuard(
  globalObj: RootTransitionGlobal = globalThis as RootTransitionGlobal,
  timers: RootTransitionTimers = { setTimeout, clearTimeout },
) {
  let clearTimer: ReturnType<typeof setTimeout> | null = null;

  const clear = () => {
    if (clearTimer) {
      timers.clearTimeout(clearTimer);
      clearTimer = null;
    }

    delete globalObj.__NS_DEV_ROOT_TRANSITION_IN_PROGRESS__;
    delete globalObj.__NS_DEV_ROOT_TRANSITION_REASON__;
  };

  const mark = (detail: string) => {
    clear();
    globalObj.__NS_DEV_ROOT_TRANSITION_IN_PROGRESS__ = true;
    globalObj.__NS_DEV_ROOT_TRANSITION_REASON__ = detail;
  };

  const scheduleClear = (delayMs = 250) => {
    if (clearTimer) {
      timers.clearTimeout(clearTimer);
    }

    clearTimer = timers.setTimeout(() => {
      clearTimer = null;
      delete globalObj.__NS_DEV_ROOT_TRANSITION_IN_PROGRESS__;
      delete globalObj.__NS_DEV_ROOT_TRANSITION_REASON__;
    }, delayMs);
  };

  const runApplicationResetRootView = (
    applicationLike: ResetRootViewLike,
    createRoot: () => unknown,
    detail: string,
    delayMs = 250,
  ) => {
    mark(detail);

    try {
      return applicationLike.resetRootView({ create: () => createRoot() });
    } finally {
      scheduleClear(delayMs);
    }
  };

  return {
    clear,
    mark,
    scheduleClear,
    runApplicationResetRootView,
  };
}