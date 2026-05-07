import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string;
    let errors: any = null;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as any;
        message = resp.message || exception.message;
        errors = resp.errors || resp.message;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    } else {
      message = 'Internal Server Error';
    }

    console.error(`\n========== Exception ==========`);
    console.error(`Time: ${new Date().toISOString()}`);
    console.error(`URL: ${request.method} ${request.url}`);
    console.error(`Status: ${status}`);
    console.error(`Message: ${message}`);

    if (exception instanceof Error && exception.stack) {
      console.error(`\nStack Trace:\n${exception.stack}`);
    }

    if (errors && typeof errors !== 'string') {
      console.error(`\nValidation Errors:`, errors);
    }
    console.error(`================================\n`);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
      errors: status === HttpStatus.BAD_REQUEST ? errors : undefined,
    });
  }
}
