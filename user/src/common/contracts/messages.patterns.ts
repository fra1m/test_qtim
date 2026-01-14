export const MESSAGES_PATTERNS = {
  /** 'messages.latest' */
  LATEST: 'messages.latest',
} as const;

export type MessagesPattern =
  (typeof MESSAGES_PATTERNS)[keyof typeof MESSAGES_PATTERNS];
