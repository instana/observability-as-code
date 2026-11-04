# Dynamic Collector Loading: CLI and Backend Design Spec (Draft)

## 1. Purpose

Describe how custom collector Python scripts are stored, referenced and delivered to the supervisor, and how the CLI commands change.

## 2. Background

In the MVP, a custom collector is described by one fleet configuration. The configuration references the container image by repository and tag, and carries the settings files.

There are two CLIs (`observability-as-code`, branch `fi-features`):

| Binary                 | Command                               | What it does today                                                                                                                                                                  |
|------------------------|---------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `instana-integration`  | `init`                                | Creates a collector package from a template.                                                                                                                                        |
| `instana-integration`  | `build`                               | Build a collector container image.                                                                                                                                                  |
| `instana-integration`  | `publish`                             | Publish the collector container image (`publish --artifact-type package\|image\|both`).                                                                                             |
| `instana-integration`  | `import`                              | In collector mode (`--include collector/...`) reads `collector/config/config.json` and creates or updates the custom collector configuration. Stores `{ files, image: { repo } }`.  |
| `instana-fleet`        | `import-config`                       | Generic import of configuration files: creates the configuration, or merges files into the existing one with the same name. Stores `{ files }` only.                                |
| `instana-fleet`        | `deploy`                              | Sends `agent.component.deploy` with `args.configurationId` to matching agents.                                                                                                      |
| `instana-fleet`        | `update-config`                       | Sends `agent.configuration.update` with `args.configurationId`. Does not change the database.                                                                                       |
| `instana-fleet`        | `list-configs`                        | Not affected by this spec.                                                                                                                                                          |
| `instana-fleet`        | `restart`                             | Not affected by this spec.                                                                                                                                                          |
| `instana-fleet`        | `set-tag`                             | Not affected by this spec.                                                                                                                                                          |

`deploy` and `update-config` send only the configuration id. The backend builds the full command for the supervisor from the stored configuration. No CLI change is needed on these two commands.

Both import paths first list `GET /api/fleet/configurations?type=` and look for the name on the client side. There is no lookup by name in the REST API.

Phase 2 adds support for collectors' Python scripts. They are too large and change too often to inline in the configuration, so they are stored as their own resource and referenced from the configuration.

## 3. Goals

- Upload Python scripts independently from the configuration.
- Reference scripts from the configuration by a readable name and version, the same way the image is referenced.
- Deliver the scripts and the configuration to the supervisor in one command.
- Keep the CLI model symmetrical and easy to guess.

## 4. Concepts

| Term              | Meaning                                                                                                                                                                |
|-------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Script            | A `.tar.gz` archive with the collector's Python files. One upload is one archive.                                                                                      |
| Configuration     | The existing fleet configuration: image reference, settings files, and now a script reference.                                                                         |
| Script reference  | A name and version inside the configuration that points at a stored script.                                                                                            |
| Supervisor        | A process manager and agent orchestrator that manages the lifecycle, configuration, health monitoring, and remote synchronization for the Custom Collector containers. |

## 5. Commands

### 5.1 import-script

Packages a directory into a `.tar.gz` and stores it in the backend. New command, no code exists yet.

```
instana-fleet import-script --include <pattern> --script-name <name> --script-version <version> [options]
```

Parameters:

| Parameter          | Description                                                                           |
|--------------------|---------------------------------------------------------------------------------------|
| `--include`        | Folder or glob pattern of the files to package, e.g. `"collector/src/**"`.            |
| `--script-name`    | Name of the script, e.g. `mysql`.                                                     |
| `--script-version` | Version of the script.                                                                |

Behavior:

1. Package the matched files into a `.tar.gz`.
2. Check whether the name exists: list `GET /api/fleet/scripts` (metadata only, no archive) and look for the name on the client side, the same way the configuration import lists first.
3. Create the script, or update it if the name exists.
4. Print the returned id, name, version and checksum.

### 5.2 Storing the script reference in the configuration

Custom collector configurations are written by `instana-integration import`, which reads `collector/config/config.json`. The proposal is to add a `script` block next to `image`:

```json
{
  "extension_name": "mysql",
  "extension_version": "1.0.0",
  "image":  { "registry": "quay.io", "repository": "instana-collectors/mysql", "tag": "1.0.0" },
  "script": { "name": "mysql", "version": "1.0.0" }
}
```

The import handler copies it into the stored configuration, as it does for `image`:

```json
{
  "image":  { "repo": "quay.io/instana-collectors/mysql:1.0.0" },
  "script": { "name": "mysql", "version": "1.0.0" },
  "files":  [ { "name": "credentials.json", "data": "<base64>" },
              { "name": "extension-config.json", "data": "<base64>" } ]
}
```

The configuration holds a reference only, never the script content.

- The reference key is `script` with `name` and `version`, at the top level of the stored configuration.

Required CLI changes:

- `instana-fleet import-config`: its update path sends `configuration: { files: mergedFiles }` only. That replaces the whole configuration and drops `image` and `script`. It must keep the other keys of the existing configuration, or the reference is lost the next time someone updates files with this command.
- `instana-integration import`: its update path rebuilds the configuration from `config.json` on each run, so it writes `script` the same way it writes `image`. But it returns early with "already up to date" when no file changed, so a change to only the `script` reference (or the image) is never saved. The up-to-date check must also compare the reference.

