import { defineConfig } from 'vite';
import { angularConfig } from '@nativescript/vite';;

export default defineConfig(({ mode }) => ({
  // Start from the standard NativeScript Angular config
  ...angularConfig({ mode }),
  build: {
    ...(angularConfig({ mode }) as any).build,
    rollupOptions: {
      ...((angularConfig({ mode }) as any).build?.rollupOptions ?? {}),
      // Ensure emoji-regex interop works in this workspace
      output: {
        ...(((angularConfig({ mode }) as any).build?.rollupOptions ?? {}).output ?? {}),
        interop: (id: string) => {
          if (id.includes('emoji-regex')) {
            return 'auto';
          }
          // fall back to default behavior
          return 'default';
        },
      },
    },
  },
}));