import { build, context } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';

const main = async () => {
  const watch = process.argv.includes('--watch');

  rmSync('dist', { recursive: true, force: true });
  mkdirSync('dist', { recursive: true });

  const options = {
    entryPoints: {
      background: 'src/background.ts',
      content: 'src/content/main.ts',
      options: 'src/options.ts'
    },
    bundle: true,
    outdir: 'dist',
    format: 'iife',
    target: 'chrome110',
    sourcemap: true,
    logLevel: 'info'
  } satisfies Parameters<typeof build>[0];

  cpSync('public', 'dist', { recursive: true });

  if (watch) {
    const ctx = await context(options);
    await ctx.watch();
    console.log('Watching src/ ... (files in public/ are copied once; rerun build after changing them)');
    return;
  }

  await build(options);
  console.log('Built to dist/');
};

void main();
