# Extension Runtime Base Image
# Base image includes:
# - Python 3.12 LTS runtime
# - tini as PID 1 init process (signal forwarding, zombie reaping)
# - OpenTelemetry SDK (API, SDK, OTLP/gRPC exporter)
# - Extension Base Library (extension_base) pre-installed
# - Runtime utilities (entrypoint.sh, healthcheck.sh)

# Change runtime image version if needed
# Override via CLI: stanctl-integration build --package <pkg> --build-arg RUNTIME_TAG=1.0.0
ARG RUNTIME_TAG=latest
FROM icr.io/instana/collector-extension-runtime-python:${RUNTIME_TAG}

WORKDIR /opt/instana/custom-collector

# Python path is already set in base image, but ensure it's available
ENV PYTHONPATH=/opt/instana/custom-collector:$PYTHONPATH

# Copy extension code
# NOTE: All COPY paths are relative to the build context (the collector/ directory).
# Do NOT use paths like "my-package/collector/file.py" — just use the filename directly.
COPY {{COLLECTOR_NAME}}_collector.py \
  /opt/instana/custom-collector/extensions/collector.py

# Copy requirements and install dependencies
COPY requirements.txt .
RUN if [ -f requirements.txt ] && [ -s requirements.txt ]; then \
      pip install --no-cache-dir -r requirements.txt; \
    fi

# NOTE: Do NOT copy config.json into the image
# The config.json file is used by 'stanctl-integration import' to create
# the Extension Base Configuration in the Instana backend.
# At runtime, the Supervisor generates and mounts the actual configuration
# to /opt/instana/custom-collector/config/extension-config.json

# Use base image entrypoint and healthcheck (no need to override)
