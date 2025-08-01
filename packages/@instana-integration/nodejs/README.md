# @instana-integration/nodejs

The Instana integration package used to support Node.js monitoring. Once you import this package into your Instana environment, you will be able to monitor Node.js runtime and the applications on various aspects by checking the dashboards, alerts, etc. included in this integration package.

## Dashboards

Below are the dashboards that are currently supported by this integration package.

| Dashboard Title         | Description                                                                    |    
|-------------------------|--------------------------------------------------------------------------------|
| Node.js Runtime Metrics | Instana custom dashboard that displays runtime metrics for Node.js application |

## Metrics

### Semantic Conventions

The Node.js runtime metrics are obtained by OpenTelemetry auto-instrumentation:

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

Below are the Node.js runtime metrics that are currently supported by this integration package.

| Metrics Name                     | Description                                                                      | Unit | 
|----------------------------------|----------------------------------------------------------------------------------|------|
| v8js.gc.duration                 | Garbage collection duration by kind, one of major, minor, incremental or weakcb. | s    |
| memory.heap.limit                | Total heap memory size pre-allocated.                                            | Byte |
| memory.heap.used                 | Heap memory size allocated.                                                      | Byte |
| memory.heap.space.available_size | Heap space available size.                                                       | Byte |
| memory.heap.space.physical_size  | Committed size of a heap space.                                                  | Byte |
| eventloop.delay.min              | Event loop minimum delay.                                                        | s    |
| eventloop.delay.max              | Event loop maximum delay.                                                        | s    |
| eventloop.delay.mean             | Event loop mean delay.                                                           | s    |
| eventloop.delay.stddev           | Event loop standard deviation delay.                                             | s    |


### Resource Attributes

Below are the resource attributes that are currently supported by this integration package.

| Attribute Key        | Type   | Description                                                             | 
|----------------------|--------|-------------------------------------------------------------------------|
| service.name         | string | This attribute is used to describe the entity name.                     |
| service.instance.id  | string | This attribute is used to describe the entity ID of the current object. |

## Events

Below are the events that are currently supported by this integration package.

Note: In each event definition, conditionValue represents a threshold used to trigger the event and is provided as a default or reference value. Please adjust this value based on your specific environment.

| Event Name                           | Description                                                                                                                                                                                |
|--------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Frequent Major Garbage Collections   | Detects when a Node.js application is experiencing frequent major garbage collections, which can cause significant application pauses and performance degradation.                         |
| Heap Space Exhaustion                | Detects when a Node.js application's heap space is nearly exhausted, which may lead to application crashes or out-of-memory errors.                                                        |
| High Event Loop Delay                | Detects when a Node.js application's event loop is experiencing high delays, which may indicate CPU-intensive operations blocking the event loop and affecting application responsiveness. |
| High Event Loop Lag Variance         | Detects when a Node.js application's event loop is experiencing inconsistent performance with high standard deviation in delay times, which may indicate intermittent blocking operations. |
| High Garbage Collection Duration     | Detects when a Node.js application is experiencing long garbage collection pauses, which can cause application latency spikes and poor user experience.                                    |
| High Heap Usage                      | Detects when a Node.js application is using a high percentage of its available heap memory, which may indicate memory leaks or inefficient memory usage.                                   |
| Memory Leak Detection                | Detects potential memory leaks in Node.js applications by monitoring continuously increasing heap usage over time with minimal garbage collection impact.                                  |

## Installation and Usage

With [Instana CLI for integration package management](https://github.com/instana/observability-as-code?tab=readme-ov-file#instana-cli-for-integration-package-management), you can manage the lifecycle of this package such as downloading the package and importing it into Instana.

Downloading the package:

```shell
$ stanctl-integration download --package @instana-integration/nodejs
```

Importing the package into Instana:

```shell
$ stanctl-integration import --package @instana-integration/nodejs \
  --server $INSTANA_SERVER \
  --token $API_TOKEN \
  --set servicename=$SERVICE_NAME \
  --set serviceinstanceid=$SERVICE_INSTANCE_ID
```

- INSTANA_SERVER: This is the base URL of a tenant unit, e.g. https://test-example.instana.io. This is the same URL that is used to access the Instana user interface.
- API_TOKEN: Requests against the Instana API require valid API tokens. The API token can be generated via the Instana user interface. For more information, please refers to [Instana documentation](https://www.ibm.com/docs/en/instana-observability/current?topic=apis-instana-rest-api#usage-of-api-token).
- SERVICE_NAME: Logical name of the service.
- SERVICE_INSTANCE_ID: The string ID of the service instance. The ID helps to distinguish instances of the same service that exist at the same time (e.g. instances of a horizontally scaled service).