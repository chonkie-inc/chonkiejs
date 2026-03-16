/**
 * Semantic chunker that uses embedding-based similarity to find natural chunk boundaries.
 *
 * Computes window embeddings over sliding sentence windows, measures semantic
 * similarity between consecutive windows, then detects low-similarity valleys
 * as split points — mirroring the Python SemanticChunker's peak-detection approach.
 */

import { init as initChunk, split_offsets } from '@chonkiejs/chunk';
import { Tokenizer } from '@/tokenizer';
import { Chunk } from '@/types';

// ─── Embedding interface ──────────────────────────────────────────────────────

/** A function that returns embeddings for an array of texts. */
export type EmbedFunction = (texts: string[]) => Promise<number[][]>;

/** Object-style embedding model (e.g. a class with an embed method). */
export interface EmbeddingModel {
  embed(texts: string[]): Promise<number[][]>;
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface Sentence {
  text: string;
  startIndex: number;
  endIndex: number;
  tokenCount: number;
}

// ─── Options ──────────────────────────────────────────────────────────────────

export interface SemanticChunkerOptions {
  /**
   * Embedding provider. Either a plain async function `(texts) => number[][]`
   * or any object with an `embed(texts)` method.
   */
  embeddings: EmbedFunction | EmbeddingModel;

  /**
   * Similarity threshold (0–1). Valleys below this value are considered
   * candidate split points. Lower → more splits. (default: 0.5)
   */
  threshold?: number;

  /** Maximum tokens per chunk. (default: 512) */
  chunkSize?: number;

  /**
   * Number of sentences combined into each sliding window embedding.
   * (default: 3)
   */
  similarityWindow?: number;

  /** Minimum sentences that must appear in a chunk. (default: 1) */
  minSentencesPerChunk?: number;

  /** Sentences shorter than this character count are dropped. (default: 24) */
  minCharactersPerSentence?: number;

  /**
   * Sentence-splitting delimiters. Defaults to ['. ', '! ', '? ', '\n'].
   */
  delimiters?: string | string[];

  /**
   * Where to place the delimiter character in the output sentence.
   * (default: 'prev')
   */
  includeDelim?: 'prev' | 'next' | 'none';

  /** Tokenizer instance or HuggingFace model name. (default: 'character') */
  tokenizer?: Tokenizer | string;

  /**
   * Smoothing window for valley detection (analogous to the Python filter_window).
   * Must be odd and ≥ 3. (default: 5)
   */
  filterWindow?: number;

  /**
   * Number of groups to look ahead when merging semantically similar
   * consecutive groups. 0 disables skip-and-merge. (default: 0)
   */
  skipWindow?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Cosine similarity between two equal-length vectors. */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Simple moving-average smoothing with reflected boundary conditions.
 * Window must be odd and ≥ 3.
 */
function smooth(values: number[], window: number): number[] {
  const half = Math.floor(window / 2);
  const n = values.length;
  return values.map((_, i) => {
    let sum = 0, count = 0;
    for (let j = i - half; j <= i + half; j++) {
      const idx = j < 0 ? -j : j >= n ? 2 * n - j - 2 : j;
      if (idx >= 0 && idx < n) { sum += values[idx]; count++; }
    }
    return count > 0 ? sum / count : values[i];
  });
}

/**
 * Return indices of local minima in `values` where the smoothed value is
 * below `threshold`. Enforces a minimum distance of `minDist` between minima.
 */
function findValleys(
  values: number[],
  threshold: number,
  filterWindow: number,
  minDist: number
): number[] {
  if (values.length < 3) return [];

  const actualWindow = Math.min(filterWindow, values.length % 2 === 0 ? values.length - 1 : values.length);
  const effectiveWindow = actualWindow < 3 ? 3 : (actualWindow % 2 === 0 ? actualWindow - 1 : actualWindow);
  const smoothed = smooth(values, effectiveWindow);

  const minima: number[] = [];
  let lastMinIdx = -Infinity;

  for (let i = 1; i < smoothed.length - 1; i++) {
    if (
      smoothed[i] < smoothed[i - 1] &&
      smoothed[i] < smoothed[i + 1] &&
      smoothed[i] < threshold &&
      i - lastMinIdx >= minDist
    ) {
      minima.push(i);
      lastMinIdx = i;
    }
  }

  return minima;
}

// Track WASM init
let wasmInitialized = false;
async function ensureWasm(): Promise<void> {
  if (!wasmInitialized) {
    await initChunk();
    wasmInitialized = true;
  }
}

// ─── SemanticChunker ──────────────────────────────────────────────────────────

/**
 * Chunks text by detecting semantic boundaries using embedding similarity.
 *
 * Algorithm (mirrors the Python SemanticChunker):
 * 1. Split text into sentences via WASM.
 * 2. Compute sliding-window embeddings of `similarityWindow` consecutive sentences.
 * 3. Compute cosine similarity between each window and the sentence immediately after it.
 * 4. Detect valleys (local minima below threshold) in the similarity signal.
 * 5. Group sentences between valley positions into candidate chunks.
 * 6. Optionally merge semantically similar adjacent groups (skipWindow > 0).
 * 7. Split any group that exceeds `chunkSize` tokens.
 */
export class SemanticChunker {
  public readonly threshold: number;
  public readonly chunkSize: number;
  public readonly similarityWindow: number;
  public readonly minSentencesPerChunk: number;
  public readonly minCharactersPerSentence: number;
  public readonly delimiters: string[];
  public readonly includeDelim: 'prev' | 'next' | 'none';
  public readonly filterWindow: number;
  public readonly skipWindow: number;

