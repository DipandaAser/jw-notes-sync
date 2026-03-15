import { describe, it, expect } from 'vitest';
import { runAdapterContractTests } from '@jw-notes-sync/core';
import { webAdapter } from '../src/lib/adapter.js';

runAdapterContractTests(webAdapter, describe, it, expect);
