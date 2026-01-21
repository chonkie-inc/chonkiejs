/**
 * Type declarations for @chonkiejs/chunk
 */
declare module '@chonkiejs/chunk' {
  /**
   * Initialize the WASM module. Must be called before using other functions.
   */
  export function init(): Promise<void>;

  /**
   * Default target chunk size in bytes.
   */
  export const default_target_size: number;

  /**
   * Default delimiter characters.
   */
  export const default_delimiters: string;

  export interface ChunkOptions {
    /** Target chunk size in bytes (default: 4096) */
    size?: number;
    /** Delimiter characters (default: "\n.?") */
    delimiters?: string;
    /** Multi-byte pattern to split on */
    pattern?: string | Uint8Array;
    /** Put delimiter/pattern at start of next chunk (default: false) */
    prefix?: boolean;
    /** Split at START of consecutive runs (default: false) */
    consecutive?: boolean;
    /** Search forward if no pattern in backward window (default: false) */
    forwardFallback?: boolean;
  }

  export interface SplitOptions {
    /** Delimiter characters (default: "\n.?") */
    delimiters?: string;
    /** Where to attach delimiter: "prev", "next", or "none" */
    includeDelim?: 'prev' | 'next' | 'none';
    /** Minimum characters per segment (default: 0) */
    minChars?: number;
  }

  export interface MergeSplitsResult {
    /** End indices for each merged chunk */
    indices: number[];
    /** Token counts for each merged chunk */
    tokenCounts: number[];
  }

  /**
   * Split text into chunks at delimiter boundaries.
   * @param text - Text to chunk
   * @param options - Chunking options
   * @yields Chunks (same type as input)
   */
  export function chunk(text: string, options?: ChunkOptions): Generator<string>;
  export function chunk(text: Uint8Array, options?: ChunkOptions): Generator<Uint8Array>;

  /**
   * Get chunk offsets without creating views.
   * @param text - Text to chunk
   * @param options - Chunking options
   * @returns Array of [start, end] byte offset pairs
   */
  export function chunk_offsets(text: string | Uint8Array, options?: ChunkOptions): Array<[number, number]>;

  /**
   * Split text at every delimiter occurrence.
   * @param text - Text to split
   * @param options - Split options
   * @yields Segments (same type as input)
   */
  export function split(text: string, options?: SplitOptions): Generator<string>;
  export function split(text: Uint8Array, options?: SplitOptions): Generator<Uint8Array>;

  /**
   * Get split offsets without creating views.
   * @param text - Text to split
   * @param options - Split options
   * @returns Array of [start, end] byte offset pairs
   */
  export function split_offsets(text: string | Uint8Array, options?: SplitOptions): Array<[number, number]>;

  /**
   * Merge segments based on token counts, respecting chunk size limits.
   * @param tokenCounts - Array of token counts for each segment
   * @param chunkSize - Maximum tokens per merged chunk
   * @param combineWhitespace - If true, adds +1 token per join for whitespace
   * @returns Object with indices and token counts
   */
  export function merge_splits(
    tokenCounts: number[] | Uint32Array,
    chunkSize: number,
    combineWhitespace?: boolean
  ): MergeSplitsResult;

  /**
   * Chunker class for iterative chunking.
   */
  export class Chunker {
    constructor(text: string | Uint8Array, options?: ChunkOptions);
    next(): string | Uint8Array | undefined;
    reset(): void;
    collectOffsets(): Array<[number, number]>;
    free(): void;
    [Symbol.iterator](): Generator<string | Uint8Array>;
  }
}
