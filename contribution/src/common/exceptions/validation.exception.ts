import { HttpException, HttpStatus } from '@nestjs/common';

export class ValidationException extends HttpException {
  messages: string;

  constructor(respones) {
    super(respones, HttpStatus.BAD_REQUEST);
    this.messages = respones;
  }
}
