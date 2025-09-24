const { z } = require('zod');

const registerSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email too long')
    .transform(email => email.toLowerCase().trim()),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  displayName: z.string()
    .min(1, 'Display name is required')
    .max(100, 'Display name too long')
    .trim()
});

const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .transform(email => email.toLowerCase().trim()),
  password: z.string()
    .min(1, 'Password is required')
});

const refreshTokenSchema = z.object({
  refreshToken: z.string()
    .min(1, 'Refresh token is required')
});

const googleCallbackSchema = z.object({
  code: z.string()
    .min(1, 'Authorization code is required'),
  redirectUri: z.string()
    .url('Invalid redirect URI')
    .optional()
});

const googleIdTokenSchema = z.object({
  idToken: z.string()
    .min(1, 'Google ID token is required')
});

module.exports = {
  register: registerSchema,
  login: loginSchema,
  refreshToken: refreshTokenSchema,
  googleCallback: googleCallbackSchema,
  googleIdToken: googleIdTokenSchema
};