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
        it('should accept handlers object with handleRestart and handleDeploy', async () => {
            const module = await import('../cli');
            expect(typeof module.configureCLI).toBe('function');
        });

        it('should be a function that accepts handlers', async () => {
            const module = await import('../cli');
            const { configureCLI } = module;
            expect(typeof configureCLI).toBe('function');
            expect(configureCLI.name).toBe('configureCLI');
        });
    });

    describe('CLI Configuration Constants', () => {
        it('should contain example text for all commands', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliContent = fs.readFileSync(path.join(__dirname, '../cli.ts'), 'utf-8');

            expect(cliContent).toContain('examplesForRestart');
            expect(cliContent).toContain('examplesForDeploy');
            expect(cliContent).toContain('examplesForUpdate');
            expect(cliContent).toContain('examplesForList');
            expect(cliContent).toContain('Examples:');
        });

        it('should define all command names', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliContent = fs.readFileSync(path.join(__dirname, '../cli.ts'), 'utf-8');

            expect(cliContent).toContain("'restart'");
            expect(cliContent).toContain("'deploy'");
            expect(cliContent).toContain("'update-config'");
            expect(cliContent).toContain("'list'");
        });

        it('should define command descriptions', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliContent = fs.readFileSync(path.join(__dirname, '../cli.ts'), 'utf-8');

            expect(cliContent).toContain('Restart the agent instances');
            expect(cliContent).toContain('Deploy the agent component');
            expect(cliContent).toContain('Update the agent configuration');
            expect(cliContent).toContain('List available resources');
        });

        it('should configure yargs with proper settings', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliContent = fs.readFileSync(path.join(__dirname, '../cli.ts'), 'utf-8');

            expect(cliContent).toContain('.wrap(160)');
            expect(cliContent).toContain('.usage(');
            expect(cliContent).toContain('.command(');
            expect(cliContent).toContain('.demandCommand(');
            expect(cliContent).toContain('.help()');
            expect(cliContent).toContain('.version()');
            expect(cliContent).toContain('.parse()');
        });
    });

    describe('Command Options', () => {
        it('should define restart command options without group', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliContent = fs.readFileSync(path.join(__dirname, '../cli.ts'), 'utf-8');

            expect(cliContent).toContain("'server'");
            expect(cliContent).toContain("'token'");
            expect(cliContent).toContain("'type'");
            expect(cliContent).toContain("'tag'");
            expect(cliContent).toContain("'debug'");
            expect(cliContent).not.toContain("'group'");
        });

        it('should define configurationId option for deploy command', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliContent = fs.readFileSync(path.join(__dirname, '../cli.ts'), 'utf-8');

            expect(cliContent).toContain("'configuration-id'");
        });

        it('should define resource option for list command', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliContent = fs.readFileSync(path.join(__dirname, '../cli.ts'), 'utf-8');

            expect(cliContent).toContain("'resource'");
            expect(cliContent).toContain("choices: ['configuration']");
        });

        it('should mark --tag as required for restart', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliContent = fs.readFileSync(path.join(__dirname, '../cli.ts'), 'utf-8');

            expect(cliContent).toContain('demandOption: true');
        });
    });

    describe('Handler Integration', () => {
        it('should reference all handler functions', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliContent = fs.readFileSync(path.join(__dirname, '../cli.ts'), 'utf-8');

            expect(cliContent).toContain('handlers.handleRestart');
            expect(cliContent).toContain('handlers.handleDeploy');
            expect(cliContent).toContain('handlers.handleUpdate');
            expect(cliContent).toContain('handlers.handleList');
        });

        it('should define all handler parameter types', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliContent = fs.readFileSync(path.join(__dirname, '../cli.ts'), 'utf-8');

            expect(cliContent).toContain('handleRestart: (argv: any) => Promise<void>');
            expect(cliContent).toContain('handleDeploy: (argv: any) => Promise<void>');
            expect(cliContent).toContain('handleUpdate: (argv: any) => Promise<void>');
            expect(cliContent).toContain('handleList: (argv: any) => Promise<void>');
        });
    });

    describe('Option Configuration', () => {
        it('should define option types', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliContent = fs.readFileSync(path.join(__dirname, '../cli.ts'), 'utf-8');

            expect(cliContent).toContain("type: 'string'");
            expect(cliContent).toContain("type: 'boolean'");
            expect(cliContent).toContain("type: 'array'");
        });
    });

    describe('Help Text', () => {
        it('should include usage text', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliContent = fs.readFileSync(path.join(__dirname, '../cli.ts'), 'utf-8');

            expect(cliContent).toContain('The Instana CLI for agent fleet management');
            expect(cliContent).toContain('Usage:');
        });

        it('should include epilog for all commands', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliContent = fs.readFileSync(path.join(__dirname, '../cli.ts'), 'utf-8');

            expect(cliContent).toContain('.epilog(examplesForRestart)');
            expect(cliContent).toContain('.epilog(examplesForDeploy)');
            expect(cliContent).toContain('.epilog(examplesForUpdate)');
            expect(cliContent).toContain('.epilog(examplesForList)');
        });

        it('should set help and version aliases', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliContent = fs.readFileSync(path.join(__dirname, '../cli.ts'), 'utf-8');

            expect(cliContent).toContain(".alias('help', 'h')");
            expect(cliContent).toContain(".alias('version', 'v')");
        });
    });

    describe('Code Quality', () => {
        it('should have proper TypeScript types', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliContent = fs.readFileSync(path.join(__dirname, '../cli.ts'), 'utf-8');

            expect(cliContent).toContain('export function configureCLI');
            expect(cliContent).toContain('Promise<void>');
        });

        it('should import required dependencies', async () => {
            const fs = require('fs');
            const path = require('path');
            const cliContent = fs.readFileSync(path.join(__dirname, '../cli.ts'), 'utf-8');

            expect(cliContent).toContain("import path from 'path'");
            expect(cliContent).toContain("import yargs from 'yargs'");
        });
    });
});
