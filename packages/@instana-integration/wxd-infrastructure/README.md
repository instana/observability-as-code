# @instana-integration/wxd-infra-metrics

The Instana integration package is designed to showcase infrastructure observability capabilities within Instana by monitoring Kubernetes container resource metrics collected through the OpenTelemetry Prometheus Receiver. These metrics provide real-time visibility into CPU, memory, filesystem, and network utilization for Watsonx.data components running in Kubernetes/OpenShift clusters.

## Dashboards

Below are the dashboards currently supported by this integration package.

| Dashboard Title |
|-----------------|
| Infrastructure Overview |
| Container CPU Usage |
| Container Memory Usage |
| Container Filesystem Usage |
| Container Network Traffic |

## Metrics

The following infrastructure metrics are included in this integration package.

| Metric | Type | Description |
|--------|------|-------------|
| `container_cpu_usage_seconds_total` | Sum | Total CPU time consumed by the container. |
| `container_memory_usage_bytes` | Gauge | Current memory usage of the container. |
| `container_memory_working_set_bytes` | Gauge | Working set memory currently in use by the container. |
| `container_fs_usage_bytes` | Gauge | Current filesystem usage by the container. |
| `container_network_receive_bytes_total` | Sum | Total bytes received over the network by the container. |
| `container_network_transmit_bytes_total` | Sum | Total bytes transmitted over the network by the container. |

### Semantic Conventions

The metrics follow the OpenTelemetry Prometheus Receiver semantic conventions.

### Resource Attributes

The following resource attributes can be used to filter infrastructure metrics.

| Attribute Key | Type | Description |
|---------------|------|-------------|
| `metric.tag.Instanceid` | string | Filters metrics for a specific Watsonx.data instance. |
| `metric.tag.PodUid` | string | Filters metrics for a specific Kubernetes pod. |
| `metric.tag.k8s.namespace.name` | string | Filters metrics by Kubernetes namespace. |
| `metric.tag.k8s.pod.name` | string | Filters metrics by Kubernetes pod name. |
| `metric.tag.k8s.node.name` | string | Filters metrics by Kubernetes node. |

## OpenTelemetry Metric Names

| Prometheus Metric | Instana Metric |
|-------------------|----------------|
| `container_cpu_usage_seconds_total` | `metrics.sums.github.com/open-telemetry/opentelemetry-collector-contrib/receiver/prometheusreceiver/container_cpu_usage_seconds_total` |
| `container_memory_usage_bytes` | `metrics.gauges.github.com/open-telemetry/opentelemetry-collector-contrib/receiver/prometheusreceiver/container_memory_usage_bytes` |
| `container_memory_working_set_bytes` | `metrics.gauges.github.com/open-telemetry/opentelemetry-collector-contrib/receiver/prometheusreceiver/container_memory_working_set_bytes` |
| `container_fs_usage_bytes` | `metrics.gauges.github.com/open-telemetry/opentelemetry-collector-contrib/receiver/prometheusreceiver/container_fs_usage_bytes` |
| `container_network_receive_bytes_total` | `metrics.sums.github.com/open-telemetry/opentelemetry-collector-contrib/receiver/prometheusreceiver/container_network_receive_bytes_total` |
| `container_network_transmit_bytes_total` | `metrics.sums.github.com/open-telemetry/opentelemetry-collector-contrib/receiver/prometheusreceiver/container_network_transmit_bytes_total` |

## Installation and Usage

With the **Instana CLI for integration package management**, you can download and import this package into your Instana tenant.

### Download the package

```shell
stanctl-integration download --package @instana-integration/wxd-infra-metrics
```

### Import the package

```shell
stanctl-integration import --package @instana-integration/wxd-infra-metrics \
  --server $INSTANA_SERVER \
  --token $API_TOKEN \
  --set serviceinstanceid=$SERVICE_INSTANCE_ID
```

Where:

- **INSTANA_SERVER**: Base URL of your Instana tenant (for example, `https://example.instana.io`).
- **API_TOKEN**: Instana API token with permissions to import integration packages.
- **SERVICE_INSTANCE_ID**: Unique identifier of the monitored service instance.