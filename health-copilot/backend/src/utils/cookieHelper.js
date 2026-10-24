const config = require('../config/env');

/**
 * Cookie configuration options based on runtime environment.
 * Ensures HTTPS cross-site support between Vercel and Render (SameSite=None; Secure).
 */
const getAuthCookieOptions = (rememberMe = true, req = null) => {
  const isHttps = Boolean(
    req?.secure ||
    req?.headers?.['x-forwarded-proto'] === 'https' ||
    req?.headers?.origin?.startsWith('https://') ||
    req?.headers?.referer?.startsWith('https://') ||
    process.env.NODE_ENV === 'production' ||
    process.env.RENDER === 'true' ||
    Boolean(process.env.RENDER_EXTERNAL_URL) ||
    Boolean(process.env.VERCEL) ||
    config.nodeEnv === 'production'
  );

  const maxAge = rememberMe
    ? 7 * 24 * 60 * 60 * 1000 // 7 days persistent
    : 24 * 60 * 60 * 1000;    // 1 day session

  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
    maxAge,
    partitioned: isHttps,
  };
};

/**
 * Sets secure HTTP-only authentication cookie on the response.
 */
const setAuthCookie = (res, token, rememberMe = true, req = null) => {
  if (!res || !token) return;
  const options = getAuthCookieOptions(rememberMe, req);
  res.cookie('health_copilot_token', token, options);
  res.cookie('token', token, options); // Legacy alias
};

/**
 * Clears authentication cookie with matching security flags.
 */
const clearAuthCookie = (res, req = null) => {
  if (!res) return;
  const options = getAuthCookieOptions(true, req);
  const clearOptions = {
    httpOnly: true,
    secure: options.secure,
    sameSite: options.sameSite,
    path: '/',
    partitioned: options.partitioned,
  };
  res.clearCookie('health_copilot_token', clearOptions);
  res.clearCookie('token', clearOptions);
};

/**
 * Zero-dependency Express middleware to parse incoming cookies into req.cookies.
 */
const cookieParser = (req, res, next) => {
  req.cookies = req.cookies || {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const idx = pair.indexOf('=');
      if (idx !== -1) {
        const key = pair.substring(0, idx).trim();
        const val = pair.substring(idx + 1).trim();
        try {
          req.cookies[key] = decodeURIComponent(val);
        } catch {
          req.cookies[key] = val;
        }
      }
    }
  }
  next();
};

module.exports = {
  getAuthCookieOptions,
  setAuthCookie,
  clearAuthCookie,
  cookieParser,
};