  private readonly embed: EmbedFunction;
  private tokenizer: Tokenizer;

  private constructor(
    embed: EmbedFunction,
    tokenizer: Tokenizer,
    options: Required<Omit<SemanticChunkerOptions, 'embeddings' | 'tokenizer'>> & {
      delimiters: string[];
    }
  ) {
    this.embed = embed;
    this.tokenizer = tokenizer;
    this.threshold = options.threshold;
    this.chunkSize = options.chunkSize;
    this.similarityWindow = options.similarityWindow;
    this.minSentencesPerChunk = options.minSentencesPerChunk;
    this.minCharactersPerSentence = options.minCharactersPerSentence;
    this.delimiters = options.delimiters;
    this.includeDelim = options.includeDelim;
    this.filterWindow = options.filterWindow;
    this.skipWindow = options.skipWindow;
  }

  /**
   * Create a SemanticChunker.
   *
   * @example
   * // With a plain embed function
   * const chunker = await SemanticChunker.create({
   *   embeddings: async (texts) => myModel.encode(texts),
   *   threshold: 0.5,
   *   chunkSize: 512,
   * });
   *
   * @example
   * // With an object model
   * const chunker = await SemanticChunker.create({
   *   embeddings: myEmbeddingModel,   // must have .embed(texts) method
   *   chunkSize: 1024,
   * });
   */
  static async create(options: SemanticChunkerOptions): Promise<SemanticChunker> {
    await ensureWasm();

    const {
      embeddings,
      threshold = 0.5,
      chunkSize = 512,
      similarityWindow = 3,
      minSentencesPerChunk = 1,
      minCharactersPerSentence = 24,
      delimiters = ['. ', '! ', '? ', '\n'],
      includeDelim = 'prev',
      tokenizer = 'character',
      filterWindow = 5,
      skipWindow = 0,
    } = options;

    // Validate
    if (threshold <= 0 || threshold >= 1) throw new Error('threshold must be between 0 and 1');
    if (chunkSize <= 0) throw new Error('chunkSize must be greater than 0');
    if (similarityWindow <= 0) throw new Error('similarityWindow must be greater than 0');
    if (minSentencesPerChunk <= 0) throw new Error('minSentencesPerChunk must be greater than 0');
    if (filterWindow < 3) throw new Error('filterWindow must be at least 3');
    if (skipWindow < 0) throw new Error('skipWindow must be non-negative');

    // Resolve embed function
    const embed: EmbedFunction = typeof embeddings === 'function'
      ? embeddings
      : (texts) => embeddings.embed(texts);

    // Resolve tokenizer
    const tokenizerInstance = typeof tokenizer === 'string'
      ? await Tokenizer.create(tokenizer)
      : tokenizer;

    const delimArray = Array.isArray(delimiters) ? delimiters : [delimiters];

    return new SemanticChunker(embed, tokenizerInstance, {
      threshold,
      chunkSize,
      similarityWindow,
      minSentencesPerChunk,
      minCharactersPerSentence,
      delimiters: delimArray,
      includeDelim,
      filterWindow,
      skipWindow,
    });
  }

