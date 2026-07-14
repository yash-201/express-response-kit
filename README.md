# express-response-kit

`express-response-kit` is a framework-agnostic, zero-runtime-dependency, TypeScript-ready response and error handling engine for Express applications. It provides global middlewares, standard API response wrappers, validation formatting, response encryption, logging hooks, and request ID support.

## Features

- ✅ **Global Error Middleware**: Catch all errors and format them consistently.
- ✅ **Response Interceptor**: Injects helper methods onto the `res` object.
- ✅ **Async Handler Wrapper**: Wraps async controller routes to automatically forward errors to Express error handlers (supports Express 4 & 5).
- ✅ **Custom ApiError Class**: Easily throw descriptive errors (e.g. `throw ApiError.notFound('User not found')`).
- ✅ **Unified Responses**: Clean shapes for success and error bodies.
- ✅ **Validation Formatter**: Auto-formats validation errors from **Zod**, **Joi**, and **Express Validator**.
- ✅ **Optional AES-256-GCM Encryption**: Secure sensitive success payloads automatically.
- ✅ **Request ID Support**: Generates or forwards unique request tracing IDs.
- ✅ **Logging Hooks**: Attach Winston, Pino, or any logging callback.
- ✅ **TypeScript Support**: Full autocomplete and type-safety with zero configuration.

---

## Installation

```bash
npm install express-response-kit
```

---

## Quick Start

### 1. Basic Integration

Import and set up the response interceptor and global error middleware in your Express application:

```javascript
const express = require('express');
const asyncHandler = require('express-response-kit');
const { responseInterceptor, errorInterceptor } = require('express-response-kit');

const app = express();

app.use(express.json());

// 1. Initialize the Response Interceptor (attaches res.success, res.badRequest, etc.)
app.use(responseInterceptor());

// 2. Wrap your route controllers with asyncHandler
app.get(
  '/users',
  asyncHandler(async (req, res) => {
    const users = [{ id: 1, name: 'Alice' }];
    
    // Sends standard 200 Success Response
    return res.success(users, 'Users retrieved successfully');
  })
);

// 3. Register the Global Error Interceptor at the bottom of your middleware chain
app.use(errorInterceptor());

app.listen(3000);
```

### 2. TypeScript Setup

If you are using TypeScript, `express-response-kit` automatically augments Express `Request` and `Response` interfaces. Just import the library once in your entry point:

```typescript
import express from 'express';
import asyncHandler, { responseInterceptor, errorInterceptor, ApiError } from 'express-response-kit';

const app = express();
app.use(responseInterceptor());

app.get('/users', asyncHandler(async (req, res) => {
  // `res.success` is fully typed and autocompletes!
  return res.success({ hello: 'world' }); 
}));
```

---

## API Response Formatting

### Success Response Format
Success payloads use the keys specified (defaults to `success`, `statusCode`, `message`, `data`):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Users retrieved successfully",
  "data": [
    { "id": 1, "name": "Alice" }
  ]
}
```

### Error Response Format
Error responses structure details inside the `errors` property (defaults to `success`, `statusCode`, `message` and `errors`):
```json
{
  "success": false,
  "statusCode": 404,
  "message": "User not found",
  "errors": null
}
```

---

## Throw Helpers and Custom `ApiError`

Instead of passing errors to `next()`, you can throw a custom `ApiError` directly from your controllers. The global `errorInterceptor` will automatically intercept it and return the correct HTTP status code.

```javascript
const { ApiError } = require('express-response-kit');

// Inside a controller:
throw ApiError.notFound('User not found');

// Or with structured details:
throw ApiError.badRequest('Missing mandatory parameters', { missing: ['email', 'password'] });
```

### Supported Throw Helpers:
- `ApiError.badRequest(message, errors)` (400)
- `ApiError.unauthorized(message)` (401)
- `ApiError.forbidden(message)` (403)
- `ApiError.notFound(message)` (404)
- `ApiError.conflict(message)` (409)
- `ApiError.validationError(errors, message)` (422)
- `ApiError.tooManyRequests(message)` (429)
- `ApiError.internal(message, errors)` (500)

---

## Response Interceptor Helpers

The `responseInterceptor()` attaches these quick-access helper methods to the `res` object:

### Success Helpers:
- `res.success(data, message)` - 200 OK
- `res.created(data, message)` - 201 Created
- `res.updated(data, message)` - 200 OK
- `res.deleted(data, message)` - 200 OK

### Error Helpers (Manual response without throwing):
- `res.badRequest(message, errors)` - 400 Bad Request
- `res.unauthorized(message)` - 401 Unauthorized
- `res.forbidden(message)` - 403 Forbidden
- `res.notFound(message)` - 404 Not Found
- `res.conflict(message)` - 409 Conflict
- `res.validationError(errors, message)` - 422 Unprocessable Entity
- `res.tooManyRequests(message)` - 429 Too Many Requests
- `res.internalServerError(message, errors)` - 500 Internal Server Error

---

## Config Customization

You can customize the structure of your JSON responses globally using the `configure` function, or locally in each middleware instance:

### Global Customization

```javascript
const { configure } = require('express-response-kit');

