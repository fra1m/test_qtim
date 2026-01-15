import { IsEmail, IsNumber, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @IsString({ message: 'Должно быть строкой' })
  @IsEmail({}, { message: 'Не корректный email' })
  email: string;

  @IsString({ message: 'Должно быть строкой' })
  name: string;

  // @IsNumber({}, { message: 'Должно быть числом' })
  // contributionId?: number;

  @IsString({ message: 'Должно быть строкой' })
  @Length(6, 16, {
    message: 'Длинна пароля должна быть не меньше 6 и не больше 16',
  })
  password: string;
}
