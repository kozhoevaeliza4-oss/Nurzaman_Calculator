// Fail fast with a clear message instead of a cryptic crash deep inside
// TypeORM/JWT if the deployer forgot to fill in .env.
const REQUIRED = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'] as const;

export function validateEnv(): void {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `Missing required environment variable(s): ${missing.join(', ')}.\n` +
        'Copy .env.example to .env and fill these in before starting the app.',
    );
    process.exit(1);
  }

  if (process.env.JWT_SECRET === 'change-me-in-production' && process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.error('JWT_SECRET is still the example placeholder — set a real secret before running in production.');
    process.exit(1);
  }
}
