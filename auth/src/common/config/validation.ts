import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  // RMQ
  RABBITMQ_URL: Joi.string().uri().required(),
  RMQ_AUTH_QUEUE: Joi.string().default('auth'),
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

  // JWT / security
  JWT_ACCESS_TTL: Joi.string().min(1).default('30m'),
  JWT_REFRESH_TTL: Joi.string().min(1).default('30d'),
  JWT_PRIVATE_KEY_PATH: Joi.string().optional(),
  JWT_PUBLIC_KEY_PATH: Joi.string().optional(),
  JWT_REFRESH_PRIVATE_KEY_PATH: Joi.string().optional(),
  JWT_REFRESH_PUBLIC_KEY_PATH: Joi.string().optional(),
  JWT_PRIVATE_KEY: Joi.string().optional(),
  JWT_PUBLIC_KEY: Joi.string().optional(),
  JWT_REFRESH_PRIVATE_KEY: Joi.string().optional(),
  JWT_REFRESH_PUBLIC_KEY: Joi.string().optional(),
  JWT_PRIVATE_KEY_B64: Joi.string().optional(),
  JWT_PUBLIC_KEY_B64: Joi.string().optional(),
  JWT_REFRESH_PRIVATE_KEY_B64: Joi.string().optional(),
  JWT_REFRESH_PUBLIC_KEY_B64: Joi.string().optional(),
  TOKEN_PEPPER: Joi.string().min(1).required(),
  SALT_ROUNDS: Joi.number().integer().min(4).max(20).optional(),

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
