#!/usr/bin/env node

/**
 * Production build script
 * 
 * This script helps with preparing a production build by:
 * 1. Validating the environment configuration
 * 2. Checking for common production issues
 * 3. Building for the specified platform
 * 
 * Usage:
 * node scripts/build-production.js [ios|android|web]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Define color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Project root directory
const rootDir = path.resolve(__dirname, '..');

// Files to check
const FILES_TO_CHECK = [
  'app.config.js',
  'lib/supabase.ts',
  'lib/error-tracking.ts',
  'config/index.ts',
  'app/_layout.tsx',
  'components/GlobalErrorBoundary.tsx'
];

// Patterns that indicate development code
const DEV_PATTERNS = [
  'console.log(',
  'DEBUG',
  'TODO:',
  'FIXME:',
  'localhost',
  'test password',
  'test user',
  'debugger;'
];

// Sensitive patterns that shouldn't be in code
const SENSITIVE_PATTERNS = [
  'supabaseServiceKey',
  'password:',
  'apiKey:',
  'secretKey',
  'ADMIN_KEY',
  'AUTH_TOKEN'
];

/**
 * Log a message with color
 */
function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

/**
 * Check if a file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(path.join(rootDir, filePath));
  } catch (error) {
    return false;
  }
}

/**
 * Run a command and return its output
 */
function runCommand(command) {
  try {
    return execSync(command, { cwd: rootDir, stdio: 'pipe' }).toString();
  } catch (error) {
    log(`Error running command: ${command}`, colors.red);
    log(error.toString(), colors.red);
    return '';
  }
}

/**
 * Check a file for patterns
 */
function checkFileForPatterns(filePath, patterns, message) {
  const fullPath = path.join(rootDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    log(`${colors.yellow}Warning: File not found: ${filePath}`, colors.yellow);
    return [];
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    const matches = [];
    
    lines.forEach((line, index) => {
      patterns.forEach(pattern => {
        if (line.includes(pattern)) {
          matches.push({
            file: filePath,
            line: index + 1,
            pattern,
            content: line.trim()
          });
        }
      });
    });
    
    return matches;
  } catch (error) {
    log(`Error checking ${filePath}: ${error}`, colors.red);
    return [];
  }
}

/**
 * Check if environment variables are set
 */
function checkEnvironmentVariables() {
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missing = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });
  
  return missing;
}

/**
 * Ask a yes/no question
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Main function
 */
async function main() {
  const platform = process.argv[2];
  
  // Validate platform
  if (!['ios', 'android', 'web'].includes(platform)) {
    log('Please specify a valid platform: ios, android, or web', colors.red);
    log('Usage: node scripts/build-production.js [ios|android|web]', colors.cyan);
    process.exit(1);
  }
  
  log(`\n${colors.bright}====== Production Build Preparation ======${colors.reset}\n`);
  
  // Check required files
  log(`\n${colors.bright}Checking required files...${colors.reset}`);
  const missingFiles = [];
  
  FILES_TO_CHECK.forEach(file => {
    if (!fileExists(file)) {
      missingFiles.push(file);
      log(`❌ Missing: ${file}`, colors.red);
    } else {
      log(`✅ Found: ${file}`, colors.green);
    }
  });
  
  if (missingFiles.length > 0) {
    log(`\n${colors.red}Error: ${missingFiles.length} required files are missing.${colors.reset}`);
    process.exit(1);
  }
  
  // Check for development code
  log(`\n${colors.bright}Checking for development code...${colors.reset}`);
  let devMatches = [];
  
  FILES_TO_CHECK.forEach(file => {
    const fileMatches = checkFileForPatterns(file, DEV_PATTERNS);
    devMatches = [...devMatches, ...fileMatches];
  });
  
  if (devMatches.length > 0) {
    log(`\n${colors.yellow}Warning: Found ${devMatches.length} instances of development code:${colors.reset}`);
    
    devMatches.forEach(match => {
      log(`${match.file}:${match.line} - ${match.content}`, colors.yellow);
    });
    
    const proceed = await askQuestion('Development code detected. Continue anyway?');
    if (!proceed) {
      process.exit(1);
    }
  } else {
    log('✅ No development code patterns found', colors.green);
  }
  
  // Check for sensitive information
  log(`\n${colors.bright}Checking for sensitive information...${colors.reset}`);
  let sensitiveMatches = [];
  
  FILES_TO_CHECK.forEach(file => {
    const fileMatches = checkFileForPatterns(file, SENSITIVE_PATTERNS);
    sensitiveMatches = [...sensitiveMatches, ...fileMatches];
  });
  
  if (sensitiveMatches.length > 0) {
    log(`\n${colors.red}Error: Found ${sensitiveMatches.length} instances of potentially sensitive information:${colors.reset}`);
    
    sensitiveMatches.forEach(match => {
      log(`${match.file}:${match.line} - ${match.pattern}`, colors.red);
    });
    
    const proceed = await askQuestion('Sensitive information detected. This is a security risk. Continue anyway?');
    if (!proceed) {
      process.exit(1);
    }
  } else {
    log('✅ No sensitive information patterns found', colors.green);
  }
  
  // Check environment variables
  log(`\n${colors.bright}Checking environment variables...${colors.reset}`);
  const missingVars = checkEnvironmentVariables();
  
  if (missingVars.length > 0) {
    log(`\n${colors.yellow}Warning: Missing required environment variables: ${missingVars.join(', ')}${colors.reset}`);
    log('These should be set before building for production.', colors.yellow);
    
    const proceed = await askQuestion('Missing environment variables. Continue anyway?');
    if (!proceed) {
      process.exit(1);
    }
  } else {
    log('✅ All required environment variables are set', colors.green);
  }
  
  // Final confirmation
  log(`\n${colors.bright}Ready to build for ${platform}${colors.reset}`);
  const confirmBuild = await askQuestion(`Proceed with ${platform} production build?`);
  
  if (!confirmBuild) {
    log('Build canceled.', colors.yellow);
    rl.close();
    return;
  }
  
  // Build the app
  log(`\n${colors.bright}Building for ${platform}...${colors.reset}`);
  
  const buildCommand = {
    ios: 'expo build:ios',
    android: 'expo build:android',
    web: 'expo build:web'
  }[platform];
  
  log(`Running: ${buildCommand}`, colors.cyan);
  
  try {
    execSync(buildCommand, { cwd: rootDir, stdio: 'inherit' });
    log(`\n${colors.green}✅ Build completed successfully!${colors.reset}`);
  } catch (error) {
    log(`\n${colors.red}❌ Build failed.${colors.reset}`);
    log(error.toString(), colors.red);
  }
  
  rl.close();
}

main().catch(error => {
  log(`Fatal error: ${error}`, colors.red);
  process.exit(1);
});
