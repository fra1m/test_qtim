import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  ValidationError,
  Logger,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidationException } from '../exceptions/validation.exception';

function extractValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      messages.push(`${path} - ${Object.values(error.constraints).join(', ')}`);
    }

    if (error.children?.length) {
      messages.push(...extractValidationErrors(error.children, path));
    }
  }

  return messages;
}

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(ValidationPipe.name);

  private isPrimitiveType(metatype: any): boolean {
    const types: any[] = [String, Boolean, Number, Array, Object];
    return types.includes(metatype);
  }

  async transform(value: unknown, metadata: ArgumentMetadata): Promise<any> {
    if (!metadata.metatype || this.isPrimitiveType(metadata.metatype)) {
      return value;
    }

    if (metadata.type === 'param') {
      return value;
    }

    const metatype = metadata.metatype as new (...args: any[]) => object;
    const obj = plainToInstance(metatype, value as object, {
      enableImplicitConversion: true,
    });

    const errors = await validate(obj, {
      whitelist: false,
      forbidNonWhitelisted: false,
      skipMissingProperties: false,
    });

    if (errors.length) {
      const message = extractValidationErrors(errors);

      this.logger.error(message);
      const messages = errors.map((err) => {
        return `${err.property} - ${Object.values(err.constraints ?? {}).join(', ')}`;
      });
      throw new ValidationException(messages);
    }

    return obj;
  }
}
