# @instana-integration/cp4aiops

This integration package is designed to showcase observability capabilities within Instana by monitoring the IBM Cloud Pak for Watson AIOps (CP4AIOps) v4.13. This package includes custom dashboards and events that specifically monitoring of CP4AIOps components such as Kafka, Cassandra, PostgreSQL as well as the CP4AIOps's Topology and RedHat OCP metrics.

## Dashboards

Below are the dashboards that are currently supported by this integration package.

| Dashboard Title        | Description                                                            |
|------------------------|------------------------------------------------------------------------|
| CP4AIOPS - Main        | Collection of relevant dashboards from other custom dashboards         |
| CP4AIOPS - Kafka       | Collection of Kafka dashboards filtered to cp4aiops namespace          |
| CP4AIOPS - PostgreSQL  | Collection of PostgreSQL dashboards filtered to cp4aiops namespace     |
| CP4AIOPS - Cassandra   | Collection of Cassandra dashboards filtered to cp4aiops namespace      |
| CP4AIOPS - Topology    | Collection of cp4aiops topology dashboards filtered to cp4aiops        |
| CP4AIOPS - OCP Health  | Collection of OCP metrics dashboards relevant to cp4aiops              |

## Events

Below are the events that are currently supported by this integration package.

| Event Name                                          | Description                                                      |
|-----------------------------------------------------|------------------------------------------------------------------|
| CP4AIOpsCassandraReadLatencyCritical                | Triggered when Cassandra Read Latency mean value > 200ms         |
| CP4AIOpsCassandraReadLatencyWarning                 | Triggered when mean value >= 50ms to <= 200ms                    |
| CP4AIOpsCassandraTombstoneCompactionPendingCritical | Triggered when Cassandra Tombstone Compaction Pending value > 50 |
| CP4AIOpsCassandraTombstoneCompactionPendingWarning  | Triggered when value >= 10 to <=50                               |
| CP4AIOpsCassandraTombstoneCountWarning              | Triggered when Cassandra Tombstone Count >= 1000                 |
| CP4AIOpsCassandraTombstoneCountCritical             | Triggered when Cassandra Tombstone Count > 5000                  |
| CP4AIOpsKafkaFrequentISRShrinks                     | Triggered when In-Sync Replicas falling out of sync with leader  |
| CP4AIOpsKafkaOfflinePartitions                      | Triggered when any Kafka partition that is offline for 1 minute  |
| CP4AIOpsKafkaRequestHandlerBusy                     | Triggered when Idle Time is below 15% for 10 minutes             |
| CP4AIOpsKafkaTopicFailedFetchRequests               | Triggered when Failed Fetch requests exceeding 5% for 5 minutes  |
| CP4AIOpsKafkaUnderReplicatedPartitions              | Triggered when any partitions lose replicas for 90s              |
| CP4AIOpsPostgresCacheHitRatioCritical               | Triggered when cache hit ratio falls below 70% for 10 minutes    |
| CP4AIOpsPostgresConnectionsCritical                 | Triggered when active connections exceed 90% of the max for 90s  |
| CP4AIOpsPostgresReplicationLagCritical              | Triggered when lag exceeds 300 seconds for 5 minutes window      |

## Metrics

### Semantic Conventions

### Resource Attributes

## Installation and Usage

With [Instana CLI for integration package management](https://github.com/instana/observability-as-code?tab=readme-ov-file#instana-cli-for-integration-package-management), you can manage the lifecycle of this package, such as downloading the package and importing it into Instana. You can find the available binaries for the CLI on different platforms on the [release page of this project](https://github.com/instana/observability-as-code/releases). Select the binary from the latest release that matches your platform to download, then rename it to stanctl-integration. You should now be able to run it on your local machine.

Downloading the package:

```shell
$ stanctl-integration download --package @instana-integration/cp4aiops
```

Importing the package into Instana:

```shell
$ stanctl-integration import --package @instana-integration/cp4aiops \
  --server $INSTANA_SERVER \
  --token $API_TOKEN \
  --set namespace.name=$CP4AIOPS_NAMESPACE
  
```

- INSTANA_SERVER: This is the base URL of an Instana tenant unit, e.g. https://test-example.instana.io, which is used by the CLI to communicate with Instana server for package lifecycle management.
- API_TOKEN: Requests against the Instana API require valid API tokens. The API token can be generated via the Instana user interface. For more information, please refer to [Instana documentation](https://www.ibm.com/docs/en/instana-observability/current?topic=apis-instana-rest-api#usage-of-api-token).
- CP4AIOPS_NAMESPACE: The Kubernetes namespace name where CP4AIOps is running on.

For example:
stanctl-integration import --package @instana-integration/cp4aiops \
--server unit0-tenant0.instana.mycompany.io \
--token exampleofmyapitoken \
–-set namespace.name=cp4aiops

