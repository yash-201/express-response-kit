export class CustomError extends Error {
  public readonly status: number;
  public readonly statusCode: string;
  public readonly data: any;

  constructor(message: string, status: number, statusText = '', data: any = {}) {
    super(message);
    this.status = status;
    this.statusCode = statusText;
    this.data = data;
    
    // Restore prototype chain for downlevel JS targets
    Object.setPrototypeOf(this, new.target.prototype);
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default CustomError;
