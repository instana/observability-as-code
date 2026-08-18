import { execSync, spawn } from 'child_process';

import fs from 'fs';
import logger from './logger';
import path from 'path';

/**
 * Generic filter function for filtering objects by conditions
 * Supports filtering by: title, name, label, ownerid, annotation, id
 */
export const filterElementsBy = (objects: any[], conditions: string[]): any[] => {
    return objects.filter(obj => {
        return conditions.every(condition => {
            const [key, rawValue] = condition.split('=');
            const value = rawValue?.replace(/^"|"$/g, '');
            
            // Handle different filter keys - check all possible name/title/label properties
            if (key === 'title' || key === 'name' || key === 'label') {
                const titleMatch = new RegExp(value, 'i').test(obj.title ?? '');
                const nameMatch = new RegExp(value, 'i').test(obj.name ?? '');
                const labelMatch = new RegExp(value, 'i').test(obj.data?.label ?? '');
                return titleMatch || nameMatch || labelMatch;
            } else if (key === 'ownerid') {
                return new RegExp(value, 'i').test(obj.ownerId ?? '');
            } else if (key === 'annotation') {
                return (obj.annotations ?? []).includes(value);
            } else if (key === 'id') {
                return obj.id === value;
            }
            return false;
        });
    });
};

/**
 * Promisify spawn for async/await usage
 */
export const spawnAsync = (command: any, args: any, options: any) => {
    return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        const { input, ...spawnOptions } = options;
        const child = spawn(command, args, spawnOptions);
        if (input !== undefined && child.stdin) {
            child.stdin.write(input);
            child.stdin.end();
        }
        let stdout = '';
        let stderr = '';
        if (child.stdout) {
            child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
        }
        if (child.stderr) {
            child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
        }
        child.on('close', (code) => {
            if (code !== 0) {
                const output = [stderr, stdout].filter(s => s.trim()).join('\n');
                const detail = output ? `\n${output}` : '';
                reject(new Error(`Command failed with exit code ${code}${detail}`));
            } else {
                resolve({ stdout, stderr });
            }
        });
        child.on('error', reject);
    });
};

/**
 * Detect available container runtime (docker or podman)
 */
export function detectContainerRuntime(): string {
    const runtimes = ['docker', 'podman'];
    for (const runtime of runtimes) {
        try {
            execSync(`${runtime} version`, { stdio: 'pipe', timeout: 5000 });
            logger.info(`Detected container runtime: ${runtime}`);
            return runtime;
        } catch (error) {
            continue;
        }
    }
    throw new Error(
        'No container runtime detected. Please install Docker or Podman and ensure the daemon is running.\n' +
        'Docker: https://docs.docker.com/get-docker/\n' +
        'Podman: https://podman.io/getting-started/installation'
    );
}

/**
 * Check if a path exists
 */
export const pathExists = (filePath: string): boolean => {
    try {
        return fs.existsSync(filePath);
    } catch (err) {
        return false;
    }
};

/**
 * Read and parse package.json file
 */
export const readPackageJson = (filePath: string): any => {
    try {
        const packageJson = fs.readFileSync(path.join(filePath, 'package.json'), 'utf8');
        return JSON.parse(packageJson);
    } catch (error) {
        logger.error('Failed to read the package.json:', error);
        return null;
    }
};

/**
 * Read README.md file
 */
export const readReadmeFile = (directoryPath: string): string | null => {
    const readmeFilePath = path.join(directoryPath, 'README.md');
    try {
        if (fs.existsSync(readmeFilePath)) {
            return fs.readFileSync(readmeFilePath, 'utf8');
        } else {
            logger.error(`README.md is missing in the directory: ${directoryPath}`);
            return null;
        }
    } catch (error) {
        logger.error('Failed to read README.md.');
        return null;
    }
};

/**
 * Check if the package is private
 */
export function isPrivatePackage(packageData: any): boolean {
    return packageData.private === true;
}

/**
 * Check if user is logged into npm
 */
export async function isUserLoggedIn(): Promise<boolean> {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const npmrcPath = path.join(homeDir, '.npmrc');
    if (fs.existsSync(npmrcPath)) {
        const npmrcContent = fs.readFileSync(npmrcPath, 'utf-8');
        return npmrcContent.includes('//registry.npmjs.org/:_authToken=');
    }
    return false;
}

/**
 * Sanitize file name by removing special characters
 */
export function sanitizeFileName(name: string): string {
    if (!name) return 'untitled';
    return name.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
}

/**
 * Get value by key from array of key=value strings
 */
export function getValueByKeyFromArray(array: string[], key: string): string | undefined {
    const prefix = `${key}=`;
    return array.find(item => item.startsWith(prefix))?.substring(prefix.length);
}

/**
 * Parse include item string into array of tokens
 */
export function parseIncludeItem(item: string): string[] {
    const result: string[] = [];
    let buffer = '';
    let inQuotes = false;

    for (let i = 0; i < item.length; i++) {
        const char = item[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ' ' && !inQuotes) {
            if (buffer.length > 0) {
                result.push(buffer);
                buffer = '';
            }
        } else {
            buffer += char;
        }
    }

    if (buffer.length > 0) {
        result.push(buffer);
    }

    return result;
}

