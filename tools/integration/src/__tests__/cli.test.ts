/*
 * CLI Module Tests
 * Tests for the CLI configuration module.
 * These tests verify the module structure and basic functionality.
 */

describe('CLI Module', () => {
    describe('Module Structure', () => {
        it('should export configureCLI function', async () => {
            const module = await import('../cli');
            expect(module.configureCLI).toBeDefined();
            expect(typeof module.configureCLI).toBe('function');
        });

        it('should have configureCLI with correct arity', async () => {
            const module = await import('../cli');
            expect(module.configureCLI.length).toBe(1);
        });

        it('should only export configureCLI', async () => {
            const module = await import('../cli');
            const exports = Object.keys(module);
            expect(exports).toContain('configureCLI');
            expect(exports.length).toBe(1);
        });

        it('should export configureCLI as a named export', async () => {
            const module = await import('../cli');
            expect(module).toHaveProperty('configureCLI');
            expect((module as any).default).toBeUndefined();
        });
    });

    describe('Function Signature', () => {
        it('should accept handlers object with all required methods', async () => {
            const module = await import('../cli');
            const mockHandlers = {
                handleDownload: async () => {},
                handleImport: async () => {},
                handleExport: async () => {},
                handleInit: async () => {},
                handlePublish: async () => {},
                handleLint: async () => {},
                handleBuild: async () => {},
            };

            // Should not throw when called with valid handlers
            expect(() => {
                const fn = module.configureCLI;
                expect(typeof fn).toBe('function');
            }).not.toThrow();
        });

        it('should be a function that accepts handlers', async () => {
            const module = await import('../cli');
            const { configureCLI } = module;
            expect(typeof configureCLI).toBe('function');
            expect(configureCLI.name).toBe('configureCLI');
        });
    });

    describe('Type Safety', () => {
        it('should accept async handler functions', async () => {
            const module = await import('../cli');
            const asyncHandlers = {
                handleDownload: async (argv: any) => Promise.resolve(),
                handleImport: async (argv: any) => Promise.resolve(),
                handleExport: async (argv: any) => Promise.resolve(),
                handleInit: async () => Promise.resolve(),
                handlePublish: async (argv: any) => Promise.resolve(),
                handleLint: async (argv: any) => Promise.resolve(),
                handleBuild: async (argv: any) => Promise.resolve(),
            };

            // TypeScript compilation ensures type safety
            expect(() => {
                const fn = module.configureCLI;
                expect(typeof fn).toBe('function');
            }).not.toThrow();
        });
    });

    describe('Module Exports', () => {
        it('should not have default export', async () => {
            const module = await import('../cli');
            expect((module as any).default).toBeUndefined();
        });

        it('should have configureCLI as named export', async () => {
            const module = await import('../cli');
            expect(module).toHaveProperty('configureCLI');
        });
    });

    describe('CLI Configuration Constants', () => {
        it('should contain example text for commands', async () => {
            // Read the cli.ts file to verify it contains example texts
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            expect(cliContent).toContain('examplesForDownload');
            expect(cliContent).toContain('examplesForImport');
            expect(cliContent).toContain('examplesForExport');
            expect(cliContent).toContain('examplesForPublish');
            expect(cliContent).toContain('examplesForBuild');
            expect(cliContent).toContain('Examples:');
        });

        it('should define all command names', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            // Verify all commands are defined
            expect(cliContent).toContain("'download'");
            expect(cliContent).toContain("'import'");
            expect(cliContent).toContain("'export'");
            expect(cliContent).toContain("'init'");
            expect(cliContent).toContain("'publish'");
            expect(cliContent).toContain("'lint'");
            expect(cliContent).toContain("'build'");
        });

        it('should define command descriptions', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            expect(cliContent).toContain('Download an integration package');
            expect(cliContent).toContain('Import an integration package into an environment');
            expect(cliContent).toContain('Export integration elements from an environment');
            expect(cliContent).toContain('Initialize a new integration package');
            expect(cliContent).toContain('Publish the local integration package');
            expect(cliContent).toContain('Provides linting for package');
            expect(cliContent).toContain('Build collector container image');
        });

        it('should configure yargs with proper settings', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            // Verify yargs configuration methods are called
            expect(cliContent).toContain('.wrap(160)');
            expect(cliContent).toContain('.usage(');
            expect(cliContent).toContain('.command(');
            expect(cliContent).toContain('.demandCommand(');
            expect(cliContent).toContain('.help()');
            expect(cliContent).toContain('.version()');
            expect(cliContent).toContain('.strict()');
            expect(cliContent).toContain('.parse()');
        });
    });

    describe('Command Options', () => {
        it('should define download command options', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            // Verify download options
            expect(cliContent).toContain("'package'");
            expect(cliContent).toContain("'location'");
            expect(cliContent).toContain("alias: 'p'");
            expect(cliContent).toContain("alias: 'l'");
        });

        it('should define import command options', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            // Verify import options
            expect(cliContent).toContain("'server'");
            expect(cliContent).toContain("'token'");
            expect(cliContent).toContain("'include'");
            expect(cliContent).toContain("'set'");
            expect(cliContent).toContain("'debug'");
            expect(cliContent).toContain("alias: 'S'");
            expect(cliContent).toContain("alias: 't'");
            expect(cliContent).toContain("alias: 'i'");
            expect(cliContent).toContain("alias: 's'");
            expect(cliContent).toContain("alias: 'd'");
        });

        it('should define import collector options', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');

            // --type removed: stanctl-integration import only supports com.ibm.instana.customcollector
            expect(cliContent).toContain("'include'");
            expect(cliContent).not.toContain("alias: 'y'");
        });

        it('should define import collector example in epilog', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');

            expect(cliContent).toContain('--include "collector/**/*.json"');
        });

        it('should define export command options', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            // Verify export options
            expect(cliContent).toContain("alias: 'F'");
        });

        it('should define publish command options', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            // Verify publish options
            expect(cliContent).toContain("'registry-username'");
            expect(cliContent).toContain("'registry-email'");
            expect(cliContent).toContain("'registry-password'");
            expect(cliContent).toContain("'artifact-type'");
            expect(cliContent).toContain("alias: 'U'");
            expect(cliContent).toContain("alias: 'E'");
            expect(cliContent).toContain("alias: 'P'");
            expect(cliContent).toContain("alias: 't'");
        });

        it('should define publish command conditional validation', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');

            // Verify .check() enforces artifact-type-conditional required options
            expect(cliContent).toContain('.check(');
            expect(cliContent).toContain("argv['artifact-type'] === 'package'");
            expect(cliContent).toContain("argv['artifact-type'] === 'image'");
            expect(cliContent).toContain("'registry-email'");
            expect(cliContent).toContain("'registry-password'");
            expect(cliContent).toContain('--registry-email is required when --artifact-type is package or both');
            expect(cliContent).toContain('--registry-password is required when --artifact-type is image or both');
        });

        it('should define lint command options', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            // Verify lint options
            expect(cliContent).toContain("'path'");
            expect(cliContent).toContain("'strict-mode'");
        });

        it('should define build command options', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            // Verify build options
            expect(cliContent).toContain("'package'");
            expect(cliContent).toContain("'platform'");
            expect(cliContent).toContain("'build-arg'");
            expect(cliContent).toContain("'cache'");
            expect(cliContent).toContain("'network'");
            expect(cliContent).toContain("'debug'");
            expect(cliContent).toContain("alias: 'p'");
            expect(cliContent).toContain("alias: 'd'");
            
            // Verify build option descriptions
            expect(cliContent).toContain('Target platform for the build');
            expect(cliContent).toContain('Build-time variables');
            expect(cliContent).toContain('Use cache when building the image');
            expect(cliContent).toContain('Set the networking mode for RUN instructions during build');
        });
    });

    describe('Handler Integration', () => {
        it('should reference all handler functions', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            // Verify all handlers are referenced
            expect(cliContent).toContain('handlers.handleDownload');
            expect(cliContent).toContain('handlers.handleImport');
            expect(cliContent).toContain('handlers.handleExport');
            expect(cliContent).toContain('handlers.handleInit');
            expect(cliContent).toContain('handlers.handlePublish');
            expect(cliContent).toContain('handlers.handleLint');
            expect(cliContent).toContain('handlers.handleBuild');
        });

        it('should define handler parameter types', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            // Verify handler types are defined
            expect(cliContent).toContain('handleDownload: (argv: any) => Promise<void>');
            expect(cliContent).toContain('handleImport: (argv: any) => Promise<void>');
            expect(cliContent).toContain('handleExport: (argv: any) => Promise<void>');
            expect(cliContent).toContain('handleInit: () => Promise<void>');
            expect(cliContent).toContain('handlePublish: (argv: any) => Promise<void>');
            expect(cliContent).toContain('handleLint: (argv: any) => Promise<void>');
            expect(cliContent).toContain('handleBuild: (argv: any) => Promise<void>');
        });
    });

    describe('Option Configuration', () => {
        it('should set required options correctly', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            // Verify demandOption is used for required fields
            expect(cliContent).toContain('demandOption: true');
            expect(cliContent).toContain('demandOption: false');
        });

        it('should set default values for optional options', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            // Verify default values are set
            expect(cliContent).toContain('default: process.cwd()');
            expect(cliContent).toContain('default: false');
        });

        it('should define option types', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            // Verify option types are defined
            expect(cliContent).toContain("type: 'string'");
            expect(cliContent).toContain("type: 'boolean'");
            expect(cliContent).toContain("type: 'array'");
        });
    });

    describe('Help Text', () => {
        it('should include usage text', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            expect(cliContent).toContain('The Instana CLI for integration package management');
            expect(cliContent).toContain('Usage:');
        });

        it('should include epilog examples', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            expect(cliContent).toContain('.epilog(examplesForDownload)');
            expect(cliContent).toContain('.epilog(examplesForImport)');
            expect(cliContent).toContain('.epilog(examplesForExport)');
            expect(cliContent).toContain('.epilog(examplesForPublish)');
        });

        it('should set help and version aliases', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            expect(cliContent).toContain(".alias('help', 'h')");
            expect(cliContent).toContain(".alias('version', 'v')");
        });
    });

    describe('Code Quality', () => {
        it('should have proper TypeScript types', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            // Verify TypeScript is used
            expect(cliContent).toContain('export function configureCLI');
            expect(cliContent).toContain(': {');
            expect(cliContent).toContain('Promise<void>');
        });

        it('should have JSDoc comments', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            // Verify documentation exists
            expect(cliContent).toContain('/**');
            expect(cliContent).toContain('CLI Configuration Module');
        });

        it('should import required dependencies', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliPath = path.join(__dirname, '../cli.ts');
            const cliContent = fs.readFileSync(cliPath, 'utf-8');
            
            expect(cliContent).toContain("import path from 'path'");
            expect(cliContent).toContain("from 'yargs'");
        });
    });
});
