import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListContributionsDto {
  @IsOptional()
  @IsInt({ message: 'page должен быть числом' })
  @Min(1, { message: 'page должен быть >= 1' })
  page?: number;

  @IsOptional()
  @IsInt({ message: 'limit должен быть числом' })
  @Min(1, { message: 'limit должен быть >= 1' })
  @Max(100, { message: 'limit должен быть <= 100' })
  limit?: number;

  @IsOptional()
  @IsInt({ message: 'authorId должен быть числом' })
  @Min(1, { message: 'authorId должен быть >= 1' })
  authorId?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Некорректная дата publishedFrom' })
  publishedFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Некорректная дата publishedTo' })
  publishedTo?: string;
}
