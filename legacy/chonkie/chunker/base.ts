/** Base Chunking Class. **/

import { Tokenizer } from "../tokenizer";
import { Chunk } from "../types/base";

/**
 * Base class for all chunking classes.
 *
 * This abstract class provides a common interface and shared logic for all chunking implementations.
 * It supports chunking a single text or a batch of texts, with optional concurrency and progress reporting.
 *
 * Subclasses must implement the `chunk` method to define how a single text is chunked.
 *
 * @template T - The type of chunk produced (usually `Chunk[]` or `string[]`).
 *
 * @property {Tokenizer} tokenizer - The tokenizer instance used for chunking operations.
 * @property {boolean} _useConcurrency - Whether to use concurrent processing for batch chunking (default: true).
 *
 * @example
 * class MyChunker extends BaseChunker {
 *   async chunk(text: string): Promise<Chunk[]> {
 *     // ... implementation ...
 *   }
 * }
 *
 * const chunker = new MyChunker(tokenizer);
 * const chunks = await chunker.call("Some text");
 * const batchChunks = await chunker.call(["Text 1", "Text 2"], true);
 */
export abstract class BaseChunker {
  protected tokenizer: Tokenizer;
  protected _useConcurrency: boolean = true; // Determines if batch processing uses Promise.all

  constructor(tokenizer: Tokenizer) {
    this.tokenizer = tokenizer;
  }

  /**
   * Returns a string representation of the chunker instance.
   *
   * @returns {string} The class name and constructor signature.
   */
  public toString(): string {
    return `${this.constructor.name}()`;
  }

  /**
   * Call the chunker with a single string or an array of strings.
   *
   * If a single string is provided, returns the result of `chunk(text)`.
   * If an array of strings is provided, returns the result of `chunkBatch(texts, showProgress)`.
   *
   * @param {string | string[]} textOrTexts - The text or array of texts to chunk.
   * @param {boolean} [showProgress=false] - Whether to display progress for batch operations (only applies to arrays).
   * @returns {Promise<Chunk[] | Chunk[][]>} The chunked result(s).
   * @throws {Error} If input is not a string or array of strings.
   */
  public async call(text: string, showProgress?: boolean): Promise<Chunk[]>;
  public async call(texts: string[], showProgress?: boolean): Promise<Chunk[][]>;
  public async call(
    textOrTexts: string | string[],
    showProgress: boolean = false
  ): Promise<Chunk[] | Chunk[][]> {
    if (typeof textOrTexts === 'string') {
      return this.chunk(textOrTexts) as Promise<Chunk[]>;
    } else if (Array.isArray(textOrTexts)) {
      return this.chunkBatch(textOrTexts, showProgress) as Promise<Chunk[][]>;
    } else {
      // This case should ideally not be reached due to TypeScript's type checking
      // if the public overloads are used correctly.
      throw new Error("Input must be a string or an array of strings.");
    }
  }

  /**
   * Process a batch of texts sequentially (one after another).
   *
   * @protected
   * @param {string[]} texts - The texts to chunk.
   * @param {boolean} [showProgress=false] - Whether to display progress in the console.
   * @returns {Promise<Chunk[][]>} An array of chunked results for each input text.
   */
  protected async _sequential_batch_processing(
    texts: string[],
    showProgress: boolean = false
  ): Promise<Chunk[][]> {
    const results: Chunk[][] = [];
    const total = texts.length;
    for (let i = 0; i < total; i++) {
      if (showProgress && total > 1) {
        const progress = Math.round(((i + 1) / total) * 100);
        process.stdout.write(`Sequential processing: Document ${i + 1}/${total} (${progress}%)\r`);
      }
      results.push(await this.chunk(texts[i]));
    }
    if (showProgress && total > 1) {
      process.stdout.write("\n"); // Newline after progress
    }
    return results;
  }

  /**
   * Process a batch of texts concurrently using Promise.all.
   *
   * @protected
   * @param {string[]} texts - The texts to chunk.
   * @param {boolean} [showProgress=false] - Whether to display progress in the console.
   * @returns {Promise<Chunk[][]>} An array of chunked results for each input text.
   */
  protected async _concurrent_batch_processing(
    texts: string[],
    showProgress: boolean = false
  ): Promise<Chunk[][]> {
    const total = texts.length;
    let completedCount = 0;

    const updateProgress = () => {
      if (showProgress && total > 1) {
        completedCount++;
        const progress = Math.round((completedCount / total) * 100);
        process.stdout.write(`Concurrent processing: Document ${completedCount}/${total} (${progress}%)\r`);
      }
    };

    const chunkPromises = texts.map(text =>
      this.chunk(text).then(result => {
        updateProgress();
        return result;
      })
    );

    const results = await Promise.all(chunkPromises);
    if (showProgress && total > 1 && completedCount > 0) { // ensure newline only if progress was shown
      process.stdout.write("\n"); // Newline after progress
    }
    return results;
  }

  /**
   * Abstract method to chunk a single text. Must be implemented by subclasses.
   *
   * @param {string} text - The text to chunk.
   * @returns {Promise<Chunk[]>} The chunked representation of the input text.
   * @abstract
   */
  public abstract chunk(text: string): Promise<Chunk[]>;

  /**
   * Chunk a batch of texts, using either concurrent or sequential processing.
   *
   * If only one text is provided, processes it directly without batch overhead.
   *
   * @param {string[]} texts - The texts to chunk.
   * @param {boolean} [showProgress=true] - Whether to display progress in the console.
   * @returns {Promise<Chunk[][]>} An array of chunked results for each input text.
   */
  public async chunkBatch(
    texts: string[],
    showProgress: boolean = true
  ): Promise<Chunk[][]> {
    if (texts.length === 0) {
      return [];
    }
    // If only one text, process it directly without batch overhead, progress not shown for single item.
    if (texts.length === 1) {
      return [await this.chunk(texts[0]) as Chunk[]];
    }

    // For multiple texts, use selected batch processing strategy
    if (this._useConcurrency) {
      return this._concurrent_batch_processing(texts, showProgress);
    } else {
      return this._sequential_batch_processing(texts, showProgress);
    }
  }
}
