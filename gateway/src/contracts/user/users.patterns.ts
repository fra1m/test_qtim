export const USERS_PATTERNS = {
  /** 'users.create' */
  CREATE: 'users.create',
  /** 'users.getByEmail' */
  GET_BY_EMAIL: 'users.getByEmail',
  /** 'users.getAll' */
  GET_ALL: 'users.getAll',
  /** 'users.getUserById' */
  GET_BY_ID: 'users.getUserById',
  /** 'users.update' */
  UPDATE: 'users.update',
  /** 'users.remove' */
  REMOVE: 'users.remove',
  /** 'users.addContribution' */
  ADD_CONTRIBUTION: 'users.addContribution',
  /** 'users.removeContribution' */
  REMOVE_CONTRIBUTION: 'users.removeContribution',
} as const;

export type UsersPattern = (typeof USERS_PATTERNS)[keyof typeof USERS_PATTERNS];
