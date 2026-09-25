import { createServer } from 'vite';

async function start() {
  const server = await createServer({
    configFile: './vite.config.ts',
    server: {
      port: 3000,
      host: '0.0.0.0'
    }
  });
  await server.listen();
  server.printUrls();
  // Keep event loop alive
  setInterval(() => {}, 1000 * 60 * 60);
}

start().catch(err => {
  console.error("Vite server error:", err);
  process.exit(1);
});
