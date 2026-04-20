type AngularCoreWithCompiledComponentReset = {
  ɵresetCompiledComponents?: () => void;
};

type AngularCoreHolder = {
  __NS_ANGULAR_CORE__?: AngularCoreWithCompiledComponentReset | null;
};

export function setAngularCoreForHmr(
  core: AngularCoreWithCompiledComponentReset | null | undefined,
  globalObj: AngularCoreHolder = globalThis as AngularCoreHolder,
): AngularCoreWithCompiledComponentReset | null | undefined {
  if (core) {
    globalObj.__NS_ANGULAR_CORE__ = core;
  }

  return getAngularCoreForHmrReset(core, globalObj);
}

export function getAngularCoreForHmrReset(
  core: AngularCoreWithCompiledComponentReset | null | undefined,
  globalObj: AngularCoreHolder = globalThis as AngularCoreHolder,
): AngularCoreWithCompiledComponentReset | null | undefined {
  return globalObj.__NS_ANGULAR_CORE__ || core;
}

export function rememberAngularCoreForHmr(
  core: AngularCoreWithCompiledComponentReset | null | undefined,
  globalObj: AngularCoreHolder = globalThis as AngularCoreHolder,
): AngularCoreWithCompiledComponentReset | null | undefined {
  if (!globalObj.__NS_ANGULAR_CORE__ && core) {
    globalObj.__NS_ANGULAR_CORE__ = core;
  }

  return getAngularCoreForHmrReset(core, globalObj);
}

export function resetAngularHmrCompiledComponents(
  core: AngularCoreWithCompiledComponentReset | null | undefined,
): boolean {
  const resetCompiledComponents = core?.ɵresetCompiledComponents;
  if (typeof resetCompiledComponents !== 'function') {
    return false;
  }

  try {
    resetCompiledComponents.call(core);
    return true;
  } catch {
    return false;
  }
}