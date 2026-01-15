import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  // RMQ
  RABBITMQ_URL: Joi.string().uri().required(),
  RMQ_USERS_QUEUE: Joi.string().default('users'),
  RMQ_PREFETCH: Joi.number().integer().min(1).default(16),

  // HTTP
  PORT: Joi.number().integer().default(3002),

  // Postgres (если используешь поля отдельно)
  POSTGRES_HOST: Joi.string().required(),
  POSTGRES_PORT: Joi.number().integer().default(5432),
  POSTGRES_DB: Joi.string().required(),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().allow('').required(),

  // TypeORM migrations
  TYPEORM_MIGRATIONS_RUN: Joi.boolean().optional(),
}).unknown(true);
