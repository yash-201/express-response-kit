const express = require('express');
const { z } = require('zod');
const asyncHandler = require('express-response-kit');
const {
  responseInterceptor,
  errorInterceptor,
  ApiError,
  AesEncryption,
  CustomError,
} = require('express-response-kit');

const app = express();
const PORT = 3000;

// Setup console logger hook
const exampleLogger = (message, meta) => {
  console.log(`[APP LOG] ${message} - Metadata:`, JSON.stringify(meta));
};

app.use(express.json());

// 1. Register responseInterceptor with encryption + logger configuration
app.use(
  responseInterceptor({
    logger: exampleLogger,
    // Setup AES-256-GCM encryption with a 32-byte secret key (64 hex characters)
    // encrypt: {
    //   secretKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    // },
  })
);

// 2. Wrap routes with the asyncHandler utility

// Route: Success with automatic AES GCM encryption of payload data
app.get(
  '/api/secure-data',
  asyncHandler(async (req, res) => {
    const sensitivePayload = {
      accountNumber: '1234-5678-9012',
      balance: '$42,500.00',
      status: 'active',
    };
    return res.success(sensitivePayload, 'Secure data retrieved successfully');
  })
);

// Route: Throw ApiError directly
app.get(
  '/api/users/:id',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    if (userId !== '1') {
      throw new CustomError(`User with ID ${userId} does not exist`, 404, 'USER_NOT_FOUND', { message: "12312" });
      throw ApiError.badRequest(`User with ID ${userId} does not exist`);
    }
    return res.success({ id: 1, name: 'Yash Parmar' }, "test");
  })
);

// Route: Throw CustomError to verify backward compatibility
app.get(
  '/api/custom-error-test',
  asyncHandler(async (req, res) => {
    throw new CustomError('Failed to authenticate with smart credit API', 400, 'LOGIN_FAILED', { detail: 'API timeout' });
  })
);

// Route: Schema Validation utilizing Zod
const RegisterSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email format'),
  age: z.number().min(18, 'Must be 18 or older'),
});

app.post(
  '/api/register',
  asyncHandler(async (req, res) => {
    // Parse validation - if it fails, Zod throws a ZodError
    const parsedData = RegisterSchema.parse(req.body);
    return res.created(parsedData, 'User registered successfully');
  })
);

// 3. Register global errorInterceptor to format and return errors cleanly
app.use(
  errorInterceptor({
    // logger: exampleLogger,
  })
);

// Start the server
const server = app.listen(PORT, () => {
  console.log(`🚀 Example Express app listening at http://localhost:${PORT}`);

  // Perform programmatic verification checks
  // runProgrammaticVerification();
});

// Self-contained client-side verification requests
async function runProgrammaticVerification() {
  console.log('\n--- Running Programmatic Verification ---');

  const headers = { 'Content-Type': 'application/json' };

  try {
    // 1. Test registration validation error (Zod)
    console.log('\n[TEST 1] Testing POST /api/register (Validation Error):');
    const regRes = await fetch(`http://localhost:${PORT}/api/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ username: 'yp', email: 'invalid-email', age: 16 }),
    });
    console.log('Status:', regRes.status);
    console.log('Body:', await regRes.text());

    // 2. Test fetching sensitive data (AES Encrypted)
    console.log('\n[TEST 2] Testing GET /api/secure-data (Encrypted Response):');
    const secureRes = await fetch(`http://localhost:${PORT}/api/secure-data`);
    const secureBody = await secureRes.json();
    console.log('Status:', secureRes.status);
    console.log('Body:', JSON.stringify(secureBody));

    // Decrypt to verify GCM authenticity
    const decryptor = new AesEncryption('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
    const decryptedData = decryptor.decrypt(secureBody.data);
    console.log('Decrypted Data:', JSON.stringify(decryptedData));

    // 3. Test ApiError.notFound
    console.log('\n[TEST 3] Testing GET /api/users/99 (ApiError.notFound):');
    const userRes = await fetch(`http://localhost:${PORT}/api/users/99`);
    console.log('Status:', userRes.status);
    console.log('Body:', await userRes.text());

    // 4. Test CustomError compatibility
    console.log('\n[TEST 4] Testing GET /api/custom-error-test (CustomError compatibility):');
    const customErrRes = await fetch(`http://localhost:${PORT}/api/custom-error-test`);
    console.log('Status:', customErrRes.status);
    console.log('Body:', await customErrRes.text());

    console.log('\n--- Verification Finished Successfully! ---');
  } catch (err) {
    console.error('Error during programmatic verification:', err);
  } finally {
    server.close(() => {
      console.log('Example test server shutdown cleanly.');
    });
  }
}