/**
 * Sanitize titles and handle duplicates
 */
export function sanitizeTitles<T extends { id: string; title?: string; name?: string }>(
    idObjects: T[],
    fallbackPrefix: string
): T[] {
    const titleMap: { [key: string]: number } = {};
    return idObjects.map(obj => {
        const fallback = obj.name || `${fallbackPrefix}-${obj.id}`;
        const baseTitle = sanitizeFileName(obj.title || fallback);
        let newTitle = baseTitle;

        if (titleMap[baseTitle]) {
            titleMap[baseTitle]++;
            newTitle = `${baseTitle}_${titleMap[baseTitle]}`;
        } else {
            titleMap[baseTitle] = 1;
        }

        return { ...obj, title: newTitle };
    });
}

/**
 * Parse includes from command line arguments
 */
export function parseIncludesFromArgv(argv: string[]): Array<{
    type: string;
    conditions: string[];
    explicitlyTyped: boolean;
}> {
    const result: Array<{ type: string; conditions: string[]; explicitlyTyped: boolean }> = [];
    let i = 0;

    while (i < argv.length) {
        if (argv[i] === '--include' || argv[i] === '-F') {
            i++;
            if (i >= argv.length) break;

            // Collect all tokens until we hit another flag (starts with --)
            const tokens: string[] = [];
            while (i < argv.length && !argv[i].startsWith('--') && !argv[i].startsWith('-')) {
                tokens.push(argv[i]);
                i++;
            }
            
            // Don't increment i again since we already moved past the tokens
            i--;

            let type = 'all';
            let explicitlyTyped = false;
            const conditions: string[] = [];

            for (const token of tokens) {
                if (token.startsWith('type=')) {
                    type = token.substring(5).replace(/^"|"$/g, '');
                    explicitlyTyped = true;
                } else {
                    conditions.push(token);
                }
            }

            result.push({ type, conditions, explicitlyTyped });
        }
        i++;
    }

    if (result.length === 0) {
        result.push({ type: 'all', conditions: [], explicitlyTyped: false });
    }

    return result;
}

/**
 * Print directory tree structure
 */
export function printDirectoryTree(dirPath: string, rootLabel: string, indent: string = ''): void {
    const isRoot = indent === '';
    if (isRoot) {
        logger.info(rootLabel);
    }

    const files = fs.readdirSync(dirPath);
    const lastIndex = files.length - 1;

    files.forEach((file, index) => {
        const fullPath = path.join(dirPath, file);
        const isDirectory = fs.statSync(fullPath).isDirectory();
        const isLast = index === lastIndex;
        const prefix = isLast ? '└── ' : '├── ';

        logger.info(indent + prefix + file);
        if (isDirectory) {
            const newIndent = indent + (isLast ? '    ' : '│   ');
            printDirectoryTree(fullPath, rootLabel, newIndent);
        }
    });
}

/**
 * Generate README.md file content
 */
