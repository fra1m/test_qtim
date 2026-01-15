export type UserModel = {
  sub: number;
  email: string;
  name: string;
  contributionIds?: number[] | null;
};
