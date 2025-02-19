# @instana-integration/python

The Instana integration package used to support Python monitoring. Once you import this package into your Instana environment, you will be able to monitor Python runtime and the applications on various aspects by checking the dashboards, alerts, etc. included in this integration package.

## Dashboards

Below are the dashboards that are currently supported by this integration package.

| Dashboard Title    | Description                    |
|----------------------------|-----------------------|
| Python Runtime Metrics   | Instana custom dashboard that displays runtime metrics for Python application |

## Metrics

### Semantic Conventions

The Python runtime metrics are obtained by OpenTelemetry auto-instrumentation:

```
pip install opentelemetry-instrumentation-system-metrics
```

Below are the Python runtime metrics that are currently supported by this integration package.

| Metrics Name               | Description                   | Unit   |
|----------------------------|-------------------------------|--------|
| process.runtime.cpython.context_switches   | Context switching            | Number |
| process.runtime.cpython.cpu.utilization    | CPU utilization          | Percentage   |
| process.runtime.cpython.thread_count       | Threads  | Number |
| process.runtime.cpython.cpu_time   | Time Spent     | S   |
| process.runtime.cpython.gc_count   | GC activity          | Number   |
| process.runtime.cpython.memory | Memory usage              | Byte   |
| system.disk.io       | I/O  | Number |
| system.network.io       | Events  | Number |


### Resource Attributes for Python Application

Below are the resource attributes that are currently supported by this integration package.

| Attribute Key              | Type |  Description           |
|----------------------------|-------|------------------------|
| service.name               | string  | This attribute is used to describe the entity name.    |
| service.instance.id        | string  | This attribute is used to describe the entity ID of the current object.  |

### Installation and Usage

With [Instana CLI for integration package management](https://github.com/instana/observability-as-code?tab=readme-ov-file#instana-cli-for-integration-package-management), you can manage the lifecycle of this package such as downloading the package and importing it into Instana.

Downloading the package:

```shell
$ stanctl-integration download --package @instana-integration/python
```

Importing the package into Instana:

```shell
$ stanctl-integration import --package @instana-integration/python \
  --server $INSTANA_SERVER \
  --token $API_TOKEN \
  --set servicename=$SERVICE_NAME \
  --set serviceinstanceid=$SERVICE_INSTANCE_ID
```

- INSTANA_SERVER: This is the base URL of an Instana tenant unit, e.g. https://test-example.instana.io, which is used by the CLI to communicate with Instana server for package lifecycle management.
- API_TOKEN: Requests against the Instana API require valid API tokens. The API token can be generated via the Instana user interface. For more information, please refers to [Instana documentation](https://www.ibm.com/docs/en/instana-observability/current?topic=apis-instana-rest-api#usage-of-api-token).
- SERVICE_NAME: Logical name of the service.
- SERVICE_INSTANCE_ID: The string ID of the service instance. The ID helps to distinguish instances of the same service that exist at the same time (e.g. instances of a horizontally scaled service).
