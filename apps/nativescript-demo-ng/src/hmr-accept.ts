export function hmrAccept(mod: any) {
  if (!mod.hot) {
    return;
  }
  mod.hot.accept();
  mod.hot.dispose(() => {
    if (global['__cleanup_ng_hot__']) global['__cleanup_ng_hot__']();
  });
}
