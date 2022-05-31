// Zone.__load_patch('nativescript_MutationObserver', (global: any, Zone: ZoneType, api: _ZonePrivate) => {
//   api.patchClass('MutationObserver');
//   api.patchClass('WebKitMutationObserver');
// });

// Zone.__load_patch('nativescript_IntersectionObserver', (global: any, Zone: ZoneType, api: _ZonePrivate) => {
//   api.patchClass('IntersectionObserver');
// });

Zone.__load_patch('nativescript_FileReader', (global: any, Zone: ZoneType, api: _ZonePrivate) => {
  const reader = global['FileReader'];
  if (reader) {
    reader.prototype.onload = reader.prototype.onload || null;
    reader.prototype.onerror = reader.prototype.onerror || null;
    reader.prototype.onabort = reader.prototype.onabort || null;
    reader.prototype.onloadend = reader.prototype.onloadend || null;
    reader.prototype.onloadstart = reader.prototype.onloadstart || null;
    reader.prototype.onprogress = reader.prototype.onprogress || null;
  }
  api.patchClass('FileReader');
});
