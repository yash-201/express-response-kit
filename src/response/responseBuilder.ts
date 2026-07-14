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
  useNumericStatus?: boolean;
  statusCodeMap?: Record<number, string>;
  encryptEntireResponse?: boolean;
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
  const successVal = config.useNumericStatus ? (success ? 1 : 0) : success;
  const statusVal = config.statusCodeMap ? (config.statusCodeMap[statusCode] || statusCode) : statusCode;

  const response: any = {
    [config.successKey]: successVal,
    [config.statusCodeKey]: statusVal,
    [config.messageKey]: message,
  };

  if (success) {
    let data = dataOrErrors;
    if (config.encrypt && !config.encryptEntireResponse && data !== undefined && data !== null) {
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

  return response;
}
