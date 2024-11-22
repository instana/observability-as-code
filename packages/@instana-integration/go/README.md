# @instana-integration/go

The Instana integration package used to support Go monitoring. Once you import this package into your Instana environment, you will be able to monitor Go runtime and the applications on various aspects by checking the dashboards, alerts, etc. included in this integration package.

## Dashboards

Below are the dashboards that are currently supported by this integration package.

| Dashboard Title    | Description                    |    
|----------------------------|-----------------------|
| Go Runtime Metrics   | Instana custom dashboard that displays runtime metrics for Go application |

## Go Runtime Metrics

### Semantic Conventions for Go Runtime Metrics

The Go runtime metrics are obtained by OpenTelemetry auto-instrumentation:

```
import "go.opentelemetry.io/contrib/instrumentation/runtime"
err := runtime.Start(runtime.WithMinimumReadMemStatsInterval(time.Second))
if err != nil {
    log.Fatal(err)
}
```

Below are the Go runtime metrics that are currently supported by this integration package.

| Metrics Name               | Description                   | Unit   | 
|----------------------------|-------------------------------|--------|
| process.runtime.go.mem.heap_inuse   | Heap used            | Number |
| process.runtime.go.mem.heap.alloc   | Allocated memory     | Byte   |
| process.runtime.go.mem.heap.sys     | System heap          | Byte   |
| process.runtime.go.mem.heap.inuse   | Used heap            | Byte   |
| process.runtime.go.mem.heap.objects | Objects              | Byte   |
| process.runtime.go.goroutines       | Executed goroutines  | Number |


### Resource Attributes for Go Application

Below are the resource attributes that are currently supported by this integration package.

| Attribute Key              | Type |  Description           | 
|----------------------------|-------|------------------------|
| service.name               | string  | This attribute is used to describe the entity name.    |
| service.instance.id        | string  | This attribute is used to describe the entity ID of the current object.  |

### Installation and Usage

With Instana CLI [stanctl-integration](https://github.com/instana/observability-as-code) for integration package management, you can manage the lifecycle of this package by downloading and importing into Instana.

Downloading the package:

```shell
$ stanctl-integration download --package @instana-integration/go
```

Importing the dashboard into Instana:

```shell
$ stanctl-integration import --package @instana-integration/go \
  --server $INSTANA_SERVER \
  --token $API_TOKEN \
  --set servicename=$SERVICE_NAME \
  --set serviceinstanceid=$SERVICE_INSTANCE_ID
```
