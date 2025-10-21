/**
 * Environment Variable Validation
 * Validates required environment variables on startup
 * Fails fast if critical configuration is missing
 */

export interface EnvironmentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate environment variables based on NODE_ENV
 */
export function validateEnvironment(): EnvironmentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const env = process.env.NODE_ENV || 'development';

  // Always required
  const alwaysRequired = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  // Required in production
  const productionRequired = [
    'OPENAI_API_KEY',
    'FRONTEND_URL',
  ];

  // Check always required variables
  for (const varName of alwaysRequired) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long');
    }
    if (process.env.JWT_SECRET === 'your-secret-key-change-this') {
      errors.push('JWT_SECRET cannot be the default value');
    }
  }

  // Production-specific validation
  if (env === 'production') {
    for (const varName of productionRequired) {
      if (!process.env[varName]) {
        errors.push(`Missing required production environment variable: ${varName}`);
      }
    }

    // Validate DATABASE_URL doesn't use weak password
    if (process.env.DATABASE_URL?.includes('password=password')) {
      errors.push('DATABASE_URL uses weak default password');
    }

    // Ensure AI API key is configured
    if (!process.env.OPENAI_API_KEY && !process.env.CLAUDE_API_KEY) {
      errors.push('At least one AI API key must be configured (OPENAI_API_KEY or CLAUDE_API_KEY)');
    }

    // Validate SSL is enabled for production database
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('sslmode=require')) {
      warnings.push('DATABASE_URL should include sslmode=require for production');
    }

    // Check CORS origin is set
    if (!process.env.FRONTEND_URL || process.env.FRONTEND_URL === 'http://localhost:3000') {
      warnings.push('FRONTEND_URL should be set to production domain');
    }
  }

  // Development-specific warnings
  if (env === 'development') {
    if (process.env.JWT_SECRET === 'your-secret-key-change-this') {
      warnings.push('Using default JWT_SECRET in development (this is OK for dev, but change for production)');
    }
  }

  // Validate numeric environment variables
  const numericVars = [
    'API_PORT',
    'DB_POOL_MAX',
    'DB_POOL_MIN',
    'MONTHLY_COST_LIMIT',
    'BATCH_SIZE',
  ];

  for (const varName of numericVars) {
    const value = process.env[varName];
    if (value && isNaN(Number(value))) {
      errors.push(`${varName} must be a valid number, got: ${value}`);
    }
  }

  // Validate boolean environment variables
  const booleanVars = [
    'ENABLE_BATCHING',
    'LOW_MEMORY_MODE',
    'INCLUDE_FULL_CONTENT',
  ];

  for (const varName of booleanVars) {
    const value = process.env[varName];
    if (value && !['true', 'false', '1', '0'].includes(value.toLowerCase())) {
      errors.push(`${varName} must be a boolean (true/false), got: ${value}`);
    }
  }

  // Validate export format
  const exportFormat = process.env.DEFAULT_EXPORT_FORMAT;
  if (exportFormat && !['html', 'csv', 'excel', 'json', 'markdown'].includes(exportFormat)) {
    errors.push(`DEFAULT_EXPORT_FORMAT must be one of: html, csv, excel, json, markdown. Got: ${exportFormat}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Print validation results and exit if errors found
 */
export function validateAndExitOnError(): void {
  console.log('🔍 Validating environment variables...\n');

  const result = validateEnvironment();

  // Print warnings
  if (result.warnings.length > 0) {
    console.warn('⚠️  WARNINGS:');
    result.warnings.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
    console.warn('');
  }

  // Print errors
  if (result.errors.length > 0) {
    console.error('❌ VALIDATION ERRORS:');
    result.errors.forEach(error => {
      console.error(`   - ${error}`);
    });
    console.error('\n💡 Fix these issues and try again.\n');
    process.exit(1);
  }

  console.log('✅ Environment validation passed\n');
}
