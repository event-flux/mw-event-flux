export type Logger = (...args: any[]) => void;
export type Log = (callback: (logger: Logger) => void) => void;

export default function getLog(logger: (...args: any[]) => void): Log {
  if (!logger) {
    return () => {};
  } else {
    return callback => callback(logger);
  }
}
