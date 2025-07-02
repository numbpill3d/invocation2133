#!/usr/bin/env node

/**
 * 🏭 PROMPT ARCHIVE INDUSTRIAL - BUILD SCRIPT
 * Advanced build automation for the industrial interface
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Build configuration
const config = {
    platforms: {
        win: ['win32', 'x64', 'ia32'],
        mac: ['darwin', 'x64', 'arm64'],
        linux: ['linux', 'x64', 'arm64']
    },
    outputDir: 'dist',
    assetsDir: 'assets',
    buildDir: 'build'
};

// ANSI colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function log(message, color = colors.white) {
    console.log(`${color}🏭 ${message}${colors.reset}`);
}

function error(message) {
    console.error(`${colors.red}❌ ERROR: ${message}${colors.reset}`);
}

function success(message) {
    console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function warning(message) {
    console.log(`${colors.yellow}⚠️  WARNING: ${message}${colors.reset}`);
}

function execCommand(command, description) {
    log(`${description}...`, colors.cyan);
    try {
        execSync(command, { stdio: 'inherit' });
        success(`${description} completed`);
        return true;
    } catch (error) {
        error(`${description} failed: ${error.message}`);
        return false;
    }
}

function createDirectories() {
    const dirs = [config.outputDir, config.assetsDir, config.buildDir];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            log(`Created directory: ${dir}`, colors.green);
        }
    });
}

function checkDependencies() {
    log('Checking dependencies...', colors.cyan);
    
    const requiredDeps = ['electron', 'electron-builder', 'electron-store'];
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const missing = requiredDeps.filter(dep => !allDeps[dep]);
    
    if (missing.length > 0) {
        warning(`Missing dependencies: ${missing.join(', ')}`);
        log('Installing missing dependencies...', colors.cyan);
        return execCommand(`npm install ${missing.join(' ')}`, 'Installing dependencies');
    }
    
    success('All dependencies are installed');
    return true;
}

function createDefaultAssets() {
    const iconPath = path.join(config.assetsDir, 'icon.png');
    
    if (!fs.existsSync(iconPath)) {
        warning('No icon.png found in assets directory');
        log('Creating placeholder icon...', colors.cyan);
        
        // Create a simple SVG icon as placeholder
        const svgIcon = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0a0a0a"/>
  <rect x="50" y="50" width="412" height="412" fill="#1a1a1a" stroke="#87CEEB" stroke-width="4"/>
  <text x="256" y="280" font-family="monospace" font-size="48" fill="#87CEEB" text-anchor="middle">PROMPT</text>
  <text x="256" y="340" font-family="monospace" font-size="32" fill="#87CEEB" text-anchor="middle">ARCHIVE</text>
  <circle cx="256" cy="180" r="60" fill="none" stroke="#87CEEB" stroke-width="4"/>
  <circle cx="256" cy="180" r="20" fill="#87CEEB"/>
</svg>`;
        
        fs.writeFileSync(path.join(config.assetsDir, 'icon.svg'), svgIcon);
        log('Created placeholder SVG icon (convert to PNG for production)', colors.yellow);
    }
}

function buildForPlatform(platform) {
    const commands = {
        win: 'electron-builder --win',
        mac: 'electron-builder --mac', 
        linux: 'electron-builder --linux',
        all: 'electron-builder --win --mac --linux'
    };
    
    const command = commands[platform];
    if (!command) {
        error(`Unknown platform: ${platform}`);
        return false;
    }
    
    return execCommand(command, `Building for ${platform}`);
}

function cleanBuild() {
    log('Cleaning previous builds...', colors.cyan);
    
    if (fs.existsSync(config.outputDir)) {
        fs.rmSync(config.outputDir, { recursive: true, force: true });
        log('Cleaned dist directory', colors.green);
    }
    
    if (fs.existsSync('node_modules/.cache')) {
        fs.rmSync('node_modules/.cache', { recursive: true, force: true });
        log('Cleaned cache directory', colors.green);
    }
}

function validateBuild() {
    log('Validating build output...', colors.cyan);
    
    if (!fs.existsSync(config.outputDir)) {
        error('Build output directory not found');
        return false;
    }
    
    const files = fs.readdirSync(config.outputDir);
    if (files.length === 0) {
        error('No build artifacts found');
        return false;
    }
    
    success(`Found ${files.length} build artifact(s):`);
    files.forEach(file => {
        const filePath = path.join(config.outputDir, file);
        const stats = fs.statSync(filePath);
        const size = (stats.size / 1024 / 1024).toFixed(2);
        log(`  • ${file} (${size} MB)`, colors.blue);
    });
    
    return true;
}

function showUsage() {
    console.log(`
${colors.cyan}🏭 PROMPT ARCHIVE INDUSTRIAL - BUILD SCRIPT${colors.reset}

Usage: node build.js [command] [options]

Commands:
  ${colors.green}setup${colors.reset}     - Initialize build environment
  ${colors.green}clean${colors.reset}     - Clean previous builds
  ${colors.green}dev${colors.reset}       - Build for development
  ${colors.green}win${colors.reset}       - Build for Windows
  ${colors.green}mac${colors.reset}       - Build for macOS  
  ${colors.green}linux${colors.reset}     - Build for Linux
  ${colors.green}all${colors.reset}       - Build for all platforms
  ${colors.green}validate${colors.reset}  - Validate build output
  ${colors.green}help${colors.reset}      - Show this help

Examples:
  ${colors.dim}node build.js setup${colors.reset}
  ${colors.dim}node build.js win${colors.reset}
  ${colors.dim}node build.js all${colors.reset}
`);
}

function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    log('PROMPT ARCHIVE INDUSTRIAL BUILD SYSTEM', colors.magenta);
    log('========================================', colors.magenta);
    
    switch (command) {
        case 'setup':
            createDirectories();
            checkDependencies();
            createDefaultAssets();
            success('Setup completed');
            break;
            
        case 'clean':
            cleanBuild();
            success('Clean completed');
            break;
            
        case 'dev':
            createDirectories();
            execCommand('electron .', 'Starting development mode');
            break;
            
        case 'win':
        case 'mac':
        case 'linux':
        case 'all':
            createDirectories();
            if (checkDependencies()) {
                if (buildForPlatform(command)) {
                    validateBuild();
                }
            }
            break;
            
        case 'validate':
            validateBuild();
            break;
            
        case 'help':
        default:
            showUsage();
            break;
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    error(`Uncaught exception: ${error.message}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
    process.exit(1);
});

// Run the build script
if (require.main === module) {
    main();
}

module.exports = {
    buildForPlatform,
    cleanBuild,
    validateBuild,
    createDirectories,
    checkDependencies
};