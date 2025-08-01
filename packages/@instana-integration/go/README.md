# @instana-integration/go

The Instana integration package used to support Go monitoring. Once you import this package into your Instana environment, you will be able to monitor Go runtime and the applications on various aspects by checking the dashboards, alerts, etc. included in this integration package.

## Dashboards

Below are the dashboards that are currently supported by this integration package.

| Dashboard Title       | Description                                                               |    
|-----------------------|---------------------------------------------------------------------------|
| Go Runtime Metrics    | Instana custom dashboard that displays runtime metrics for Go application |

## Metrics

### Semantic Conventions

The Go runtime metrics are obtained by OpenTelemetry auto-instrumentation:

```
import "go.opentelemetry.io/contrib/instrumentation/runtime"
err := runtime.Start(runtime.WithMinimumReadMemStatsInterval(time.Second))
if err != nil {
    log.Fatal(err)
}
```

Below are the Go runtime metrics that are currently supported by this integration package.

| Metrics Name                        | Description          | Unit   | 
|-------------------------------------|----------------------|--------|
| process.runtime.go.mem.heap_inuse   | Heap used            | Number |
| process.runtime.go.mem.heap.alloc   | Allocated memory     | Byte   |
| process.runtime.go.mem.heap.sys     | System heap          | Byte   |
| process.runtime.go.mem.heap.inuse   | Used heap            | Byte   |
| process.runtime.go.mem.heap.objects | Objects              | Byte   |
| process.runtime.go.goroutines       | Executed goroutines  | Number |


### Resource Attributes

Below are the resource attributes that are currently supported by this integration package.

| Attribute Key              | Type    |  Description                                                             | 
|----------------------------|---------|--------------------------------------------------------------------------|
| service.name               | string  | This attribute is used to describe the entity name.                      |
| service.instance.id        | string  | This attribute is used to describe the entity ID of the current object.  |

## Events

Below are the events that are currently supported by this integration package.

| Event Name                              | Description       |
|-----------------------------------------|-------------------|
| Context Deadline Exceeded Errors        | —                 |
| Go Heap Allocation Spike                | —                 |
| High CPU Utilization in Go Application  | —                 |
| High Goroutine Count                    | —                 |
| High Go Heap Usage                      | —                 |
| HTTP Connection Pool Exhaustion         | —                 |
| Go Memory Leak Detection                | —                 |

Note: The conditionValue is a reference value in event definitions. Please adjust this value based on your specific environment.

## Installation and Usage

With [Instana CLI for integration package management](https://github.com/instana/observability-as-code?tab=readme-ov-file#instana-cli-for-integration-package-management), you can manage the lifecycle of this package such as downloading the package and importing it into Instana.

Downloading the package:

```shell
$ stanctl-integration download --package @instana-integration/go
```

Importing the package into Instana:

```shell
$ stanctl-integration import --package @instana-integration/go \
  --server $INSTANA_SERVER \
  --token $API_TOKEN \
  --set servicename=$SERVICE_NAME \
  --set serviceinstanceid=$SERVICE_INSTANCE_ID
```

- INSTANA_SERVER: This is the base URL of an Instana tenant unit, e.g. https://test-example.instana.io, which is used by the CLI to communicate with Instana server for package lifecycle management.
- API_TOKEN: Requests against the Instana API require valid API tokens. The API token can be generated via the Instana user interface. For more information, please refers to [Instana documentation](https://www.ibm.com/docs/en/instana-observability/current?topic=apis-instana-rest-api#usage-of-api-token).
- SERVICE_NAME: Logical name of the service.
- SERVICE_INSTANCE_ID: The string ID of the service instance. The ID helps to distinguish instances of the same service that exist at the same time (e.g. instances of a horizontally scaled service).