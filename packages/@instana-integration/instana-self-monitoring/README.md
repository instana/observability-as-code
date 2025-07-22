# @instana-integration/instana-self-monitoring

This integration package provides dashboards and event monitoring to support self-observability for Instana’s internal systems.

## Dashboards

Below are the dashboards that are currently supported by this integration package.

| Dashboard Title                                        | Description                                                                            |
|--------------------------------------------------------|----------------------------------------------------------------------------------------|
| OAC - Self Monitoring: profile related pipelines       | Monitors health and activity of pipelines related to profiling functionality.          |
| OAC - Self Monitoring: scale high perf metrics down    | Tracks how high-performance metric services behave during scale-down.                  |
| OAC - Self Monitoring: scale high perf processor down  | Observes performance and resource usage when scaling down high-perf processors.        |
| OAC - Self Monitoring: scale high perf spans down      | Monitors system behavior when scaling down span-handling components in high-perf mode. |
| OAC - Self Monitoring: scale high perf ui profile down | Tracks UI profiling components under high-performance scale-down scenarios.            |
| OAC - Self Monitoring: scale metrics profile down      | Provides insights into metric profiling as related components are scaled down.         |
| OAC - Self Monitoring: scale processor down            | Visualizes resource and performance metrics during standard processor scale-down.      |
| OAC - Self Monitoring: scale spans profile down        | Monitors how span profiles react to downscaling actions.                               |
| OAC - Self Monitoring: scale ui profile down           | Evaluates the impact of scaling down UI profiling modules.                             |
| OAC - Self Monitoring: Usage k8s components            | Displays usage and performance of Kubernetes components across the cluster.            |


## Metrics

### Semantic Conventions

Below are the runtime metrics that are currently supported by this integration package.

[None]

### Resource Attributes

Below are the resource attributes that are currently supported by this integration package.

[None]

## Events

Below are the events that are currently supported by this integration package.

