import { NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { getConfig, buildResponseBody, ResponseKitConfig } from '../response/responseBuilder';
import { StatusCodes } from '../constants/statusCodes';
import { AesEncryption } from '../utils/encryption';

const parsePayload = (dataOrObj: any, defaultMsg: string) => {
  let finalData = dataOrObj;
  let finalMessage = defaultMsg;

  if (dataOrObj && typeof dataOrObj === 'object' && !Array.isArray(dataOrObj)) {
    if ('data' in dataOrObj || 'message' in dataOrObj) {
      finalData = dataOrObj.data !== undefined ? dataOrObj.data : null;
      finalMessage = dataOrObj.message || defaultMsg;
    }
  }
  return { finalData, finalMessage };
};

export function responseInterceptor(options: Partial<ResponseKitConfig> = {}) {
  return (req: any, res: any, next: NextFunction) => {
    const config = { ...getConfig(), ...options };
    const startTime = Date.now();

    // 1. Request ID Generation or Extraction (Optional)
    let requestId: string | undefined = undefined;
    if (config.requestIdHeader) {
      const headerName = config.requestIdHeader.toLowerCase();
      requestId = req.headers[headerName];
      if (!requestId) {
        if (config.generateRequestId) {
          requestId = config.generateRequestId();
        } else {
          requestId = randomBytes(8).toString('hex');
        }
        res.setHeader(config.requestIdHeader, requestId);
      }
      req.requestId = requestId;
      res.requestId = requestId;
    }
    req._startTime = startTime;

    // Unified sender
    const send = (statusCode: number, success: boolean, message: string, dataOrErrors: any) => {
      const parsed = parsePayload(dataOrErrors, message);
      let body = buildResponseBody(config, statusCode, success, parsed.finalMessage, parsed.finalData, requestId);
      
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
    res.badRequest = (data: any = null, message = 'Bad Request') => send(StatusCodes.BAD_REQUEST, false, message, data);
    res.unauthorized = (data: any = null, message = 'Unauthorized') => send(StatusCodes.UNAUTHORIZED, false, message, data);
    res.forbidden = (data: any = null, message = 'Forbidden') => send(StatusCodes.FORBIDDEN, false, message, data);
    res.notFound = (data: any = null, message = 'Not Found') => send(StatusCodes.NOT_FOUND, false, message, data);
    res.conflict = (data: any = null, message = 'Conflict') => send(StatusCodes.CONFLICT, false, message, data);
    res.validationError = (data: any = null, message = 'Validation Error') => send(StatusCodes.UNPROCESSABLE_ENTITY, false, message, data);
    res.tooManyRequests = (data: any = null, message = 'Too Many Requests') => send(StatusCodes.TOO_MANY_REQUESTS, false, message, data);

    // Attach server-side error responses
    res.internalServerError = (data: any = null, message = 'Internal Server Error') => send(StatusCodes.INTERNAL_SERVER_ERROR, false, message, data);

    // Attach credit-repair-backend legacy custom response methods
    res.failure = (data: any = null, message = 'Failure') => send(StatusCodes.OK, false, message, data);
    res.recordNotFound = (data: any = null, message = 'Record not found') => send(StatusCodes.NOT_FOUND, false, message, data);
    res.unAuthorized = (data: any = null, message = 'Unauthorized') => send(StatusCodes.UNAUTHORIZED, false, message, data);
    
    // Check route (bypasses logger and encryption)
    res.check = (data: any = null, message = 'Success') => {
      const parsed = parsePayload(data, message);
      const body = buildResponseBody({ ...config, encrypt: undefined }, StatusCodes.OK, true, parsed.finalMessage, parsed.finalData, requestId);
      return res.status(StatusCodes.OK).json(body);
    };

    next();
  };
}
