import { Request, Response, NextFunction, RequestHandler } from 'express';
import { responseInterceptor } from './middleware/response';
import { errorInterceptor } from './middleware/error';
import { ApiError } from './errors/ApiError';
import { CustomError } from './errors/CustomError';
import { StatusCodes } from './constants/statusCodes';
import { configure, getConfig } from './response/responseBuilder';
import { formatValidationError } from './utils/validation';
import { AesEncryption } from './utils/encryption';

// 1. Extend Express Request & Response Interfaces via Declaration Merging
declare global {
  namespace Express {
    interface Response {
      /** Send a standard 200 OK success response */
      success(data?: any, message?: string): this;
      /** Send a 201 Created success response */
      created(data?: any, message?: string): this;
      /** Send a standard 200 OK updated success response */
      updated(data?: any, message?: string): this;
      /** Send a standard 200 OK deleted success response */
      deleted(data?: any, message?: string): this;
      /** Send a 400 Bad Request client error response */
      badRequest(message?: string, errors?: any): this;
      /** Send a 401 Unauthorized client error response */
      unauthorized(message?: string): this;
      /** Send a 403 Forbidden client error response */
      forbidden(message?: string): this;
      /** Send a 404 Not Found client error response */
      notFound(message?: string): this;
      /** Send a 409 Conflict client error response */
      conflict(message?: string): this;
      /** Send a 422 Unprocessable Entity validation error response */
      validationError(errors: any, message?: string): this;
      /** Send a 429 Too Many Requests rate-limiting client error response */
      tooManyRequests(message?: string): this;
      /** Send a 500 Internal Server Error response */
      internalServerError(message?: string, errors?: any): this;

      /** Send a standard 200 success response containing failure status (legacy compatibility) */
      failure(data?: any, message?: string): this;
      /** Send a 404 record not found response (legacy compatibility) */
      recordNotFound(data?: any, message?: string): this;
      /** Send a 401 unauthorized response (legacy compatibility) */
      unAuthorized(data?: any, message?: string): this;
      /** Send a 200 success response bypassing logger/encryption hooks (legacy compatibility) */
      check(data?: any, message?: string): this;

      /** Custom Request ID attached to the response lifecycle */
      requestId?: string;
    }

    interface Request {
      /** Custom Request ID generated or intercepted for the request context */
      requestId?: string;
    }
  }
}

// 2. Define asyncHandler middleware wrapper
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Attach named properties to the asyncHandler function object
(asyncHandler as any).responseInterceptor = responseInterceptor;
(asyncHandler as any).errorInterceptor = errorInterceptor;
(asyncHandler as any).ApiError = ApiError;
(asyncHandler as any).CustomError = CustomError;
(asyncHandler as any).StatusCodes = StatusCodes;
(asyncHandler as any).configure = configure;
(asyncHandler as any).getConfig = getConfig;
(asyncHandler as any).formatValidationError = formatValidationError;
(asyncHandler as any).AesEncryption = AesEncryption;
(asyncHandler as any).asyncHandler = asyncHandler;

// Default export supports `import asyncHandler from ...` / `const asyncHandler = require(...)`
export default asyncHandler;

// Export all properties as named outputs
export {
  responseInterceptor,
  errorInterceptor,
  ApiError,
  CustomError,
  StatusCodes,
  configure,
  getConfig,
  formatValidationError,
  AesEncryption,
};

// 3. CommonJS Export Override for direct require('express-response-kit') calls
// Using bracket notation on dynamically obtained global module reference to bypass warnings in ESModule builders
const getGlobalModule = () => {
  try {
    return typeof module !== 'undefined' ? module : undefined;
  } catch {
    return undefined;
  }
};
const dynamicModule = getGlobalModule();
if (dynamicModule && 'exports' in dynamicModule) {
  const exportsObj = (dynamicModule as any).exports;
  Object.assign(asyncHandler, exportsObj);
  (dynamicModule as any).exports = asyncHandler;
  (dynamicModule as any).exports.default = asyncHandler;
  (dynamicModule as any).exports.asyncHandler = asyncHandler;
  (dynamicModule as any).exports.responseInterceptor = responseInterceptor;
  (dynamicModule as any).exports.errorInterceptor = errorInterceptor;
  (dynamicModule as any).exports.ApiError = ApiError;
  (dynamicModule as any).exports.CustomError = CustomError;
  (dynamicModule as any).exports.StatusCodes = StatusCodes;
  (dynamicModule as any).exports.configure = configure;
  (dynamicModule as any).exports.getConfig = getConfig;
  (dynamicModule as any).exports.formatValidationError = formatValidationError;
  (dynamicModule as any).exports.AesEncryption = AesEncryption;
}
