#!/usr/bin/env python3
"""
{{COLLECTOR_NAME}} Collector

Starter template to build a custom collector using the Instana Extension Base Library.
Replace this implementation with your actual collection logic.
"""

import logging
import time
from typing import TYPE_CHECKING

# Add your connector/client imports here, for example:
# import requests
# import pymysql

from extension_base.core import ExtensionBase

if TYPE_CHECKING:
    from extension_base.config.models import Endpoint
    from extension_base.metrics.emitter import MetricsEmitter

logger = logging.getLogger("{{COLLECTOR_NAME}}_collector")


def collect_metrics(endpoint: "Endpoint", emitter: "MetricsEmitter") -> None:
    """Collect metrics from a single endpoint and emit them via the emitter.

    This function is called by ExtensionBase once per collection interval,
    per enabled endpoint defined in extension-config.json.

    Args:
        endpoint: The resolved endpoint object. Key attributes:
            - endpoint.url          hostname or IP of the target
            - endpoint.port         port (may be None)
            - endpoint.credentials  resolved credentials (username, password, token, …)
            - endpoint.tags         dict of tags merged into every metric automatically
            - endpoint.timeout      per-endpoint timeout override (may be None)
        emitter: Thin OTel wrapper. Instrument caches and endpoint tags are
            managed automatically. Use report_metric() to record collector metrics.
    """
    timeout = endpoint.timeout or 5
    start = time.monotonic()

    # ------------------------------------------------------------------
    # 1. Connect to / query the target system
    # ------------------------------------------------------------------
    # Replace this block with your actual data collection logic.
    #
    # Example — HTTP API:
    #   import requests
    #   response = requests.get(
    #       f"http://{endpoint.url}:{endpoint.port}/metrics",
    #       timeout=timeout,
    #   )
    #   response.raise_for_status()
    #   data = response.json()
    #
    # Example — database:
    #   conn = pymysql.connect(
    #       host=endpoint.url,
    #       port=endpoint.port or 3306,
    #       user=endpoint.credentials.username,
    #       password=endpoint.credentials.password,
    #       connect_timeout=timeout,
    #   )

    # ------------------------------------------------------------------
    # 2. Emit metrics
    # ------------------------------------------------------------------
    # Replace the examples below with metrics derived from your data.
    #
    # Counter  — monotonically increasing total (e.g. requests, errors)
    # Gauge    — point-in-time snapshot        (e.g. active connections, queue depth)
    # Histogram — distribution of a value      (e.g. latency, response size)
    #
    # Endpoint tags from extension-config.json are merged automatically.
    # Pass additional per-call attributes via the `attributes` keyword.

    duration_ms = (time.monotonic() - start) * 1000

    # Example counter
    emitter.report_metric(
        "counter",
        "{{COLLECTOR_NAME}}.example.total",
        value=1,
        description="Example counter — replace with a real metric",
        unit="{item}",
    )

    # Example gauge
    emitter.report_metric(
        "gauge",
        "{{COLLECTOR_NAME}}.example.active",
        value=0,
        description="Example gauge — replace with a real metric",
        unit="{item}",
    )

    # Collection round-trip latency — keep this, it's useful for alerting
    emitter.report_metric(
        "histogram",
        "{{COLLECTOR_NAME}}.collection.duration",
        value=duration_ms,
        description="Time spent collecting metrics from the target",
        unit="ms",
    )

    logger.info(
        "Collected metrics from %s in %.1f ms",
        endpoint.id,
        duration_ms,
    )


if __name__ == "__main__":
    extension = ExtensionBase()
    extension.run(collect_metrics)
