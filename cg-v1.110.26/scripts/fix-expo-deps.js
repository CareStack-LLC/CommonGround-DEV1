#!/usr/bin/env node
/**
 * Auto-fix Expo dependency errors
 *
 * This script:
 * 1. Starts the Expo dev server
 * 2. Monitors output for "Unable to resolve" errors
 * 3. Automatically installs missing packages
 * 4. Restarts until no more errors
 */

const { spawn } = require('child_process');
const path = require('path');

const MAX_ITERATIONS = 20;
const APP_PATH = 'apps/parent-app';
const TIMEOUT_MS = 60000; // 60 seconds per attempt

class ExpoDepFixer {
  constructor() {
    this.iteration = 0;
    this.installedPackages = new Set();
    this.currentProcess = null;
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warning: '\x1b[33m', // Yellow
    };
    const reset = '\x1b[0m';
    console.log(`${colors[type]}${message}${reset}`);
  }

  extractPackageName(errorOutput) {
    // Pattern: Unable to resolve "package-name" from "..."
    const match = errorOutput.match(/Unable to resolve ["']([^"']+)["']/);
    if (match) {
      const modulePath = match[1];

      // Extract just the package name (first segment)
      // e.g., "expo-modules-core" from "expo-modules-core/something"
      // e.g., "@babel/runtime" from "@babel/runtime/helpers/createClass"
      if (modulePath.startsWith('@')) {
        // Scoped package: @scope/package
        const parts = modulePath.split('/');
        return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : modulePath;
      } else {
        // Regular package
        return modulePath.split('/')[0];
      }
    }
    return null;
  }

  async runExpo() {
    return new Promise((resolve) => {
      this.log(`\n[${'='.repeat(50)}]`, 'info');
      this.log(`Iteration ${this.iteration + 1}/${MAX_ITERATIONS}`, 'info');
      this.log(`[${'='.repeat(50)}]\n`, 'info');

      let output = '';
      let errorDetected = false;
      let missingPackage = null;
      let bundlingStarted = false;

      this.currentProcess = spawn('pnpm', ['--filter', 'parent-app', 'exec', 'expo', 'start', '--non-interactive'], {
        cwd: path.resolve(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const timeout = setTimeout(() => {
        if (!errorDetected && bundlingStarted) {
          this.log('✓ No errors detected in this run!', 'success');
          this.cleanup();
          resolve({ success: true, package: null });
        } else if (!bundlingStarted) {
          this.log('⚠ Timeout waiting for bundling to start', 'warning');
          this.cleanup();
          resolve({ success: false, package: null, timeout: true });
        }
      }, TIMEOUT_MS);

      this.currentProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;

        // Detect when bundling starts
        if (text.includes('Bundling') || text.includes('Building')) {
          bundlingStarted = true;
        }

        // Check for the QR code or success indicators
        if (text.includes('Metro waiting') || text.includes('Waiting on')) {
          clearTimeout(timeout);
          this.log('✓ App started successfully!', 'success');
          this.cleanup();
          resolve({ success: true, package: null });
        }
      });

      this.currentProcess.stderr.on('data', (data) => {
        const text = data.toString();
        output += text;

        // Look for "Unable to resolve" errors
        if (text.includes('Unable to resolve')) {
          errorDetected = true;
          const packageName = this.extractPackageName(text);
          if (packageName && !missingPackage) {
            missingPackage = packageName;
            this.log(`✗ Missing dependency detected: ${packageName}`, 'error');
            clearTimeout(timeout);
            setTimeout(() => {
              this.cleanup();
              resolve({ success: false, package: packageName });
            }, 2000); // Give it a moment to flush output
          }
        }
      });

      this.currentProcess.on('error', (error) => {
        clearTimeout(timeout);
        this.log(`Process error: ${error.message}`, 'error');
        this.cleanup();
        resolve({ success: false, package: null, error: error.message });
      });

      this.currentProcess.on('exit', (code) => {
        clearTimeout(timeout);
        if (!errorDetected && code === 0) {
          this.log('Process exited successfully', 'success');
          resolve({ success: true, package: null });
        }
      });
    });
  }

  cleanup() {
    if (this.currentProcess) {
      try {
        this.currentProcess.kill('SIGTERM');
        // Force kill after 2 seconds if still running
        setTimeout(() => {
          if (this.currentProcess && !this.currentProcess.killed) {
            this.currentProcess.kill('SIGKILL');
          }
        }, 2000);
      } catch (err) {
        // Ignore cleanup errors
      }
      this.currentProcess = null;
    }
  }

  async installPackage(packageName) {
    this.log(`\n📦 Installing ${packageName}...`, 'info');

    return new Promise((resolve, reject) => {
      const install = spawn('pnpm', ['--filter', 'parent-app', 'add', packageName], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
      });

      install.on('exit', (code) => {
        if (code === 0) {
          this.log(`✓ Successfully installed ${packageName}`, 'success');
          this.installedPackages.add(packageName);
          resolve();
        } else {
          this.log(`✗ Failed to install ${packageName}`, 'error');
          reject(new Error(`Installation failed with code ${code}`));
        }
      });

      install.on('error', (error) => {
        this.log(`✗ Installation error: ${error.message}`, 'error');
        reject(error);
      });
    });
  }

  async run() {
    this.log('🚀 Starting Expo dependency auto-fixer...', 'info');
    this.log(`Target: ${APP_PATH}\n`, 'info');

    while (this.iteration < MAX_ITERATIONS) {
      try {
        const result = await this.runExpo();

        if (result.success) {
          this.log('\n🎉 SUCCESS! All dependencies resolved!', 'success');
          this.log(`Installed ${this.installedPackages.size} package(s):`, 'info');
          this.installedPackages.forEach(pkg => this.log(`  - ${pkg}`, 'info'));
          return 0;
        }

        if (result.timeout) {
          this.log('Timeout reached, stopping...', 'warning');
          return 1;
        }

        if (result.package) {
          // Install the missing package
          await this.installPackage(result.package);
          this.iteration++;
        } else {
          this.log('Could not determine missing package, stopping...', 'error');
          return 1;
        }
      } catch (error) {
        this.log(`Unexpected error: ${error.message}`, 'error');
        return 1;
      }
    }

    this.log('\n⚠ Maximum iterations reached. Some issues may remain.', 'warning');
    return 1;
  }
}

// Handle signals
process.on('SIGINT', () => {
  console.log('\n\nInterrupted by user. Cleaning up...');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n\nTerminated. Cleaning up...');
  process.exit(143);
});

// Run the fixer
const fixer = new ExpoDepFixer();
fixer.run()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
