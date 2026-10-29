import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const payload = exception.getResponse();

    const body: ErrorBody =
      typeof payload === 'string'
        ? { code: this.codeFromStatus(status), message: payload }
        : {
            code: (payload as any).code ?? this.codeFromMessage((payload as any).message) ?? this.codeFromStatus(status),
            message: Array.isArray((payload as any).message)
              ? (payload as any).message.join(', ')
              : (payload as any).message ?? exception.message,
            details: (payload as any).details,
          };

    response.status(status).json(body);
  }

  /** Les `new XxxException('SOME_CODE')` n'ont pas de champ code : le message en UPPER_SNAKE_CASE en tient lieu. */
  private codeFromMessage(message: unknown): string | undefined {
    return typeof message === 'string' && /^[A-Z][A-Z0-9_]+$/.test(message) ? message : undefined;
  }

  private codeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      default:
        return 'ERROR';
    }
  }
}
