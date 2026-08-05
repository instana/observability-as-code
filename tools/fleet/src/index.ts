#!/usr/bin/env node

import { configureCLI } from './cli';
import { handleDeploy } from './handlers/deploy';
import { handleList } from './handlers/list';
import { handleRestart } from './handlers/restart';
import { handleUpdate } from './handlers/update';
// Wire CLI commands
configureCLI({
    handleRestart,
    handleDeploy,
    handleUpdate,
    handleList
});
