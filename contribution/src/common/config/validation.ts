import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().port().default(3002),

  // RMQ base
  RABBITMQ_URL: Joi.string().required(),

  // Queues
  RMQ_AVITO_WORKER_QUEUE: Joi.string().min(1).default('avito_worker'),
  RMQ_EVENTS_QUEUE: Joi.string().min(1).default('gateway.events'),

  // Consumer tuning (если будешь использовать)
  RMQ_PREFETCH: Joi.number().integer().min(1).max(500).default(50),

  // Queue args used by buildRmqOptions()
  RMQ_DLX: Joi.string().min(1).default('dlx'),

  // optional numbers (can be unset)
  RMQ_MESSAGE_TTL_MS: Joi.number().integer().min(1).optional(),
  RMQ_MAX_LENGTH: Joi.number().integer().min(1).optional(),
}).unknown(true);
