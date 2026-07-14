import { AesEncryption } from '../utils/encryption';

export interface ResponseKitConfig {
  successKey: string;
  messageKey: string;
  dataKey: string;
  statusCodeKey: string;
  errorKey: string;
  requestIdHeader: string;
  encrypt?: ((data: any) => string) | { secretKey: string };
  logger?: (message: string, meta?: any) => void;
  generateRequestId?: () => string;
}

const DEFAULT_CONFIG: ResponseKitConfig = {
  successKey: 'success',
  messageKey: 'message',
  dataKey: 'data',
  statusCodeKey: 'statusCode',
  errorKey: 'errors',
  requestIdHeader: 'x-request-id',
};

let globalConfig = { ...DEFAULT_CONFIG };

export function configure(options: Partial<ResponseKitConfig>): void {
  globalConfig = { ...globalConfig, ...options };
}

export function getConfig(): ResponseKitConfig {
  return globalConfig;
}

export function buildResponseBody(
  config: ResponseKitConfig,
  statusCode: number,
  success: boolean,
  message: string,
  dataOrErrors: any,
  requestId?: string
): any {
  const response: any = {
    [config.successKey]: success,
    [config.statusCodeKey]: statusCode,
    [config.messageKey]: message,
  };

  if (success) {
    let data = dataOrErrors;
    if (config.encrypt && data !== undefined && data !== null) {
      if (typeof config.encrypt === 'function') {
        data = config.encrypt(data);
      } else if (typeof config.encrypt === 'object' && config.encrypt.secretKey) {
        const aes = new AesEncryption(config.encrypt.secretKey);
        data = aes.encrypt(data);
      }
    }
    response[config.dataKey] = data;
  } else {
    response[config.errorKey] = dataOrErrors;
  }

  if (requestId && config.requestIdHeader) {
    response.requestId = requestId;
  }

  return response;
}
