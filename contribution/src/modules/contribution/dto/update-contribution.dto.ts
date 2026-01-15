import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class UpdateContributionDto {
  @IsOptional()
  @IsString({ message: 'Должно быть строкой' })
  @Length(1, 200, {
    message: 'Длина названия должна быть от 1 до 200 символов',
  })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Должно быть строкой' })
  @Length(1, 4000, {
    message: 'Длина описания должна быть от 1 до 4000 символов',
  })
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Некорректная дата публикации' })
  publishedAt?: string;
}