  // ─── Private pipeline steps ───────────────────────────────────────────────

  private splitSentences(text: string): string[] {
    // Extract unique non-space delimiter chars for the WASM single-char splitter
    const raw = this.delimiters.join('');
    const delimChars = [...new Set(raw)].filter(c => c !== ' ').join('');

    const offsets = split_offsets(text, {
      delimiters: delimChars,
      includeDelim: this.includeDelim === 'none' ? 'none' : this.includeDelim,
      minChars: this.minCharactersPerSentence,
    });

    return offsets
      .map(([s, e]) => text.slice(s, e))
      .filter(s => s.length > 0);
  }

  private async prepareSentences(text: string): Promise<Sentence[]> {
    if (!text || text.trim().length === 0) return [];

    const rawSentences = this.splitSentences(text);
    if (rawSentences.length === 0) return [];

    const tokenCounts = await Promise.all(
      rawSentences.map(s => this.tokenizer.countTokens(s))
    );

    const sentences: Sentence[] = [];
    let cursor = 0;
    for (let i = 0; i < rawSentences.length; i++) {
      const s = rawSentences[i];
      sentences.push({
        text: s,
        startIndex: cursor,
        endIndex: cursor + s.length,
        tokenCount: tokenCounts[i],
      });
      cursor += s.length;
    }
    return sentences;
  }

  /**
   * Build window texts: for each i, join sentences[i..i+window].
   * Produces len(sentences) - similarityWindow windows.
   */
  private buildWindows(sentences: Sentence[]): string[] {
    const windows: string[] = [];
    for (let i = 0; i < sentences.length - this.similarityWindow; i++) {
      windows.push(
        sentences.slice(i, i + this.similarityWindow).map(s => s.text).join('')
      );
    }
    return windows;
  }

  /**
   * Compute cosine similarity between each window embedding and the sentence
   * embedding immediately following that window (index i + similarityWindow).
   */
  private async getSimilarities(sentences: Sentence[]): Promise<number[]> {
    const windowTexts = this.buildWindows(sentences);
    const sentenceTexts = sentences.slice(this.similarityWindow).map(s => s.text);

    // Batch both in one call where possible
    const [windowEmbeddings, sentenceEmbeddings] = await Promise.all([
      this.embed(windowTexts),
      this.embed(sentenceTexts),
    ]);

    return windowEmbeddings.map((w, i) => cosineSimilarity(w, sentenceEmbeddings[i]));
  }

  /**
   * Find sentence-level split indices from the similarity signal.
   * Returns absolute indices into the `sentences` array (including 0 and len).
   */
  private getSplitIndices(similarities: number[], totalSentences: number): number[] {
    if (similarities.length === 0) return [0, totalSentences];

    const valleys = findValleys(
      similarities,
      this.threshold,
      this.filterWindow,
      this.minSentencesPerChunk
    );

    if (valleys.length === 0) return [0, totalSentences];

    // Valley at similarity index i corresponds to a split BEFORE sentence i + similarityWindow
    const splits = valleys.map(i => i + this.similarityWindow);

    return [0, ...splits, totalSentences];
  }

  private groupSentences(sentences: Sentence[], splitIndices: number[]): Sentence[][] {
    const groups: Sentence[][] = [];
    for (let i = 0; i < splitIndices.length - 1; i++) {
      const group = sentences.slice(splitIndices[i], splitIndices[i + 1]);
      if (group.length > 0) groups.push(group);
    }
    return groups;
  }

