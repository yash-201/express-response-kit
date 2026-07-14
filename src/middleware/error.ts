import { NextFunction } from 'express';
import { ApiError } from '../errors/ApiError';
import { getConfig, ResponseKitConfig, buildResponseBody } from '../response/responseBuilder';
import { formatValidationError } from '../utils/validation';
import { StatusCodes } from '../constants/statusCodes';
import { AesEncryption } from '../utils/encryption';

export function errorInterceptor(options: Partial<ResponseKitConfig> = {}) {
  return (err: any, req: any, res: any, next: NextFunction) => {
    const config = { ...getConfig(), ...options };
    const startTime = req._startTime || Date.now();
    const requestId = req.requestId || res.requestId || (err && err.requestId);

    let statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let errors: any = null;

    // 1. ApiError Instance
    if (err instanceof ApiError) {
      statusCode = err.statusCode;
      message = err.message;
      errors = err.errors;
    }
    // 2. CustomError or status-bearing errors
    else if (err && typeof err.status === 'number') {
      statusCode = err.status;
      message = err.message;
      errors = err.data || null;

      // Extract custom error statusText if present as a string property
      if (err.statusCode && typeof err.statusCode === 'string') {
        if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
          errors.code = err.statusCode;
        } else if (errors) {
          errors = { data: errors, code: err.statusCode };
        } else {
          errors = { code: err.statusCode };
        }
      }
    }
    // 3. Format validation errors from Zod, Joi, Express Validator, or Mongoose
    else if (
      err &&
      (err.name === 'ZodError' ||
        err.isJoi ||
        err.name === 'ValidationError' ||
        typeof err.array === 'function' ||
        Array.isArray(err.errors))
    ) {
      statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
      message = 'Validation Error';
      errors = formatValidationError(err);
    }
    // 3. Standard error fallback
    else if (err instanceof Error) {
      message = err.message;
      if (process.env.NODE_ENV === 'production') {
        message = 'An unexpected error occurred';
      } else {
        errors = { stack: err.stack };
      }
    }
    // 4. Raw values fallback
    else if (err) {
      message = String(err);
    }

    let body = buildResponseBody(config, statusCode, false, message, errors, requestId);

    if (config.encrypt && config.encryptEntireResponse) {
      const payloadStr = JSON.stringify(body);
      if (typeof config.encrypt === 'function') {
        body = config.encrypt(payloadStr);
      } else if (typeof config.encrypt === 'object' && config.encrypt.secretKey) {
        const aes = new AesEncryption(config.encrypt.secretKey);
        body = aes.encrypt(payloadStr);
      }
    }

    if (config.logger) {
      config.logger(`API Error: ${req.method} ${req.originalUrl} - ${statusCode} - ${message}`, {
        method: req.method,
        url: req.originalUrl,
        statusCode,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        durationMs: Date.now() - startTime,
        requestId,
      });
    }

    return res.status(statusCode).json(body);
  };
}
