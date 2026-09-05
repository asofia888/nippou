import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vitest/config';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      // No test needs a DOM: storage.test.ts stubs localStorage itself.
      // Starting jsdom made runs flake on WSL, where environment setup alone
      // could exceed the worker timeout. jsdom stays installed for the day
      // component tests arrive.
      environment: 'node',
      include: ['src/**/*.test.ts'],
      restoreMocks: true,
      // Dates are formatted in local time on purpose; pin the zone so the
      // timezone-sensitive assertions mean the same thing on any machine.
      env: { TZ: 'Asia/Tokyo' },
    },
  };
});
