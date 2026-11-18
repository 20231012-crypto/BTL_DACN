import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
import { createApp } from './app.js';
const app = await createApp();
const port = Number(process.env.PORT || 3001),
  host = process.env.HOST || '127.0.0.1';
const server = app.listen(port, host, () =>
  console.log(`An Tâm API & production app: http://${host}:${port}`),
);
function stop() {
  server.close(async () => {
    await app.locals.store.close();
    process.exit(0);
  });
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
