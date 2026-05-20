// Lightweight logger that forwards errors to Sentry when available
// and respects the global logs toggle (global.__ENABLE_LOGS__) and __DEV__.

let Sentry = null;
try {
  // Prefer sentry-expo if available
  // eslint-disable-next-line global-require
  Sentry = require('sentry-expo');
} catch (e) {
  try {
    // Fallback to @sentry/react-native if present
    // eslint-disable-next-line global-require
    Sentry = require('@sentry/react-native');
  } catch (e2) {
    Sentry = null;
  }
}

const logsEnabled = () => (typeof __DEV__ !== 'undefined' && __DEV__) || global.__ENABLE_LOGS__ === true;

const _orig = {
  log: console.log && console.log.bind(console),
  info: console.info && console.info.bind(console),
  warn: console.warn && console.warn.bind(console),
  error: console.error && console.error.bind(console),
};

function captureToSentry(err) {
  try {
    if (!Sentry) return;
    // sentry-expo exposes a captureException on the default export
    if (typeof Sentry.captureException === 'function') {
      Sentry.captureException(err);
    } else if (Sentry.Native && typeof Sentry.Native.captureException === 'function') {
      Sentry.Native.captureException(err);
    }
  } catch (e) {
    // ignore
  }
}

export function log(...args) {
  if (logsEnabled()) _orig.log?.(...args);
}
export function info(...args) {
  if (logsEnabled()) _orig.info?.(...args);
}
export function warn(...args) {
  if (logsEnabled()) _orig.warn?.(...args);
}
export function error(...args) {
  try {
    // If first arg is Error use it, otherwise create one for Sentry
    const first = args[0];
    const toSend = first instanceof Error ? first : new Error(args.map(a => String(a)).join(' '));
    captureToSentry(toSend);
  } catch (e) {
    // ignore
  }

  if (logsEnabled()) _orig.error?.(...args);
}

export default {
  log,
  info,
  warn,
  error,
};