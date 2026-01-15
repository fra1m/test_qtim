# QTIM — микросервисный проект (NestJS)

Репозиторий содержит 4 сервиса и инфраструктуру. Gateway — единственная HTTP-точка входа, остальные сервисы общаются с ним через RabbitMQ (RPC). Данные — PostgreSQL, кэш — Redis.

## Оглавление

- [Кратко о проекте](#about)
- [Структура репозитория](#structure)
- [Архитектура и потоки](#architecture)
- [Запуск в Docker (dev)](#docker-dev)
- [HTTP API (Gateway)](#http-api)
- [Кэширование (Redis)](#cache)
- [RabbitMQ контракты](#rmq)
- [Миграции (TypeORM)](#migrations)
- [Тесты](#tests)
- [Переменные окружения](#env)
- [Диагностика](#troubleshooting)

<a id="about"></a>
## Кратко о проекте

- `gateway` принимает HTTP-запросы и оркестрирует вызовы `user/auth/contribution`.
- `user` хранит пользователей и массив `contributionIds` (id статей).
- `auth` отвечает за пароли, токены и refresh storage.
- `contribution` хранит статьи, фильтрацию, пагинацию и контроль автора.

<a id="structure"></a>
## Структура репозитория

- `gateway/` — HTTP API, оркестрация, кэш, авторизация.
- `user/` — микросервис пользователей.
- `auth/` — микросервис авторизации.
- `contribution/` — микросервис статей.
- `docker/` — docker-compose, `.env`, secrets.

<a id="architecture"></a>
## Архитектура и потоки

Поток регистрации:

1. HTTP `POST /user/registration` в gateway.
2. Gateway вызывает `user.create` (RMQ) → создаёт пользователя.
3. Gateway вызывает `auth.generateTokens` (RMQ) → выпускает access/refresh.
4. Refresh кладётся в cookie, access отдается в теле ответа.

Поток создания статьи:

1. HTTP `POST /contribution` в gateway с `Authorization: Bearer`.
2. Gateway валидирует access-token и вызывает `contributions.create`.
3. При успехе обновляет `user.contributionIds` (через `users.addContribution`).
4. Кэш списка/детали инвалидаируется.

<a id="docker-dev"></a>
## Запуск в Docker (dev)

```
COMPOSE_PROFILES=dev docker compose -f docker/docker-compose.yml up -d --build
```

Порты в dev:

- Gateway: `http://localhost:3000`
- RabbitMQ UI: `http://localhost:15672`
- Redis: `localhost:6379`
- PostgreSQL: `5432/5431/5434` (users/auth/contributions)

Микросервисы `user/auth/contribution` не пробрасывают HTTP наружу — работают только через RMQ внутри docker-сети.

`.env` для сервисов лежат в `docker/*/.env`, ключи JWT — в `docker/.secrets/`.

<a id="http-api"></a>
## HTTP API (Gateway)

Базовый префикс: `http://localhost:3000/api/v1`

### Пользователи

- `POST /user/registration` — регистрация пользователя.
- `POST /user/login` — логин пользователя.
- `GET /user/:id` — получить пользователя по id.
- `PATCH /user/:id` — обновить пользователя.
- `DELETE /user/:id` — удалить пользователя.

Пример регистрации:

```bash
curl -X POST http://localhost:3000/api/v1/user/registration \
  -H "Content-Type: application/json" \
  -H "x-request-id: rid-123" \
  -d '{"email":"user@example.com","name":"User","password":"secret12"}'
```

### Статьи (Contribution)

- `GET /contribution` — список статей с пагинацией и фильтрами.
- `GET /contribution/:id` — детальная статья по id.
- `POST /contribution` — создать статью (требует авторизации).
- `PATCH /contribution/:id` — обновить статью (требует авторизации и владения).
- `DELETE /contribution/:id` — удалить статью (требует авторизации и владения).

Query параметры списка:

- `page` — номер страницы (>= 1)
- `limit` — размер страницы (1..100)
- `authorId` — фильтр по автору
- `publishedFrom` — дата публикации от (ISO)
- `publishedTo` — дата публикации до (ISO)

Пример создания статьи:

```bash
curl -X POST http://localhost:3000/api/v1/contribution \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{"title":"Title","description":"Text","publishedAt":"2026-01-15T12:00:00Z"}'
```

### Авторизация

- Для `POST/PATCH/DELETE` по статьям нужен заголовок:
  `Authorization: Bearer <accessToken>`
- `refreshToken` хранится в cookie и используется для обновления токенов (если потребуется).

<a id="cache"></a>
## Кэширование (Redis)

Префикс ключей: `gw:`.

Ключи по статьям:

- `gw:contrib:id:<id>` — детальная статья
- `gw:contrib:list:version` — версия списка
- `gw:contrib:list:<version>?<query>` — кэш списка с учетом фильтров

Инвалидация:

- при создании/обновлении/удалении статьи — сброс версии списка
- при обновлении/удалении статьи — удаление кэша детали

<a id="rmq"></a>
## RabbitMQ контракты

Контракты лежат в `*/src/contracts/*.patterns.ts`.

Примеры:

- `users.create`, `users.getByEmail`, `users.addContribution`, `users.removeContribution`
- `auth.generateTokens`, `auth.authByPassword`
- `contributions.create`, `contributions.getAll`, `contributions.update`, `contributions.remove`

<a id="migrations"></a>
## Миграции (TypeORM)

У каждого сервиса своя БД и свои миграции (`src/migrations/`).
CLI команды доступны в `package.json` каждого сервиса:

```
npm run migration:run
npm run migration:revert
npm run migration:generate
npm run migration:create
npm run migration:show
```

Запускать из папки конкретного сервиса (`user/`, `auth/`, `contribution/`).

### Быстрый запуск миграций с хоста

Если сервисы запущены в Docker, а команды выполняешь на хосте — используй проброшенный порт БД:

```
POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5432 npm run migration:show
POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5432 npm run migration:run
```

Для auth или contribution меняй `POSTGRES_PORT` на нужный (смотри `docker/docker-compose.yml`).

### Запуск миграций внутри контейнера

```
docker compose -f docker/docker-compose.yml exec users-dev-qtim npm run migration:show
docker compose -f docker/docker-compose.yml exec users-dev-qtim npm run migration:run
```

<a id="tests"></a>
## Тесты

- Unit-тесты: `src/**/*.spec.ts`
- E2E-тесты есть только в `gateway/test/app.e2e-spec.ts`

Команды запуска:

```
npm test
```

E2E для gateway:

```
cd gateway
npm run test:e2e
```

Для `gateway` e2e нужны поднятые реальные микросервисы (см. Docker dev).

<a id="env"></a>
## Переменные окружения

Актуальные `.env` файлы лежат в `docker/*/.env` и соответствуют валидации:

- `gateway`: RMQ, Redis, JWT public key, логирование.
- `user`: RMQ, Postgres, миграции, логирование.
- `auth`: RMQ, Postgres, JWT key/TTL, pepper, миграции, логирование.
- `contribution`: RMQ, Postgres, миграции, логирование.

Если добавляешь новый параметр — внеси его в `*/src/common/config/validation.ts`.

<a id="troubleshooting"></a>
## Диагностика

- `NOAUTH Authentication required` — проверь `REDIS_PASSWORD` и пароль в `docker/docker-compose.yml`.
- `ECONNREFUSED` к Postgres — убедись, что нужная БД поднята и порт корректный.
- Нет ответов по RMQ — проверь `RABBITMQ_URL` и health RabbitMQ.
