const config = require('../config/env');

/**
 * Cookie configuration options based on runtime environment.
 */
const getAuthCookieOptions = (rememberMe = true) => {
  const isProd = config.nodeEnv === 'production';
  const maxAge = rememberMe
    ? 7 * 24 * 60 * 60 * 1000 // 7 days persistent
    : 24 * 60 * 60 * 1000;    // 1 day session

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge,
  };
};

/**
 * Sets secure HTTP-only authentication cookie on the response.
 */
const setAuthCookie = (res, token, rememberMe = true) => {
  if (!res || !token) return;
  const options = getAuthCookieOptions(rememberMe);
  res.cookie('health_copilot_token', token, options);
  res.cookie('token', token, options); // Legacy alias
};

/**
 * Clears authentication cookie with matching security flags.
 */
const clearAuthCookie = (res) => {
  if (!res) return;
  const isProd = config.nodeEnv === 'production';
  const clearOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
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
