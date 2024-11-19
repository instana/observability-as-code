# @instana-integration/nodejs

The integration package is used to support NodeJS monitoring. Once you import this package into your Instana environment, you will be able to monitor NodeJS runtime and the applications on various aspects by checking the dashboards, alerts, etc. included in this integration package.

## Dashboards


| Dashboard Name    | Description                    |    
|----------------------------|-----------------------|
| Runtime metrics   | Instana customer dashboard that displays runtime metrics of a NodeJS application |

### NodeJS Runtime Metrics

### Semantic Conventions for NodeJS Runtime Metrics

The NodeJS runtime metrics are obtained by opentelemetry auto-instrumentation:

```
const {RuntimeNodeInstrumentation} = require('@opentelemetry/instrumentation-runtime-node')

const sdk = new NodeSDK({
  ...
  instrumentations: [
    new RuntimeNodeInstrumentation({
      monitoringPrecision: 5000,
    })
  ],
  ...
});

sdk.start()
```


| Metrics Name               | Description                   | Unit   | 
|----------------------------|-------------------------------|--------|
| v8js.gc.duration   | Garbage collection duration by kind, one of major, minor, incremental or weakcb.            | s |
| memory.heap.limit  | Total heap memory size pre-allocated. | Byte |
| memory.heap.used  | Heap Memory size allocated| Byte |
| memory.heap.space.available_size  | Heap space available size | Byte |
| memory.heap.space.physical_size  |Committed size of a heap space | Byte |
| eventloop.delay.min  | Event loop minimum delay | s |
| eventloop.delay.max  | Event loop maximum delay | s |
| eventloop.delay.mean  | Event loop mean delay   | s |
| eventloop.delay.stddev  | Event loop standard deviation delay   | s |


### Resource attributes for NodeJS application

| Attribute Key              | Type |  Description           | 
|----------------------------|-------|------------------------|
| service.name               | string  | This attribute is used to describe the entity name.    |
| service.instance.id        | string  | This attribute is used to describe the entity ID of the current object.  |
