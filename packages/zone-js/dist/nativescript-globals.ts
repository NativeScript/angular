// Zone.__load_patch('nativescript_MutationObserver', (global: any, Zone: ZoneType, api: _ZonePrivate) => {
//   api.patchClass('MutationObserver');
//   api.patchClass('WebKitMutationObserver');
// });

// Zone.__load_patch('nativescript_IntersectionObserver', (global: any, Zone: ZoneType, api: _ZonePrivate) => {
//   api.patchClass('IntersectionObserver');
// });

Zone.__load_patch('nativescript_FileReader', (global: any, Zone: ZoneType, api: _ZonePrivate) => {
  api.patchClass('FileReader');
});
