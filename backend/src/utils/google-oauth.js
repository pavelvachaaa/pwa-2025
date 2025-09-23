const { OAuth2Client } = require('google-auth-library');
const logger = require('@utils/logger').child({ module: 'googleOAuth' });

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  logger.warn('Google OAuth credentials not configured');
}

const client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

function generateGoogleAuthUrl() {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google OAuth not configured');
  }

  const scopes = ['openid', 'email', 'profile'];

  return client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    include_granted_scopes: true,
    state: generateSecureState()
  });
}

async function verifyGoogleToken(code, redirectUri) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth not configured');
  }

  try {
    const { tokens } = await client.getToken({
      code,
      redirect_uri: redirectUri
    });

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified,
      name: payload.name,
      picture: payload.picture,
      familyName: payload.family_name,
      givenName: payload.given_name
    };
  } catch (error) {
    logger.error({ err: error }, 'Failed to verify Google token');
    throw new Error('Invalid Google authorization code');
  }
}

async function verifyGoogleIdToken(idToken) {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google OAuth not configured');
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified,
      name: payload.name,
      picture: payload.picture,
      familyName: payload.family_name,
      givenName: payload.given_name
    };
  } catch (error) {
    logger.error({ err: error }, 'Failed to verify Google ID token');
    throw new Error('Invalid Google ID token');
  }
}

function generateSecureState() {
  return require('./crypto').generateSecureToken(16);
}

module.exports = {
  generateGoogleAuthUrl,
  verifyGoogleToken,
  verifyGoogleIdToken,
  isConfigured: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)
};