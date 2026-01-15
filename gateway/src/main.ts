import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppBootstrapService } from './app.service';
// import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config/dist';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  // создаём приложение
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // DI-сервис, который всё настраивает
  const boot = app.get(AppBootstrapService);

  // 1) секреты из файлов (до конфигурации)
  boot.preloadSecrets();

  // 2) middleware, cors, versioning, pipes и т.д.
  boot.configure(app);

  // 3) listen
  const cfg = app.get(ConfigService);
  const port = cfg.get<number>('PORT', { infer: true }) ?? 3001;
  app.use(cookieParser());
  await app.listen(port);

  // 4) пост-стартовые проверки/логи
  await boot.afterListen(app);
}

bootstrap().catch((err) => {
  // запасной логгер, если DI ещё не готов

  console.error('FATAL BOOT ERROR', err);
  process.exit(1);
});