  /** Split any group that exceeds chunkSize into sub-groups. */
  private splitOversizedGroups(groups: Sentence[][]): Sentence[][] {
    const result: Sentence[][] = [];
    for (const group of groups) {
      const total = group.reduce((s, sent) => s + sent.tokenCount, 0);
      if (total <= this.chunkSize) {
        result.push(group);
      } else {
        let current: Sentence[] = [];
        let count = 0;
        for (const sent of group) {
          if (count + sent.tokenCount > this.chunkSize && current.length > 0) {
            result.push(current);
            current = [];
            count = 0;
          }
          current.push(sent);
          count += sent.tokenCount;
        }
        if (current.length > 0) result.push(current);
      }
    }
    return result;
  }

  /** Optionally merge semantically similar adjacent groups. */
  private async skipAndMerge(groups: Sentence[][]): Promise<Sentence[][]> {
    if (groups.length <= 1 || this.skipWindow === 0) return groups;

    const groupTexts = groups.map(g => g.map(s => s.text).join(''));
    const embeddings = await this.embed(groupTexts);

    const merged: Sentence[][] = [];
    let i = 0;

    while (i < groups.length) {
      if (i === groups.length - 1) {
        merged.push(groups[i]);
        break;
      }

      const skipEnd = Math.min(i + this.skipWindow + 1, groups.length - 1);
      let bestSim = -1;
      let bestIdx = -1;

      for (let j = i + 1; j <= skipEnd; j++) {
        const sim = cosineSimilarity(embeddings[i], embeddings[j]);
        if (sim >= this.threshold && sim > bestSim) {
          bestSim = sim;
          bestIdx = j;
        }
      }

      if (bestIdx !== -1) {
        const combined: Sentence[] = [];
        for (let k = i; k <= bestIdx; k++) combined.push(...groups[k]);
        merged.push(combined);
        i = bestIdx + 1;
      } else {
        merged.push(groups[i]);
        i++;
      }
    }

    return merged;
  }

  private createChunks(groups: Sentence[][]): Chunk[] {
    const chunks: Chunk[] = [];
    let cursor = 0;
    for (const group of groups) {
      const text = group.map(s => s.text).join('');
      const tokenCount = group.reduce((s, sent) => s + sent.tokenCount, 0);
      chunks.push(new Chunk({
        text,
        startIndex: cursor,
        endIndex: cursor + text.length,
        tokenCount,
      }));
      cursor += text.length;
    }
    return chunks;
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Chunk a single text into semantic chunks.
   *
   * @param text - The text to chunk
   * @returns Array of chunks with semantic boundaries
   */
  async chunk(text: string): Promise<Chunk[]> {
    if (!text || text.trim().length === 0) return [];

    const sentences = await this.prepareSentences(text);
    if (sentences.length === 0) return [];

    // Too few sentences to compute windows — return as one chunk
    if (sentences.length <= this.similarityWindow) {
      const fullText = sentences.map(s => s.text).join('');
      const tokenCount = sentences.reduce((s, sent) => s + sent.tokenCount, 0);
      return [new Chunk({ text: fullText, startIndex: 0, endIndex: fullText.length, tokenCount })];
    }

    const similarities = await this.getSimilarities(sentences);
    const splitIndices = this.getSplitIndices(similarities, sentences.length);

    let groups = this.groupSentences(sentences, splitIndices);

    if (this.skipWindow > 0) {
      groups = await this.skipAndMerge(groups);
    }

    groups = this.splitOversizedGroups(groups);

    return this.createChunks(groups);
  }

  /**
   * Chunk multiple texts.
   *
   * @param texts - Array of texts to chunk
   * @returns Array of chunk arrays, one per input text
   */
  async chunkBatch(texts: string[]): Promise<Chunk[][]> {
    return Promise.all(texts.map(t => this.chunk(t)));
  }

  toString(): string {
    return (
      `SemanticChunker(threshold=${this.threshold}, chunkSize=${this.chunkSize}, ` +
      `similarityWindow=${this.similarityWindow}, filterWindow=${this.filterWindow})`
    );
  }
}
