import { IsEmail, IsString, Length } from 'class-validator';

export class AuthUserDto {
  @IsString({ message: 'Должно быть строкой' })
  @IsEmail({}, { message: 'Не корректный логин' })
  email: string;

  @IsString({ message: 'Должно быть строкой' })
  @Length(6, 16, {
    message: 'Не корректный пароль',
  })
  password: string;
}
