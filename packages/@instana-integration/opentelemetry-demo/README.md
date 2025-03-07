# @instana-integration/opentelemetry-demo

The Instana integration package used to demonstrate the monitoring of the OpenTelemetry demo application, an [Instana version](https://github.com/instana/opentelemetry-demo) of the opentelemetry-demo project forked from [community](https://github.com/open-telemetry/opentelemetry-demo).

## Dashboards

Below are the dashboards that are currently supported by this integration package.

| Dashboard Title    | Service   |  Programming Language     |
|-------------------|--------|-----------------------|
| OpenTelemetry Demo - Go Runtime Metrics   | checkout | Go          |
| OpenTelemetry Demo - Node.js Runtime Metrics   | payment | Node.js   |

## Metrics

### Semantic Conventions

### Resource Attributes

Below are the resource attributes that are currently supported by this integration package.

| Attribute Key              | Type |  Description           |
|----------------------------|-------|------------------------|
| service.instance.id        | string  | This attribute is used to describe the entity ID of the current object.  |

## Installation and Usage

With [Instana CLI for integration package management](https://github.com/instana/observability-as-code?tab=readme-ov-file#instana-cli-for-integration-package-management), you can manage the lifecycle of this package such as downloading the package and importing it into Instana.

Downloading the package:

```shell
$ stanctl-integration download --package @instana-integration/opentelemetry-demo
```

Importing the package into Instana:

```shell
$ stanctl-integration import --package @instana-integration/opentelemetry-demo \
  --server $INSTANA_SERVER \
  --token $API_TOKEN \
  --set serviceinstanceid=$SERVICE_INSTANCE_ID
```

- INSTANA_SERVER: This is the base URL of a tenant unit, e.g. https://test-example.instana.io. This is the same URL that is used to access the Instana user interface.
- API_TOKEN: Requests against the Instana API require valid API tokens. The API token can be generated via the Instana user interface. For more information, please refers to [Instana documentation](https://www.ibm.com/docs/en/instana-observability/current?topic=apis-instana-rest-api#usage-of-api-token).
- SERVICE_INSTANCE_ID: The string ID of the service instance. The ID helps to distinguish instances of the same service that exist at the same time (e.g. instances of a horizontally scaled service).
