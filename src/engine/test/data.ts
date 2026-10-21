// Test helper: load the pipeline's data files from public/data.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DataFile } from '../distribution';

const DIR = join(__dirname, '..', '..', '..', 'public', 'data');

export function loadData(name: string): DataFile {
  return JSON.parse(readFileSync(join(DIR, `${name}.json`), 'utf8')) as DataFile;
}

export const DATASETS = ['us-ptinc', 'us-cainc', 'us-hweal', 'us-ptinc-as'] as const;
