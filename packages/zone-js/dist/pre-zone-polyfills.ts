export const disabledPatches = ['legacy', 'EventTarget', 'XHR', 'MutationObserver', 'IntersectionObserver', 'FileReader'];

for (const patch of disabledPatches) {
  global[`__Zone_disable_${patch}`] = true;
}

if (typeof queueMicrotask === 'undefined') {
  global.queueMicrotask = (cb) => Promise.resolve().then(cb);
}