#!/usr/bin/env node

import { configureCLI } from './cli';
import { handleDeploy } from './handlers/deploy';
import { handleRestart } from './handlers/restart';
import { handleUpdate } from './handlers/update';
import logger from './logger';

// Wire CLI commands
configureCLI({
    handleRestart,
    handleDeploy,
    handleUpdate
});
