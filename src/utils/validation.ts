/**
 * Safely parses validation errors from popular libraries (Zod, Joi, Express Validator)
 * and frameworks (Mongoose, etc.) into a clean, unified format.
 */
export function formatValidationError(err: any): any {
  if (!err) return null;

  // 1. ZodError
  if (err.name === 'ZodError' && Array.isArray(err.issues)) {
    return err.issues.map((issue: any) => ({
      field: issue.path.join('.'),
      message: issue.message,
      rule: issue.code,
    }));
  }

  // 2. Joi ValidationError
  if ((err.isJoi === true || err.name === 'ValidationError') && Array.isArray(err.details)) {
    return err.details.map((detail: any) => ({
      field: detail.path.join('.'),
      message: detail.message,
      rule: detail.type,
    }));
  }

  // 3. Express Validator Result
  if (typeof err.array === 'function') {
    try {
      const errArray = err.array();
      if (Array.isArray(errArray)) {
        return errArray.map((e: any) => ({
          field: e.path || e.param || '',
          message: e.msg || e.message || '',
          value: e.value,
        }));
      }
    } catch {
      // Ignore format conversion failures
    }
  }

  // 4. Mongoose validation error or general nested errors object
  if (err.name === 'ValidationError' && err.errors && typeof err.errors === 'object') {
    const formatted: Record<string, string> = {};
    for (const key of Object.keys(err.errors)) {
      formatted[key] = err.errors[key].message || String(err.errors[key]);
    }
    return formatted;
  }

  // 5. Generic array of error objects
  if (Array.isArray(err.errors)) {
    return err.errors.map((e: any) => {
      if (e && typeof e === 'object') {
        return {
          field: e.path || e.param || e.field || '',
          message: e.msg || e.message || String(e),
          value: e.value,
        };
      }
      return { message: String(e) };
    });
  }

  // Fallback to error message, or string representation
  return err.message || String(err);
}
