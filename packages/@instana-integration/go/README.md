# @instana-integration/go


The integration package is used to support Go monitoring. Once you import this package into your Instana environment, you will be able to monitor Go runtime and the applications on various aspects by checking the dashboards, alerts, etc. included in this integration package.

## Dashboards


| Dashboard Name    | Description                    |    
|----------------------------|-----------------------|
| Runtime metrics   | Instana customer dashboard that displays runtime metrics of a Go application |

### Go Runtime Metrics

### Semantic Conventions for Go Runtime Metrics

The go runtime metrics are obtained by opentelemetry auto-instrumentation:

```
import "go.opentelemetry.io/contrib/instrumentation/runtime"
err := runtime.Start(runtime.WithMinimumReadMemStatsInterval(time.Second))
if err != nil {
    log.Fatal(err)
}
```


| Metrics Name               | Description                   | Unit   | 
|----------------------------|-------------------------------|--------|
| process.runtime.go.mem.heap_inuse   | Heap Used            | NUMBER |
| process.runtime.go.mem.heap.alloc   | Allocated Memory     | Byte   |
| process.runtime.go.mem.heap.sys     | System Heap          | Byte   |
| process.runtime.go.mem.heap.inuse   | Used Heap            | Byte   |
| process.runtime.go.mem.heap.objects | Objects              | Byte   |
| process.runtime.go.goroutines       | Executed Goroutines  | NUMBER |


### Resource attributes for Go application

| Attribute Key              | Type |  Description           | 
|----------------------------|-------|------------------------|
| service.name               | string  | This attribute is used to describe the entity name.    |
| service.instance.id        | string  | This attribute is used to describe the entity ID of the current object.  |
