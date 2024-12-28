export const nsNgPolyfills = true;

global.performance ??= {} as unknown as Performance;

function getPerformanceObject() {
  const loadTime = Date.now();
  const performance: Partial<Performance> = {
    timeOrigin: loadTime,
    now() {
      return Date.now() - loadTime;
    },
    mark(name: string, options: PerformanceMarkOptions) {
      return {
        detail: options?.detail,
        duration: 0,
        entryType: 'mark',
        name,
        startTime: options?.startTime ?? Date.now() - loadTime,
        toJSON: () => {
          ('');
        },
      };
    },
  };
  return performance;
}

const polyfilledPerformance = getPerformanceObject();

for (const key in polyfilledPerformance) {
  global.performance[key] ??= polyfilledPerformance[key];
}

global.queueMicrotask ??= (fn: () => unknown) => Promise.resolve().then(fn);
