# Instana Observability as Code CLI

## Build the CLI

Run git clone to download this repository and go into the CLI folder:

```console
git clone https://github.com/instana/observability-as-code.git
cd tools/cli
```

Build the source code:

```console
npm install -g ts-node
npm run build
```

Build the executable:

```console
npm install -g pkg
npm run pkg
```

## Run the CLI

To run the CLI from the command line directly based on the node.js output built from the source code:

```console
npm link
```

Then, you can run the CLI from any place:

```console
stanctl-ex
```

Alternatively, go to build directory, and run:

```console
./stanctl-ex
```

This uses the executable built by `pkg`.