export function generateReadme(packagePath: string, packageName: string, configTypes: string[]): void {
    let readmeContent = `# ${packageName}

(Note: Write your package description here.)
`;

    if (configTypes.includes('collector')) {
        readmeContent += `
## Collector

Below are the collectors that are currently supported by this integration package.
`;

    }

    if (configTypes.includes('dashboards')) {
        readmeContent += `
## Dashboards

Below are the dashboards that are currently supported by this integration package.

(Note: Replace the sample entries below with actual dashboards defined in your package.)

| Dashboard Title        | Description                                                |
|------------------------|------------------------------------------------------------|
| <dashboard_title>      | Brief description of what this dashboard displays.         |
`;
    }

    readmeContent += `
## Metrics

### Semantic Conventions

Below are the runtime metrics that are currently supported by this integration package.

(Note: Replace the sample entries below with actual metrics for your package.)

| Metric Name             | Description                      | Unit    |
|-------------------------|----------------------------------|---------|
| <metric.name.example1>  | Description of the metric        | <unit>  |
| <metric.name.example2>  | Description of another metric    | <unit>  |

### Resource Attributes

Below are the resource attributes that are currently supported by this integration package.

(Note: Replace with the actual resource attributes relevant to your package.)

| Attribute Key                    | Type   | Description                                      |
|----------------------------------|--------|--------------------------------------------------|
| <resource.attribute.key1>        | string | Describes the entity name or other identifier    |
| <resource.attribute.key2>        | string | Further identifies or qualifies the entity       |
`;

    if (configTypes.includes('events')) {
        readmeContent += `
## Events

Below are the events that are currently supported by this integration package.

(Note: Replace the sample entries below with actual events from your package.)

| Event Name               | Description                       |
|--------------------------|---------------------------------  |
| <event.name.example1>    | Triggered when condition X occurs |
| <event.name.example2>    | Triggered when condition Y occurs |
`;
    }

    if (configTypes.includes('entities')) {
        readmeContent += `
## Entities

Below are the entities that are currently supported by this integration package.

(Note: Repeat the following structure for each entity in your package.)

### Entity: <Entity Label>

(Note: Write your entity description here.)

#### Dashboards

| Dashboard Title        | Description                                         |
|------------------------|-----------------------------------------------------|
| <dashboard_title>      | Describe the dashboard linked to this entity.       |

#### Metrics

| Metric Name             | Description                          | Unit   |
|-------------------------|------------------------------------- |--------|
| <metric.name.example1>  | What the metric tracks               | <unit> |
| <metric.name.example2>  | Another metric for this entity       | <unit> |

#### Dependencies

| Related Entity          | Description of Relationship                                     |
|-------------------------|-----------------------------------------------------------------|
| <related_entity_label>  | Explain how this entity depends on or relates to another entity |
`;
    }

	if (configTypes.includes('smart-alerts')) {
        readmeContent += `
## Smart Alerts

Below are the smart alerts that are currently supported by this integration package.

(Note: Replace the sample entries below with actual smart alerts from your package.)

| Smart Alerts Name              | Description                       |
|-----------------------------------------------|---------------------------------  |
| <smart.alert.name.example1>    | Triggered when condition X occurs |
| <smart.alert.name.example2>    | Triggered when condition Y occurs |
`;
    }

    readmeContent += `
## Installation and Usage

With [Instana CLI for integration package management](https://github.com/instana/observability-as-code?tab=readme-ov-file#instana-cli-for-integration-package-management), you can manage the lifecycle of this package, such as downloading the package and importing it into Instana. You can find the available binaries for the CLI on different platforms on the [release page of this project](https://github.com/instana/observability-as-code/releases). Select the binary from the latest release that matches your platform to download, then rename it to instana-integration. You should now be able to run it on your local machine.

Downloading the package:

\`\`\`shell
$ instana-integration download --package ${packageName}
\`\`\`

Importing the package into Instana:

\`\`\`shell
$ instana-integration import --package ${packageName} \\
  --server $INSTANA_SERVER \\
  --token $API_TOKEN \\
  --set servicename=$SERVICE_NAME \\
  --set serviceinstanceid=$SERVICE_INSTANCE_ID
\`\`\`

- INSTANA_SERVER: This is the base URL of an Instana tenant unit, e.g. https://test-example.instana.io, which is used by the CLI to communicate with Instana server for package lifecycle management.
- API_TOKEN: Requests against the Instana API require valid API tokens. The API token can be generated via the Instana user interface. For more information, please refer to [Instana documentation](https://www.ibm.com/docs/en/instana-observability/current?topic=apis-instana-rest-api#usage-of-api-token).
- SERVICE_NAME: Logical name of the service.
- SERVICE_INSTANCE_ID: The string ID of the service instance. The ID helps to distinguish instances of the same service that exist at the same time (e.g. instances of a horizontally scaled service).
`;

    const readmeFilePath = path.join(packagePath, 'README.md');
    fs.writeFileSync(readmeFilePath, readmeContent);
    logger.info(`Created the package README file at ${readmeFilePath}`);
}

/**
 * Generate collector template files
*/
export function generateCollectorFiles(packagePath: string, packageName: string, configTypes: string[]) {
    const normalizedPackageName = packageName
        .replace(/^@instana-integration\//, '')
        .split('/')
        .filter(Boolean)
        .join('_');

    const targetDir = path.join(packagePath, 'collector');
    const configDir = path.join(packagePath, 'collector', 'config');
    const templatesDir = __dirname.includes('/dist')
        ? path.join(__dirname, '..', 'src', 'templates', 'collector')
        : path.join(__dirname, 'templates', 'collector');

    // Dockerfile template
    let dockerfileContent = fs.readFileSync(path.join(templatesDir, 'Dockerfile'), 'utf-8');
    dockerfileContent = dockerfileContent.replace(/\{\{COLLECTOR_NAME\}\}/g, normalizedPackageName);
    fs.writeFileSync(path.join(targetDir, 'Dockerfile'), dockerfileContent);
    
    // collector file template
    const collectorContent = fs.readFileSync(path.join(templatesDir, 'collector.py'), 'utf-8');
    fs.writeFileSync(path.join(targetDir, `${normalizedPackageName}_collector.py`), collectorContent);
    
    // requirements.txt template
    const requirementsContent = fs.readFileSync(path.join(templatesDir, 'requirements.txt'), 'utf-8');
    fs.writeFileSync(path.join(targetDir, 'requirements.txt'), requirementsContent);
    
    // config.json template
    fs.mkdirSync(configDir, { recursive: true });
    let configContent = fs.readFileSync(path.join(templatesDir, 'config', 'config.json'), 'utf-8');
    const createdAt = new Date().toISOString();
    configContent = configContent.replace(/\{\{PACKAGE_NAME\}\}/g, normalizedPackageName);
    configContent = configContent.replace(/\{\{PACKAGE_NAME_LOWER\}\}/g, normalizedPackageName.toLowerCase());
    configContent = configContent.replace(/\{\{CREATED_AT\}\}/g, createdAt);
    fs.writeFileSync(path.join(configDir, 'config.json'), configContent);
}
