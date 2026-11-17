import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './Configs/db';
import { env } from './Configs/env';
import { logger } from './Utils/logger';

async function main() {
  await connectDatabase();
  const server = createApp().listen(env.PORT, () => {
    logger.info(`SELAH API listening on http://localhost:${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  process.exit(1);
});
