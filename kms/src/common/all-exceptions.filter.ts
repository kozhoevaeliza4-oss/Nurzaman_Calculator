import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

// Normalizes every thrown error — Nest's own HttpException subclasses and
// anything unexpected — into one consistent JSON shape, and makes sure an
// unhandled error is logged server-side instead of only reaching the
// client as an opaque 500.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';
    if (isHttpException) {
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : ((body as { message?: string | string[] }).message ?? exception.message);
    }

    // Set by RequestLoggingMiddleware — lets a reported error be matched
    // back to its one-line request log (same id in both).
    const requestId = request.id as string | undefined;

    if (!isHttpException || status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${requestId ?? '-'}] ${request.method} ${request.url} -> ${status}: ${exception instanceof Error ? exception.stack : exception}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
      ...(requestId ? { requestId } : {}),
    });
  }
}
