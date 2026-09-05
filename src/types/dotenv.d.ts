declare module 'dotenv' {
  export function config(options?: { path?: string; override?: boolean }): { error?: Error; parsed?: Record<string, string> };
  export default { config };
}
