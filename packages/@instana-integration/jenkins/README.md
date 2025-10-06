# @instana-integration/jenkins

The integration package is used to support Jenkins monitoring. Once imported into your Instana environment, it enables monitoring of Jenkins jobs, builds, and system health through dashboards, alerts, etc. provided in this package.

## Dashboards

Below are the dashboards that are currently supported by this integration package.

| Dashboard Title            | Description                                      |
|----------------------------|--------------------------------------------------|
| Jenkins Runtime Monitoring | Dashboard for monitoring Jenkins Jobs & Overview |

## Metrics

### Semantic Conventions

Below are the Jenkins metrics that are currently supported by this integration package. These metrics are collected using the OpenTelemetry Jenkins receiver:

| Metric Name                               | Description                              | Unit         | Type  |
|-------------------------------------------|------------------------------------------|--------------|-------|
| jenkins.executors                         | Total number of executors                | Count        | Gauge |
| jenkins.jobs.count                        | Total number of jobs                     | Count        | Gauge |
| jenkins.job.health_score                  | Health score of a job (0-100)            | Score        | Gauge |
| jenkins.job.status                        | Status of a job (0=failed, 1=successful) | Status       | Gauge |
| jenkins.job.last_build.duration           | Duration of the last build               | Milliseconds | Gauge |
| jenkins.job.last_build.estimated_duration | Estimated duration of the last build     | Milliseconds | Gauge |
| jenkins.job.last_build.age                | Time since the last build                | Milliseconds | Gauge |
| jenkins.queue.size                        | Number of jobs in queue                  | Count        | Gauge |

### Resource Attributes

Below are the resource attributes that are currently supported by this integration package.

| Attribute Key       | Type   | Description                                                     |
|---------------------|--------|-----------------------------------------------------------------|
| service.name        | string | This attribute is used to identify the Jenkins service.         |
| service.instance.id | string | This attribute is used to identify a specific Jenkins instance. |


## Events

Below are the events that are currently supported by this integration package.

| Event Name                   | Description                                                                                                                                 |
|------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| Jenkins Executor Exhaustion  | Detects when Jenkins executors are fully utilized, which may cause build queuing and delays in CI/CD pipelines.                             |
| Failed Jenkins Job           | Detects when a Jenkins job has failed, which requires immediate attention to fix the build issues.                                          |
| Long Running Jenkins Build   | Detects when a Jenkins build is taking significantly longer than expected, which may indicate performance issues or build process problems. |
| Low Jenkins Job Health Score | Detects when a Jenkins job has a low health score, which may indicate recurring build failures or other issues with the job.                |
| Old Jenkins Job Build        | Detects when a Jenkins job hasn't been built in a long time, which may indicate abandoned jobs or configuration issues.                     |
| Unusual Jenkins Job Count    | Detects when there is an unusually high number of Jenkins jobs, which may indicate unauthorized job creation or configuration issues.       |


## Installation and Usage

With [Instana CLI for integration package management](https://github.com/instana/observability-as-code?tab=readme-ov-file#instana-cli-for-integration-package-management), you can manage the lifecycle of this package, such as downloading the package and importing it into Instana. You can find the available binaries for the CLI on different platforms on the [release page of this project](https://github.com/instana/observability-as-code/releases). Select the binary from the latest release that matches your platform to download, then rename it to stanctl-integration. You should now be able to run it on your local machine.

Downloading the package:

```shell
$ stanctl-integration download --package @instana-integration/jenkins
```

Importing the package into Instana:

```shell
$ stanctl-integration import --package @instana-integration/jenkins \
  --server $INSTANA_SERVER \
  --token $API_TOKEN \
  --set servicename=$SERVICE_NAME \
  --set serviceinstanceid=$SERVICE_INSTANCE_ID
```

- INSTANA_SERVER: This is the base URL of an Instana tenant unit, e.g. https://test-example.instana.io, which is used by the CLI to communicate with Instana server for package lifecycle management.
- API_TOKEN: Requests against the Instana API require valid API tokens. The API token can be generated via the Instana user interface. For more information, please refer to [Instana documentation](https://www.ibm.com/docs/en/instana-observability/current?topic=apis-instana-rest-api#usage-of-api-token).
- SERVICE_NAME: Logical name of the service.
- SERVICE_INSTANCE_ID: The string ID of the service instance. The ID helps to distinguish instances of the same service that exist at the same time (e.g. instances of a horizontally scaled service).