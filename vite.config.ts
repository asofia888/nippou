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
      // Only storage.test.ts needs a DOM (localStorage); it opts in with a
      // docblock. Spinning up jsdom for every file made runs flaky on WSL,
      // where environment setup alone took over two minutes.
      environment: 'node',
      include: ['src/**/*.test.ts'],
      restoreMocks: true,
      // Dates are formatted in local time on purpose; pin the zone so the
      // timezone-sensitive assertions mean the same thing on any machine.
      env: { TZ: 'Asia/Tokyo' },
    },
  };
});
