export const AVITO_WORKER_PATTERNS = {
  START: 'avito_worker.start',
  STOP: 'avito_worker.stop',
  STATUS: 'avito_worker.status',
  LOGIN: 'avito_worker.login',
} as const;

export type AvitoWorkerState = 'STOPPED' | 'STARTING' | 'RUNNING' | 'ERROR';

export type AvitoWorkerStatus = {
  state: AvitoWorkerState;
  workerKey: string;
  startedAt?: number; // ms
  lastTickAt?: number; // ms
  lastError?: string;
};
