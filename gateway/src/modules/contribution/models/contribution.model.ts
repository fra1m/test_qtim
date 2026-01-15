export type ContributionModel = {
  id: number;
  title: string;
  description: string;
  publishedAt: string;
  authorId: number;
  authorName: string;
  createdAt: string;
  updatedAt: string;
};

export type ContributionList = {
  items: ContributionModel[];
  total: number;
  page: number;
  limit: number;
};
