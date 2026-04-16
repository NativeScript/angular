type AngularCoreWithCompiledComponentReset = {
  ɵresetCompiledComponents?: () => void;
};

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