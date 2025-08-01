# @instana-integration/python

The Instana integration package used to support Python monitoring. Once you import this package into your Instana environment, you will be able to monitor Python runtime and the applications on various aspects by checking the dashboards, alerts, etc. included in this integration package.

## Dashboards

Below are the dashboards that are currently supported by this integration package.

| Dashboard Title        | Description                                                                   |
|------------------------|-------------------------------------------------------------------------------|
| Python Runtime Metrics | Instana custom dashboard that displays runtime metrics for Python application |

## Metrics

### Semantic Conventions

The Python runtime metrics are obtained by OpenTelemetry auto-instrumentation:

```
pip install opentelemetry-instrumentation-system-metrics
```

Below are the Python runtime metrics that are currently supported by this integration package.

| Metrics Name                             | Description       | Unit       |
|------------------------------------------|-------------------|------------|
| process.runtime.cpython.context_switches | Context switching | Number     |
| process.runtime.cpython.cpu.utilization  | CPU utilization   | Percentage |
| process.runtime.cpython.thread_count     | Threads           | Number     |
| process.runtime.cpython.cpu_time         | Time Spent        | S          |
| process.runtime.cpython.gc_count         | GC activity       | Number     |
| process.runtime.cpython.memory           | Memory usage      | Byte       |
| system.disk.io                           | I/O               | Number     |
| system.network.io                        | Events            | Number     |


### Resource Attributes

Below are the resource attributes that are currently supported by this integration package.

| Attribute Key        | Type   | Description                                                             |
|----------------------|--------|-------------------------------------------------------------------------|
| service.name         | string | This attribute is used to describe the entity name.                     |
| service.instance.id  | string | This attribute is used to describe the entity ID of the current object. |

## Events

Below are the events that are currently supported by this integration package.

Note: In each event definition, conditionValue represents a threshold used to trigger the event and is provided as a default or reference value. Please adjust this value based on your specific environment.

| Event Name                                        | Description                                                                                                                                                                              |
|---------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Excessive Context Switching in Python Application | Detects when a Python application is experiencing an unusually high rate of context switches, which may indicate thread contention, inefficient concurrency patterns, or CPU saturation. |
| Frequent Garbage Collection in Python Application | Detects when a Python application is triggering garbage collection too frequently, which may indicate memory management issues or inefficient object creation and destruction patterns.  |
| High CPU Utilization in Python Application        | Detects when a Python application is consuming an unusually high amount of CPU resources, which may indicate inefficient code, infinite loops, or excessive processing.                  |
| High Disk I/O in Python Application               | Detects when a Python application is performing an unusually high volume of disk I/O operations, which may indicate inefficient file operations, excessive logging, or database issues.  |
| High Memory Usage in Python Application           | Detects when a Python application is using an unusually high amount of memory, which may indicate memory leaks, inefficient data structures, or excessive caching.                       |
| High Network I/O in Python Application            | Detects when a Python application is generating an unusually high volume of network traffic, which may indicate inefficient API calls, excessive data transfer, or potential data leaks. |
| High Thread Count in Python Application           | Detects when a Python application is creating an unusually high number of threads, which may lead to resource contention, degraded performance, or system instability.                   |
| Memory Leak Detection in Python Application       | Detects potential memory leaks in Python applications by monitoring continuously increasing memory usage over time with minimal garbage collection impact.                               |

## Installation and Usage

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