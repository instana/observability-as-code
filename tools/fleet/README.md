# The Instana CLI for Agent Fleet Management

The Instana CLI provides fleet management for agent instances including Instana agents, IDOTs (Instana Distro of OpenTelemetry Collectors), Instana Custom Collectors based on OpenTelemetry. For example, you can use it to restart agent instances, configure or update agent configurations, etc.

## Requirements

### For Binary Users
- No Node.js installation required. The binary includes an embedded Node.js 18 runtime.

### For Developers
- Node.js 18 or higher is required when running from source code.

## For end users

### Download the CLI

You can find the available binaries for the CLI on different platforms on the [release page of this project](https://github.com/instana/observability-as-code/releases). Select the binary from the latest release that matches your platform to download, then rename it to `instana-fleet`. You should now be able to run it on your local machine.

### Run the CLI

Simply run:
```console
instana-fleet
```

It will show you the help information, including all available commands and flags. For each command, run:
```console
instana-fleet <command>
```

It will show the help information for the specific command to tell you how to run it.

## For developers

### Build the source code

Clone this project to your local machine and go into the CLI root directory:

```console
git clone https://github.com/instana/observability-as-code.git
cd observability-as-code/tools/fleet
```

Install the prerequisites:
```console
npm install -g ts-node
npm install -g pkg
npm install -g typescript
```

Install node modules:

```console
npm install
```

To build the source code, please run:

```console
npm run build
```

Then you will find the output in the `dist` directory.

If you want to build the binary executable and test on your local machine, please run:
```console
npm run pkg
```

Then you will find the binaries for all platforms in the `dist` directory, e.g.:
```console
instana-fleet-linux
instana-fleet-macos
instana-fleet-win.exe
```

Choose the one that matches your platform and rename it to `instana-fleet`, then you should be able to run it as a normal executable.

### Run the CLI

To run the CLI against the output built from the source code, please run:
```console
npm link
```

Then, you should be able to run the CLI from any place:

```console
instana-fleet
```

To run the CLI using the binary executable, you can go to `dist` directory, and select the one that matches your platform, e.g., on MacOS, please run:

```console
./instana-fleet-macos
```
