const REQUIRED_KEYS = ["FIRECRAWL_API_KEY", "EMAIL_PROVIDER", "SCHEDULE_INTERVAL_MINUTES"];

function assertRequired(key, value) {
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

function parsePositiveInt(name, rawValue) {
  const value = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer.`);
  }

  return value;
}

function parsePort(name, rawValue) {
  if (!rawValue) {
    return 3000;
  }

  const value = Number.parseInt(rawValue, 10);
  const isValid = Number.isFinite(value) && value >= 1 && value <= 65535;

  if (!isValid) {
    throw new Error(`Environment variable ${name} must be an integer between 1 and 65535.`);
  }

  return value;
}

function parseDbDriver(rawValue) {
  if (!rawValue || rawValue.trim() === "") {
    return "pg";
  }

  const value = rawValue.trim().toLowerCase();

  if (value !== "pg" && value !== "pg-mem") {
    throw new Error("Environment variable DB_DRIVER must be either 'pg' or 'pg-mem'.");
  }

  return value;
}

export function loadConfig(env = process.env) {
  const dbDriver = parseDbDriver(env.DB_DRIVER);

  for (const key of REQUIRED_KEYS) {
    assertRequired(key, env[key]);
  }

  if (dbDriver === "pg") {
    assertRequired("DATABASE_URL", env.DATABASE_URL);
  }

  return {
    server: {
      port: parsePort("APP_PORT", env.APP_PORT)
    },
    schedule: {
      intervalMinutes: parsePositiveInt(
        "SCHEDULE_INTERVAL_MINUTES",
        env.SCHEDULE_INTERVAL_MINUTES
      )
    },
    db: {
      driver: dbDriver,
      url: env.DATABASE_URL
    },
    firecrawl: {
      apiKey: env.FIRECRAWL_API_KEY
    },
    email: {
      provider: env.EMAIL_PROVIDER
    }
  };
}
