# @instana-integration/opentelemetry-demo

The Instana integration package used to demonstrate the monitoring of the OpenTelemetry demo application, an [Instana version](https://github.com/instana/opentelemetry-demo) of the opentelemetry-demo project forked from [community](https://github.com/open-telemetry/opentelemetry-demo).

## Dashboards

Below are the dashboards that are currently supported by this integration package.

| Dashboard Title    | Service   |  Programming Language     |
|-------------------|--------|-----------------------|
| OpenTelemetry Demo - Go Runtime Metrics   | checkout | Go          |
| OpenTelemetry Demo - Node.js Runtime Metrics   | payment | Node.js   |

## Installation and Usage

With [Instana CLI for integration package management](https://github.com/instana/observability-as-code?tab=readme-ov-file#instana-cli-for-integration-package-management), you can manage the lifecycle of this package by downloading and importing into Instana.

Downloading the package:

```shell
$ stanctl-integration download --package @instana-integration/opentelemetry-demo
```

Importing the dashboard into Instana:

```shell
$ stanctl-integration import --package @instana-integration/opentelemetry-demo \
  --server $INSTANA_SERVER \
  --token $API_TOKEN \
  --set serviceinstanceid=$SERVICE_INSTANCE_ID
```
