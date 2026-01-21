/**
 * @chonkie/core
 * Core chunking library for Chonkie - lightweight and efficient text chunking
 */

export { RecursiveChunker, initWasm } from '@/recursive';
export type { RecursiveChunkerOptions } from '@/recursive';

export { TokenChunker } from '@/token';
export type { TokenChunkerOptions } from '@/token';

export { Tokenizer } from '@/tokenizer';

export { Chunk, RecursiveLevel, RecursiveRules } from '@/types';
export type { RecursiveLevelConfig, RecursiveRulesConfig, IncludeDelim } from '@/types';

// Re-export low-level chunk functions from @chonkiejs/chunk
export {
  chunk,
  chunk_offsets,
  split,
  split_offsets,
  merge_splits,
  init,
  Chunker,
  default_target_size,
  default_delimiters,
} from '@chonkiejs/chunk';