### 5.3 deploy (existing)

```
instana-fleet deploy --type com.ibm.instana.customcollector --tag env=prod --configuration-id <id>
```

No new parameter. The script comes from the reference in the configuration.

### 5.4 update-config (existing)

```
instana-fleet update-config --type com.ibm.instana.customcollector --tag env=prod --configuration-id <id>
```

No new parameter. It re-reads the stored configuration, so a changed script reference is picked up.

Note: the name is misleading because it applies a configuration on the agent and does not update the database. Rename later, or document it clearly. No rename is proposed in this spec.

## 6. Backend

### 6.1 Storage

Table `fleet_scripts`

### 6.2 REST API

| Method   | Path                                 | Behavior                                                                                                                                                                                                                                                                                              |
|----------|--------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `POST`   | `/api/fleet/scripts`                 | Create. Needs the name and the archive. The version is optional: if sent, it is used; if not, the backend picks it. Returns id, version, checksum, status, message.                                                                                                                                   |
| `PUT`    | `/api/fleet/scripts/{id}`            | Replace the archive of an existing script. Keeps the id and changes the version of that entry in place, so the previous version no longer exists and the configuration reference must be moved to the new version. The version is optional: if sent, it is used; if not, the patch version is bumped. |
| `DELETE` | `/api/fleet/scripts/{id}`            | Delete a script.                                                                                                                                                                                                                                                                                      |
| `GET`    | `/api/fleet/scripts`                 | List metadata, without the archive.                                                                                                                                                                                                                                                                   |
| `GET`    | `/api/fleet/scripts/{id}`            | One script including its archive data.                                                                                                                                                                                                                                                                |
| `GET`    | `/api/fleet/scripts?name=`           | Latest version of the name, including data.                                                                                                                                                                                                                                                           |
| `GET`    | `/api/fleet/scripts?name=&version=`  | That exact version, including data.                                                                                                                                                                                                                                                                   |

Response of `POST` and `PUT`:

```json
{ "id": "kQ3xVn2aTq", "version": "1.0.0", "checksum": "...", "status": "created", "message": "..." }
```

The script id is called `id` in every response. `GET` returns the stored script with `id`, `name`, `version`, `checksum`, `content_type`, `created_at`, `updated_at` and, for a single-script lookup, `data`. `GET /api/fleet/scripts` returns a list of these without `data`; `GET /api/fleet/scripts?name=` and `GET /api/fleet/scripts?name=&version=` return a single script object, or 404 if there is none.

"Latest" is the numerically highest version (`1.10.0` is higher than `1.9.0`).

Validation: name not blank, non-empty body, gzip header present, and a version that is sent must have the format `x.y.z` (400 otherwise). The archive is limited to 7 MB (7 * 1024 * 1024 bytes); a larger archive returns 413. The archive is sent as base64 inside JSON (about 33% larger), so 7 MB stays under the 10 MB request limit of the ingress and the user gets this message instead of a bare nginx 413. A duplicate name and version returns 409. The archive content is never inspected.

### 6.3 Resolving the reference at deploy and update time

For `agent.component.deploy` and `agent.configuration.update`, `UnifiedAgentRequestService`:

1. Loads the configuration by `configurationId`.
2. Reads the `script` reference.
3. Loads that script by name and version from groundskeeper.
4. Adds the archive to the command as a base64 string.
5. Publishes one command to the supervisor.

If the referenced script does not exist, the request fails with 404 and nothing is published. The error message names the missing script and version, so the CLI can show the user clearly that the script was not found. This means the backend reads the `script` key inside the configuration, which was opaque JSON until now.

If the configuration has no script reference, the command is built as it is today.

A `script` reference must have a `name`. A `version` is optional; without it the latest version is used. A reference without a name fails with 400 and nothing is published.

## 7. Payload to the supervisor

```json
{
  "name": "config-mysql",
  "version": "1.0.0",
  "type": "com.ibm.instana.customcollector",
  "configuration": {
    "image": { "repo": "quay.io/instana-collectors/mysql:1.0.0" },
    "files": [ { "name": "credentials.json", "data": "<base64>" } ]
  },
  "script": { "data": "<base64 .tar.gz>" }
}
```

## 8. Workflows

First deployment:

1. `import-script` stores `mysql` version `1.0.0`.
2. `instana-integration import` stores the configuration with the reference `mysql` / `1.0.0`. It returns a configuration id.
3. `instana-fleet deploy --configuration-id <id>` sends image, files and script to the supervisor.

Changing the scripts:

1. `import-script` with the new files, giving a new version.
2. `instana-integration import` with the reference in `config.json` updated to the new version.
3. `instana-fleet update-config --configuration-id <id>`.

Changing only the settings:

1. `instana-integration import` (or `instana-fleet import-config`) with the new values. The reference is unchanged and must survive the update.
2. `instana-fleet update-config --configuration-id <id>`.

Configuration uploaded before the script exists:

1. `import-script`.
2. `instana-integration import` again with the reference added. The configuration is updated, not duplicated.
3. `deploy` or `update-config`.
