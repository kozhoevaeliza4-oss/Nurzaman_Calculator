import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

// Every request gets a correlation id — attached as X-Request-Id on the
// response and, once a request carries one, AllExceptionsFilter includes
// it in the error body too, so a user-reported error can be matched back
// to this exact log line. One structured JSON line per request keeps
// production logs greppable/parseable instead of Nest's default
// human-formatted console output.
declare module 'express' {
  interface Request {
    id: string;
  }
}

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const id = randomUUID();
    req.id = id;
    res.setHeader('X-Request-Id', id);

    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      this.logger.log(
        JSON.stringify({
          requestId: id,
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          durationMs: Math.round(durationMs * 100) / 100,
        }),
      );
    });

    next();
  }
}
