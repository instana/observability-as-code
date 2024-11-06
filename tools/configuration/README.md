# The Instana CLI for Configuration Package Management

The Instana CLI for Configuration Package Management is used to manage the lifecycle of Instana configuration package. For example, you can use this CLI to download the configuration package from public website to your local machine, then install the package into an existing Instana environment.

## For end users

### Download the CLI

You can find the available binaries for the CLI on different platforms on the release page of this project. Select the one that matches your platform to download, then rename it to `stanctl-configuration`. Now you should be able to run it on your local machine.

### Run the CLI

Simply run:
```console
stanctl-configuration
```

It will show you the help information, including all available commands and flags. For each command, run:
```console
stanctl-configuration <command>
```

It will show the help information for the specific command to tell you how to run it.

## For developers

### Build the source code

Clone this project to your local machine and go into the CLI root directory:

```console
git clone https://github.com/instana/observability-as-code.git
cd tools/configuration
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
stanctl-configuration-linux
stanctl-configuration-macos
stanctl-configuration-win.exe
```

Choose the one that matches your platform and rename it to `stanctl-configuration`, then you should be able to run it as a normal executable.

### Run the CLI

To run the CLI against the output built from the source code, please run:
```console
npm link
```

Then, you should be able to run the CLI from any place:

```console
stanctl-configuration
```

To run the CLI using the binary executable, you can go to `dist` directory, and select the one that matches your platform, e.g., on MacOS, please run:

```console
./stanctl-configuration-macos
```
