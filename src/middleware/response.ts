import { NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { getConfig, buildResponseBody, ResponseKitConfig } from '../response/responseBuilder';
import { StatusCodes } from '../constants/statusCodes';

export function responseInterceptor(options: Partial<ResponseKitConfig> = {}) {
  return (req: any, res: any, next: NextFunction) => {
    const config = { ...getConfig(), ...options };
    const startTime = Date.now();

    // 1. Request ID Generation or Extraction
    const headerName = config.requestIdHeader.toLowerCase();
    let requestId = req.headers[headerName];
    if (!requestId) {
      if (config.generateRequestId) {
        requestId = config.generateRequestId();
      } else {
        requestId = randomBytes(8).toString('hex'); // 16 chars unique random string
      }
      res.setHeader(config.requestIdHeader, requestId);
    }
    
    // Store request ID on request and response contexts
    req.requestId = requestId;
    res.requestId = requestId;
    req._startTime = startTime;

    // Unified sender
    const send = (statusCode: number, success: boolean, message: string, dataOrErrors: any) => {
      const body = buildResponseBody(config, statusCode, success, message, dataOrErrors, requestId);
      
      if (config.logger) {
        config.logger(`API Response: ${req.method} ${req.originalUrl} - ${statusCode}`, {
          method: req.method,
          url: req.originalUrl,
          statusCode,
          durationMs: Date.now() - startTime,
          requestId,
        });
      }

      return res.status(statusCode).json(body);
    };

    // Attach success responses
    res.success = (data: any = null, message = 'Success') => send(StatusCodes.OK, true, message, data);
    res.created = (data: any = null, message = 'Resource Created') => send(StatusCodes.CREATED, true, message, data);
    res.updated = (data: any = null, message = 'Resource Updated') => send(StatusCodes.OK, true, message, data);
    res.deleted = (data: any = null, message = 'Resource Deleted') => send(StatusCodes.OK, true, message, data);

    // Attach client-side error responses
    res.badRequest = (message = 'Bad Request', errors: any = null) => send(StatusCodes.BAD_REQUEST, false, message, errors);
    res.unauthorized = (message = 'Unauthorized') => send(StatusCodes.UNAUTHORIZED, false, message, null);
    res.forbidden = (message = 'Forbidden') => send(StatusCodes.FORBIDDEN, false, message, null);
    res.notFound = (message = 'Not Found') => send(StatusCodes.NOT_FOUND, false, message, null);
    res.conflict = (message = 'Conflict') => send(StatusCodes.CONFLICT, false, message, null);
    res.validationError = (errors: any, message = 'Validation Error') => send(StatusCodes.UNPROCESSABLE_ENTITY, false, message, errors);
    res.tooManyRequests = (message = 'Too Many Requests') => send(StatusCodes.TOO_MANY_REQUESTS, false, message, null);

    // Attach server-side error responses
    res.internalServerError = (message = 'Internal Server Error', errors: any = null) => send(StatusCodes.INTERNAL_SERVER_ERROR, false, message, errors);

    next();
  };
}
