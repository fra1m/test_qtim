import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  // RMQ
  RABBITMQ_URL: Joi.string().uri().required(),
  RMQ_USERS_QUEUE: Joi.string().default('users'),
  RMQ_PREFETCH: Joi.number().integer().min(1).default(16),
  RMQ_DLX: Joi.string().min(1).default('dlx'),
  RMQ_MESSAGE_TTL_MS: Joi.number().integer().min(1).optional(),
  RMQ_MAX_LENGTH: Joi.number().integer().min(1).optional(),

  // Postgres (если используешь поля отдельно)
  POSTGRES_HOST: Joi.string().required(),
  POSTGRES_PORT: Joi.number().integer().default(5432),
  POSTGRES_DB: Joi.string().required(),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().allow('').required(),

  // TypeORM migrations
  TYPEORM_MIGRATIONS_RUN: Joi.boolean().optional(),

  // Logger
  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal')
    .optional(),
  LOG_PRETTY: Joi.boolean().optional(),
  SERVICE_NAME: Joi.string().min(1).optional(),
  SERVICE_VERSION: Joi.string().min(1).optional(),
}).unknown(true);
