/* eslint-disable */
import { patchClass, patchNativeScriptEventTarget } from './utils';

function isPropertyWritable(propertyDesc: any) {
  if (!propertyDesc) {
    return true;
  }

  if (propertyDesc.writable === false) {
    return false;
  }

  return !(typeof propertyDesc.get === 'function' && typeof propertyDesc.set === 'undefined');
}

Zone.__load_patch('nativescript_patchMethod', (global, Zone, api) => {
  api.patchMethod = function patchMethod(target: any, name: string, patchFn: (delegate: Function, delegateName: string, name: string) => (self: any, args: any[]) => any): Function | null {
    let proto = target;
    while (proto && !proto.hasOwnProperty(name)) {
      proto = Object.getPrototypeOf(proto);
    }
    if (!proto && target[name]) {
      // somehow we did not find it, but we can see it. This happens on IE for Window properties.
      proto = target;
    }

    const delegateName = Zone.__symbol__(name);
    let delegate: Function | null = null;
    if (proto && !proto.hasOwnProperty(delegateName)) {
      delegate = proto[delegateName] = proto[name];
      // check whether proto[name] is writable
      // some property is readonly in safari, such as HtmlCanvasElement.prototype.toBlob
      const desc = proto && api.ObjectGetOwnPropertyDescriptor(proto, name);
      if (isPropertyWritable(desc)) {
        const patchDelegate = patchFn(delegate!, delegateName, name);
        proto[name] = function () {
          return patchDelegate(this, arguments as any);
        };
        api.attachOriginToPatched(proto[name], delegate);
        //   if (shouldCopySymbolProperties) {
        // 	copySymbolProperties(delegate, proto[name]);
        //   }
      }
    }
    return delegate;
  };
});

Zone.__load_patch('nativescript_event_target_api', (g, z, api: any) => {
  api.patchNativeScriptEventTarget = patchNativeScriptEventTarget;
});

Zone.__load_patch('nativescript_patch_class_api', (g, z, api) => {
  api.patchClass = (className: string) => patchClass(className, api);
});

// Initialize zone microtask queue on main thread
// TODO: dive into the ios runtime (PromiseProxy) and find a better solution
Promise.resolve().then(() => {});
