#!/usr/bin/env node

import { configureCLI } from './cli';
import { handleDeploy } from './handlers/deploy';
import { handleImport } from './handlers/import-config';
import { handleList } from './handlers/list';
import { handleRestart } from './handlers/restart';
import { handleTag } from './handlers/tag-set';
import { handleUpdate } from './handlers/update';
// Wire CLI commands
configureCLI({
    handleRestart,
    handleDeploy,
    handleUpdate,
    handleList,
    handleTag,
    handleImport
});
