type AngularBootstrapRouteLike = {
  children?: AngularBootstrapRouteLike[];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function shouldStripRouteKey(key: string): boolean {
  return key.startsWith('_') || key.startsWith('ɵ');
}

function cloneRouteValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.slice();
  }

  if (isPlainObject(value)) {
    return { ...value };
  }

  return value;
}

function cloneBootstrapRoute<T extends object>(route: T): T {
  const next: AngularBootstrapRouteLike = {};

  for (const [key, value] of Object.entries(route as Record<string, unknown>)) {
    if (shouldStripRouteKey(key)) {
      continue;
    }

    if (key === 'children' && Array.isArray(value)) {
      next.children = cloneRoutesForBootstrap(value);
      continue;
    }

    next[key] = cloneRouteValue(value);
  }

  return next as T;
}

export function cloneRoutesForBootstrap<T extends object>(routes: T[] | undefined | null): T[] {
  if (!Array.isArray(routes)) {
    return [];
  }

  return routes.map((route) => cloneBootstrapRoute(route));
}