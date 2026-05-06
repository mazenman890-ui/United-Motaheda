import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : "Unexpected error";

    const code =
      exception instanceof HttpException
        ? `HTTP_${status}`
        : "UNEXPECTED_ERROR";

    response.status(status).json({
      success: false,
      data: null,
      error: {
        code,
        message,
        details: {
          path: request.url,
          method: request.method,
        },
      },
    });
  }
}

