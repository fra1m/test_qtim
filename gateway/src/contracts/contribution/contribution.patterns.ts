export const CONTRIBUTIONS_PATTERNS = {
  /** 'contributions.create' */
  CREATE: 'contributions.create',
  /** 'contributions.getAll' */
  GET_ALL: 'contributions.getAll',
  /** 'contributions.getById' */
  GET_BY_ID: 'contributions.getById',
  /** 'contributions.update' */
  UPDATE: 'contributions.update',
  /** 'contributions.remove' */
  REMOVE: 'contributions.remove',
} as const;

export type ContributionsPattern =
  (typeof CONTRIBUTIONS_PATTERNS)[keyof typeof CONTRIBUTIONS_PATTERNS];
