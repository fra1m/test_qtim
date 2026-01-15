import { IsEmail, IsNumber, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString({ message: 'Должно быть строкой' })
  @IsEmail({}, { message: 'Не корректный email' })
  email: string;

  @IsString({ message: 'Должно быть строкой' })
  name: string;

  @IsNumber({}, { message: 'Должно быть числом' })
  contributionId?: number;
}
