import { StatusCodes } from '../constants/statusCodes';

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors: any;

  constructor(statusCode: number, message: string, errors: any = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    
    // Restore prototype chain for downlevel JS targets
    Object.setPrototypeOf(this, new.target.prototype);
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = 'Bad Request', errors: any = null): ApiError {
    return new ApiError(StatusCodes.BAD_REQUEST, message, errors);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(StatusCodes.UNAUTHORIZED, message);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(StatusCodes.FORBIDDEN, message);
  }

  static notFound(message = 'Not Found'): ApiError {
    return new ApiError(StatusCodes.NOT_FOUND, message);
  }

  static conflict(message = 'Conflict'): ApiError {
    return new ApiError(StatusCodes.CONFLICT, message);
  }

  static validationError(errors: any, message = 'Validation Error'): ApiError {
    return new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, message, errors);
  }

  static tooManyRequests(message = 'Too Many Requests'): ApiError {
    return new ApiError(StatusCodes.TOO_MANY_REQUESTS, message);
  }

  static internal(message = 'Internal Server Error', errors: any = null): ApiError {
    return new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, message, errors);
  }
}