| Event Name                                                                      | Description     |
|---------------------------------------------------------------------------------|-----------------|
| [SRESLO] Acceptor spans_error_rate rate is too high [TF]                        | —               |
| appdata-processor - Failed to heal online infra graph [TF]                      | —               |
| appdata-processor - Failed to heal online snapshots [TF]                        | —               |
| [SRETUSLO] appdata-processor is dropping > 25% spans [TF]                       | —               |
| appdata-processor - service explosion [TF]                                      | —               |
| [SRESLO] Butler HTTP thread pool is very busy [TF]                              | —               |
| [SRESLO] Butler http thread is very busy [TF]                                   | —               |
| [SREInfraSLO] metrics-cassandra node unreachable for > 5m [TF]                  | —               |
| [SREInfraSLO] profiles-cassandra node unreachable for > 5m [TF]                 | —               |
| [SREInfraSLO] spans-cassandra node unreachable for > 5m [TF]                    | —               |
| [SREInfraSLO] state-cassandra node unreachable for > 5m [TF]                    | —               |
| [SREInfraSLO] state-cassandra write latency greater than 1 minute [TF]          | —               |
| ClickHouse - AP - Too many parts in one of the partitions of the XXX table [TF] | —               |
| ClickHouse - AP - Too Many inserts are rejected [TF]                            | —               |
| [SREInfraSLO] ClickHouse - Distribution queue is filling up [TF]                | —               |
| [SREInfraSLO] ClickHouse is not running on the host. [TF]                       | —               |
| [SREInfraSLO] Clickhouse disk fs./dev/nvme1n1.used more than 85% full. [TF]     | —               |
| [SREInfraSLO] Clickhouse disk fs./dev/nvme2n1.used more than 85% full. [TF]     | —               |
| [SREInfraSLO] Clickhouse disk fs./dev/nvme3n1.used more than 85% full. [TF]     | —               |
| [SREInfraSLO] Clickhouse disk fs./dev/sdb.used more than 85% full. [TF]         | —               |
| [SREInfraSLO] Clickhouse disk fs./dev/sdc.used more than 85% full. [TF]         | —               |
| ClickHouse - Queries failing due to memory limit exceeded [TF]                  | —               |
| [SREInfraSLO] ClickHouse replica is in read-only mode for > 1m [TF]             | —               |
| ClickHouse - Inserts are rejected [TF]                                          | —               |
| ClickHouse - Replica Max Insert Queue Filling Up [TF]                           | —               |
| ClickHouse - Replication queue is filling up [TF]                               | —               |
| [SREInfraSLO] Zookeeper is not running for Clickhouse. [TF]                     | —               |
| [SREInfraSLO] Elasticsearch-NG has high number of unassigned shards [TF]        | —               |
| [EXPTUSLO] High ES Client Search Error Rate [TF]                                | —               |
| [SREInfraSLO] elasticsearch data disk utilized > 85% [TF]                       | —               |
| [SREInfraSLO] Elasticsearch is not running on the host. [TF]                    | —               |
| [SREInfraSLO] elasticsearch is in red status [TF]                               | —               |
| [SREInfraSLO] elasticsearch root disk utilized > 85% [TF]                       | —               |
| [DEVTUSLO] Instana filler pod CPU usage to CPU requests > 200% [TF]             | —               |
| [SRETUSLO] filler is dropping > 10% Cassandra rollups [TF]                      | —               |
| [SRETUSLO] filler writes to Cassandra are failing [TF]                          | —               |
| [EXPTUSLO] filler is failing to publish group member data [TF]                  | —               |
| [EXPTUSLO] group member metrics data are delayed [TF]                           | —               |
| [SRETUSLO] filler is dropping info events [TF]                                  | —               |
| [SRETUSLO] filler is dropping > 10% Kafka rollups [TF]                          | —               |
| [SRETUSLO] filler raw message lag > 5 seconds [TF]                              | —               |
| [SRETUSLO] filler is dropping metrics [TF]                                      | —               |
| [EXPTUSLO] filler outdated snapshots [TF]                                       | —               |
| [SRETUSLO] filler is dropping raw events [TF]                                   | —               |
| [SRETUSLO] filler is dropping > 15% raw messages [TF]                           | —               |
| [EXPTUSLO] filler is failing to publish raw metric data [TF]                    | —               |
| [SRETUSLO] filler is dropping snapshot changes [TF]                             | —               |
| [EXPTUSLO] filler is not processing any snapshot data [TF]                      | —               |
| [EXPTUSLO] filler stopped synchronizing ES search index [TF]                    | —               |
| [SRETUSLO] filler stopped fetching raw messages [TF]                            | —               |
| [SRESLO] Synthetics Datacenter Activation Errors [TF]                           | —               |
| [SREInfraSLO] Kafka node is showing high I/O wait times [TF]                    | —               |
| [SREInfraSLO] Kafka node is approaching max open files [TF]                     | —               |
| [SREInfraSLO] Kafka node has under replicated topic partitions [TF]             | —               |
| [DevSLO] Incoming logs are lagging [TF]                                         | —               |
| [DevSLO] synthetics-health-processor is dropping test results [TF]              | —               |
| [DevSLO] synthetics-health-processor is not receiving test results [TF]         | —               |
| [SLO] Writes of health events to Kafka are failing [TF]                         | —               |
| [SRESLO] Synthetics Acceptor Addon License Errors [TF]                          | —               |
| [SRESLO] Synthetics Acceptor External Storage Write Errors [TF]                 | —               |
| [SRESLO] Synthetics Reader ClickHouse Queued Calls [TF]                         | —               |
| [SRESLO] Synthetics Reader ClickHouse Select Failures [TF]                      | —               |
| [DevSLO] Synthetics Reader External Storage Read Errors [TF]                    | —               |
| [SRESLO] Synthetics Writer ClickHouse Insert Failures [TF]                      | —               |
| [SRESLO] tag-processor is not cleaning up tag sets [TF]                         | —               |
| [SRESLO] tag-processor is dropping snapshot updates [TF]                        | —               |
| [DEVSLO] tag-processor is dropping tag propagation actions [TF]                 | —               |
| [SRESLO] tag-processor is dropping tag set updates [TF]                         | —               |
| [SRESLO] tag-processor is dropping tagged metrics [TF]                          | —               |
| [SRESLO] tag-processor is lagging [TF]                                          | —               |
 
 
 
## Installation and Usage

With [Instana CLI for integration package management](https://github.com/instana/observability-as-code?tab=readme-ov-file#instana-cli-for-integration-package-management), you can manage the lifecycle of this package, such as downloading the package and importing it into Instana. You can find the available binaries for the CLI on different platforms on the [release page of this project](https://github.com/instana/observability-as-code/releases). Select the binary from the latest release that matches your platform to download, then rename it to stanctl-integration. You should now be able to run it on your local machine.

Downloading the package:

```shell
$ stanctl-integration download --package @instana-integration/instana-self-monitoring
```

Importing the package into Instana:

```shell
$ stanctl-integration import --package @instana-integration/instana-self-monitoring 
  --server $INSTANA_SERVER 
  --token $API_TOKEN 
  --set servicename=$SERVICE_NAME 
  --set serviceinstanceid=$SERVICE_INSTANCE_ID
```

- INSTANA_SERVER: This is the base URL of an Instana tenant unit, e.g. https://test-example.instana.io, which is used by the CLI to communicate with Instana server for package lifecycle management.
- API_TOKEN: Requests against the Instana API require valid API tokens. The API token can be generated via the Instana user interface. For more information, please refer to [Instana documentation](https://www.ibm.com/docs/en/instana-observability/current?topic=apis-instana-rest-api#usage-of-api-token).
- SERVICE_NAME: Logical name of the service.
- SERVICE_INSTANCE_ID: The string ID of the service instance. The ID helps to distinguish instances of the same service that exist at the same time (e.g. instances of a horizontally scaled service).