configure({
  successKey: 'ok',
  statusCodeKey: 'status_code',
  dataKey: 'payload',
  errorKey: 'err_details',
  requestIdHeader: 'x-correlation-id'
});
```

### Local Middleware Customization
Passing parameters to `responseInterceptor()` or `errorInterceptor()` overrides the global defaults for that specific router/app:

```javascript
app.use(responseInterceptor({
  successKey: 'ok',
  dataKey: 'result'
}));
```

---

## Automatic Validation Error Formatting

If a validation error is thrown from popular validation libraries, the `errorInterceptor` automatically normalizes it:

### 1. Zod
Formats thrown `ZodError` lists into flat structures:
```json
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "errors": [
    {
      "field": "body.email",
      "message": "Invalid email address",
      "rule": "invalid_string"
    }
  ]
}
```

### 2. Joi
Formats thrown Joi `ValidationError` lists:
```json
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "errors": [
    {
      "field": "body.password",
      "message": "Password must be at least 8 characters long",
      "rule": "string.min"
    }
  ]
}
```

### 3. Express Validator
Normalizes validator array formats:
```json
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "errors": [
    {
      "field": "username",
      "message": "Username must be alphanumeric",
      "value": "usr@name!"
    }
  ]
}
```

---

## Custom Errors: `CustomError` vs `ApiError`

`express-response-kit` provides two distinct error classes to handle different project architectures:

### 1. `ApiError` (Modern API standard)
Designed for clean, status-driven HTTP REST APIs. It provides semantic static helpers:
```javascript
const { ApiError } = require('express-response-kit');

// Throw directly from routes:
throw ApiError.notFound('Resource does not exist');
throw ApiError.badRequest('Invalid fields', { email: 'Email required' });
```

### 2. `CustomError` (Legacy drop-in compatibility)
Specifically designed to match legacy backend error patterns:
```javascript
const { CustomError } = require('express-response-kit');

// Signature: CustomError(message, status, statusText, data)
throw new CustomError(
  'Failed to authenticate with smart credit API', 
  400, 
  'LOGIN_FAILED', 
  { detail: 'API timeout' }
);
```
The global `errorInterceptor` detects the numeric `.status` property, extracts the custom string code from `.statusCode` (e.g. `'LOGIN_FAILED'`), and outputs it in the payload.

---

## Internal Mechanics of `asyncHandler`

Writing `try/catch` blocks inside every route is repetitive and prone to silent failures. `express-response-kit` exports `asyncHandler` as its default export, which acts as a wrapper for Express controllers.

### How it works internally:
```javascript
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```
* **Auto-Catching**: Any thrown error or rejected promise inside an `async` router callback is caught immediately and forwarded to Express's `next(err)` pipeline.
* **Zero Boilerplate**: By wrapping your controllers in `asyncHandler()`, you can throw errors (`ApiError` or `CustomError`) inline without writing any `try/catch` blocks. The global `errorInterceptor` will catch them automatically.

---

## Payload Encryption (AES-256-GCM)

`express-response-kit` has built-in response payload encryption using Node's native `crypto` library.

### 1. Encrypting only the `data` payload
By default, setting `encrypt` will only cipher the content of the `data` (or configured `dataKey`) property, keeping the other structural metadata keys readable:
```javascript
app.use(responseInterceptor({
  encrypt: { secretKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' }
}));
```

### 2. Encrypting the entire response body
If your security policy requires encrypting the entire HTTP response (including metadata like success status, correlation ID, etc.), set `encryptEntireResponse: true`:
```javascript
app.use(responseInterceptor({
  encryptEntireResponse: true,
  encrypt: { secretKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' }
}));
// Returns a single encrypted string of format "iv:auth_tag:ciphertext" to the client
```

### 3. Custom Encryption Callbacks
You can supply a custom encryption callback to integrate with custom public key algorithms or external libraries:
```javascript
app.use(responseInterceptor({
  encryptEntireResponse: true,
  encrypt: (serializedPayload) => {
    return customCipher(serializedPayload);
  }
}));
```

---

## Logging Hook Setup

You can plug in your own Winston, Pino, or custom logger function to capture request durations, status codes, and error trace lines:

```javascript
const winston = require('winston');
const logger = winston.createLogger({ /* ... */ });

// Hook into Success responses:
app.use(responseInterceptor({
  logger: (message, meta) => {
    logger.info(message, meta);
  }
}));

// Hook into Error handlers:
app.use(errorInterceptor({
  logger: (message, meta) => {
    logger.error(message, meta);
  }
}));
```

### Log Metadata payload:
The meta payload supplied to loggers includes:
* `method` (HTTP verb)
* `url` (original route path)
* `statusCode`
* `durationMs` (execution time)
* `requestId` (correlation ID)
* `error` and `stack` trace (for error handlers)

---

## License

ISC
