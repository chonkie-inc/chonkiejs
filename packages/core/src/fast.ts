import { chunk_offsets, init as initChunk } from '@chonkiejs/chunk';
import { Chunk } from '@/types';

let wasmInitialized = false;

async function initWasm(): Promise<void> {
  if (!wasmInitialized) {
    await initChunk();
    wasmInitialized = true;
  }
}

export interface FastChunkerOptions {
  /** Target chunk size in bytes (default: 4096) */
  chunkSize?: number;
  /** Delimiter characters for splitting (default: "\n.?") */
  delimiters?: string;
  /** Multi-byte pattern to split on (overrides delimiters) */
  pattern?: string | Uint8Array;
  /** Put delimiter/pattern at start of next chunk (default: false) */
  prefix?: boolean;
  /** Split at start of consecutive runs (default: false) */
  consecutive?: boolean;
  /** Search forward if no boundary in backward window (default: false) */
  forwardFallback?: boolean;
}

/**
 * Fast byte-based chunker using WASM boundary detection.
 */
export class FastChunker {
  public readonly chunkSize: number;
  public readonly delimiters: string;
  public readonly pattern?: string | Uint8Array;
  public readonly prefix: boolean;
  public readonly consecutive: boolean;
  public readonly forwardFallback: boolean;
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();

  private constructor(options: Required<Omit<FastChunkerOptions, 'pattern'>> & { pattern?: string | Uint8Array }) {
    if (options.chunkSize <= 0) {
      throw new Error('chunkSize must be greater than 0');
    }

    this.chunkSize = options.chunkSize;
    this.delimiters = options.delimiters;
    this.pattern = options.pattern;
    this.prefix = options.prefix;
    this.consecutive = options.consecutive;
    this.forwardFallback = options.forwardFallback;
  }

  /**
   * Create a FastChunker instance.
   */
  static async create(options: FastChunkerOptions = {}): Promise<FastChunker> {
    await initWasm();

    const resolvedOptions = {
      chunkSize: options.chunkSize ?? 4096,
      delimiters: options.delimiters ?? '\n.?',
      pattern: options.pattern,
      prefix: options.prefix ?? false,
      consecutive: options.consecutive ?? false,
      forwardFallback: options.forwardFallback ?? false,
    };

    return new FastChunker(resolvedOptions);
  }

  /**
   * Chunk a single text into byte-bounded chunks.
   */
  chunk(text: string): Chunk[] {
    if (!text) {
      return [];
    }

    const bytes = this.encoder.encode(text);
    const options = {
      size: this.chunkSize,
      prefix: this.prefix,
      consecutive: this.consecutive,
      forwardFallback: this.forwardFallback,
      ...(this.pattern !== undefined
        ? { pattern: this.pattern }
        : { delimiters: this.delimiters }),
    };

    const offsets = chunk_offsets(bytes, options);
    const chunks: Chunk[] = [];
    let charPos = 0;

    for (const [start, end] of offsets) {
      const chunkText = this.decoder.decode(bytes.subarray(start, end));
      const chunkCharLen = chunkText.length;
      chunks.push(new Chunk({
        text: chunkText,
        startIndex: charPos,
        endIndex: charPos + chunkCharLen,
        tokenCount: 0,
      }));
      charPos += chunkCharLen;
    }

    return chunks;
  }

  /**
   * Chunk a batch of texts.
   */
  chunkBatch(texts: string[]): Chunk[][] {
    return texts.map(text => this.chunk(text));
  }

  toString(): string {
    return `FastChunker(chunkSize=${this.chunkSize}, delimiters=${JSON.stringify(this.delimiters)}, pattern=${JSON.stringify(this.pattern)}, prefix=${this.prefix}, consecutive=${this.consecutive}, forwardFallback=${this.forwardFallback})`;
  }
}
