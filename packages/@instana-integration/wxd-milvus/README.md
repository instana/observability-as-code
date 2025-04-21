# @instana-integration/wxd-milvus

The Instana integration package is designed to showcase observability capabilities within Instana by monitoring the Watsonx.data Milvus Engine. Milvus exposes metrics through OpenTelemetry, which can be effectively leveraged to track real-time metrics using the provided dashboards.

## Dashboards

Below are the dashboards that are currently supported by this integration package.

| Dashboard Title    | 
|-------------------|
| milvus-system-health 
| milvus-query-performance-health
| milvus-data-metadata-health
| milvus-workload-health

### Resource Attributes

Below resource attributes can be used to narrow down the data to focus on a specific engine within an instance 

| Attribute Key              | Type |  Description           |
|----------------------------|-------|------------------------|
| metric.tag.Instanceid       | string  | This attribute is used to choose the desired WXD instance ID.  |
| metric.tag.PodUid      | string  | This attribute is used to ilter data for a specific engine.  |

## Installation and Usage

With [Instana CLI for integration package management](https://github.com/instana/observability-as-code?tab=readme-ov-file#instana-cli-for-integration-package-management), you can manage the lifecycle of this package such as downloading the package and importing it into Instana.

Downloading the package:

```shell
$ stanctl-integration download --package @instana-integration/wxd-milvus
```

Importing the package into Instana:

```shell
$ stanctl-integration import --package @instana-integration/wxd-milvus \
  --server $INSTANA_SERVER \
  --token $API_TOKEN \
  --set serviceinstanceid=$SERVICE_INSTANCE_ID
```

- INSTANA_SERVER: This is the base URL of a tenant unit, e.g. https://test-example.instana.io. This is the same URL that is used to access the Instana user interface.
- API_TOKEN: Requests against the Instana API require valid API tokens. The API token can be generated via the Instana user interface. For more information, please refers to [Instana documentation](https://www.ibm.com/docs/en/instana-observability/current?topic=apis-instana-rest-api#usage-of-api-token).
- SERVICE_INSTANCE_ID: The string ID of the service instance. The ID helps to distinguish instances of the same service that exist at the same time (e.g. instances of a horizontally scaled service).
