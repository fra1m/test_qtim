import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().min(1).default('api'),
  CORS_ORIGIN: Joi.string().allow('').optional(),

  // RMQ base
  RABBITMQ_URL: Joi.string().required(),

  // Queues
  RMQ_AUTH_QUEUE: Joi.string().min(1).default('auth'),
  RMQ_USERS_QUEUE: Joi.string().min(1).default('users'),
  RMQ_CONTRIBUTIONS_QUEUE: Joi.string().min(1).default('contributions'),

  // Queue args used by buildRmqOptions()
  RMQ_DLX: Joi.string().min(1).default('dlx'),

  // optional numbers (can be unset)
  RMQ_MESSAGE_TTL_MS: Joi.number().integer().min(1).optional(),
  RMQ_MAX_LENGTH: Joi.number().integer().min(1).optional(),

  // Redis
  REDIS_HOST: Joi.string().min(1).default('redis'),
  REDIS_PORT: Joi.number().integer().min(1).default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_PASSWORD_FILE: Joi.string().optional(),
  REDIS_TTL_SEC: Joi.number().integer().min(1).optional(),

  // JWT public key for access verification
  JWT_PUBLIC_KEY_PATH: Joi.string().optional(),
  JWT_PUBLIC_KEY: Joi.string().optional(),

  // Logger
  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal')
    .optional(),
  LOG_PRETTY: Joi.boolean().optional(),
  SERVICE_NAME: Joi.string().min(1).optional(),
  SERVICE_VERSION: Joi.string().min(1).optional(),
}).unknown(true);
