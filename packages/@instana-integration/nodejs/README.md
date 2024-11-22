# @instana-integration/nodejs

The Instana integration package used to support Node.js monitoring. Once you import this package into your Instana environment, you will be able to monitor Node.js runtime and the applications on various aspects by checking the dashboards, alerts, etc. included in this integration package.

## Dashboards

Below are the dashboards that are currently supported by this integration package.

| Dashboard Title    | Description                    |    
|----------------------------|-----------------------|
| Node.js Runtime Metrics   | Instana custom dashboard that displays runtime metrics for Node.js application |

## Node.js Runtime Metrics

### Semantic Conventions for  Node.js Runtime Metrics

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

| Metrics Name               | Description                   | Unit   | 
|----------------------------|-------------------------------|--------|
| v8js.gc.duration   | Garbage collection duration by kind, one of major, minor, incremental or weakcb.            | s |
| memory.heap.limit  | Total heap memory size pre-allocated. | Byte |
| memory.heap.used  | Heap memory size allocated. | Byte |
| memory.heap.space.available_size  | Heap space available size. | Byte |
| memory.heap.space.physical_size  | Committed size of a heap space. | Byte |
| eventloop.delay.min  | Event loop minimum delay. | s |
| eventloop.delay.max  | Event loop maximum delay. | s |
| eventloop.delay.mean  | Event loop mean delay.   | s |
| eventloop.delay.stddev  | Event loop standard deviation delay. | s |


### Resource Attributes for Node.js Application

Below are the resource attributes that are currently supported by this integration package.

| Attribute Key              | Type |  Description           | 
|----------------------------|-------|------------------------|
| service.name               | string  | This attribute is used to describe the entity name.    |
| service.instance.id        | string  | This attribute is used to describe the entity ID of the current object.  |

### Installation and Usage

With [Instana CLI for integration package management](https://github.com/instana/observability-as-code?tab=readme-ov-file#instana-cli-for-integration-package-management), you can manage the lifecycle of this package by downloading and importing into Instana.

Downloading the package:

```shell
$ stanctl-integration download --package @instana-integration/nodejs
```

Importing the dashboard into Instana:

```shell
$ stanctl-integration import --package @instana-integration/nodejs \
  --server $INSTANA_SERVER \
  --token $API_TOKEN \
  --set servicename=$SERVICE_NAME \
  --set serviceinstanceid=$SERVICE_INSTANCE_ID
```
