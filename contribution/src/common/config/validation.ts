import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  // RMQ
  RABBITMQ_URL: Joi.string().uri().required(),
  RMQ_CONTRIBUTIONS_QUEUE: Joi.string().default('contributions'),
  RMQ_PREFETCH: Joi.number().integer().min(1).default(16),

  // HTTP
  PORT: Joi.number().integer().default(3004),

  // Postgres
  POSTGRES_HOST: Joi.string().required(),
  POSTGRES_PORT: Joi.number().integer().default(5432),
  POSTGRES_DB: Joi.string().required(),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().allow('').required(),

  // Политика очередей (DLX/TTL/лимиты)
  RMQ_DLX: Joi.string().min(1).default('dlx'),
  RMQ_MESSAGE_TTL_MS: Joi.number().integer().min(1).optional(),
  RMQ_MAX_LENGTH: Joi.number().integer().min(1).optional(),
}).unknown(true);
