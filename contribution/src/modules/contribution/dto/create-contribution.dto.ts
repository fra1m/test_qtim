import { IsDateString, IsInt, IsString, Length, Min } from 'class-validator';

export class CreateContributionDto {
  @IsString({ message: 'Должно быть строкой' })
  @Length(1, 200, {
    message: 'Длина названия должна быть от 1 до 200 символов',
  })
  title!: string;

  @IsString({ message: 'Должно быть строкой' })
  @Length(1, 4000, {
    message: 'Длина описания должна быть от 1 до 4000 символов',
  })
  description!: string;

  @IsDateString({}, { message: 'Некорректная дата публикации' })
  publishedAt!: string;

  @IsInt({ message: 'Автор должен быть числом' })
  @Min(1, { message: 'Автор должен быть положительным числом' })
  authorId!: number;

  @IsString({ message: 'Должно быть строкой' })
  @Length(1, 200, {
    message: 'Длина имени автора должна быть от 1 до 200 символов',
  })
  authorName!: string;
}
