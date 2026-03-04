/**
 * Table chunker for processing markdown and HTML tables.
 */

import { Tokenizer } from '@/tokenizer';
import { Chunk } from '@/types';

export interface TableChunkerOptions {
  /**
   * Tokenizer to use. Use 'row' (default) for row-based chunking,
   * or any tokenizer string/instance for token-based chunking.
   */
  tokenizer?: Tokenizer | 'row' | string;
  /**
   * Maximum chunk size. For 'row' tokenizer, this is max data rows per chunk.
   * For other tokenizers, this is max tokens per chunk.
   * Default: 3
   */
  chunkSize?: number;
}

/**
 * Chunks markdown or HTML tables by splitting rows into smaller sub-tables,
 * each repeating the original header.
 *
 * Supports two modes:
 * - Row mode ('row' tokenizer): groups up to `chunkSize` data rows per chunk
 * - Token mode (any other tokenizer): fits as many rows as possible within `chunkSize` tokens
 */
export class TableChunker {
  public readonly chunkSize: number;
  private tokenizer: Tokenizer | null;
  private readonly isRowMode: boolean;

  private constructor(
    tokenizer: Tokenizer | null,
    chunkSize: number,
    isRowMode: boolean
  ) {
    if (chunkSize <= 0) {
      throw new Error('chunkSize must be greater than 0');
    }
    this.tokenizer = tokenizer;
    this.chunkSize = chunkSize;
    this.isRowMode = isRowMode;
  }

  /**
   * Create a TableChunker instance.
   *
   * @param options - Configuration options
   * @returns Promise resolving to TableChunker instance
   *
   * @example
   * // Row-based (default): each chunk has at most 3 data rows
   * const chunker = await TableChunker.create();
   *
   * @example
   * // Row-based with custom row count
   * const chunker = await TableChunker.create({ tokenizer: 'row', chunkSize: 5 });
   *
   * @example
   * // Token-based chunking
   * const chunker = await TableChunker.create({ tokenizer: 'character', chunkSize: 512 });
   */
  static async create(options: TableChunkerOptions = {}): Promise<TableChunker> {
    const { tokenizer = 'row', chunkSize = 3 } = options;

    if (tokenizer === 'row') {
      return new TableChunker(null, chunkSize, true);
    }

    let tokenizerInstance: Tokenizer;
    if (typeof tokenizer === 'string') {
      tokenizerInstance = await Tokenizer.create(tokenizer);
    } else {
      tokenizerInstance = tokenizer;
    }

    return new TableChunker(tokenizerInstance, chunkSize, false);
  }

  /**
   * Split a markdown table into its header (column names + separator line)
   * and an array of data row strings.
   */
  private splitMarkdownTable(table: string): [string, string[]] {
    table = table.trim();
    // Split on newlines that precede a pipe character
    const parts: string[] = [];
    let last = 0;
    for (let i = 0; i < table.length - 1; i++) {
      if (table[i] === '\n' && table[i + 1] === '|') {
        parts.push(table.slice(last, i + 1)); // include the \n in previous part
        last = i + 1;
      }
    }
    parts.push(table.slice(last));

    const nonEmpty = parts.filter(p => p.length > 0);
    const header = nonEmpty.slice(0, 2).join(''); // column line + separator line
    const rows = nonEmpty.slice(2);
    return [header, rows];
  }

  /**
   * Extract <tr>...</tr> row strings from HTML body content.
   */
  private findHtmlRows(bodyContent: string): string[] {
    const rows: string[] = [];
    const lower = bodyContent.toLowerCase();
    let pos = 0;
    while (true) {
      const trStart = lower.indexOf('<tr', pos);
      if (trStart === -1) break;
      const trTagEnd = lower.indexOf('>', trStart);
      if (trTagEnd === -1) break;
      const closeStart = lower.indexOf('</tr>', trTagEnd + 1);
      if (closeStart === -1) break;
      rows.push(bodyContent.slice(trStart, closeStart + 5)); // 5 = '</tr>'.length
      pos = closeStart + 5;
    }
    return rows;
  }

  /**
   * Split an HTML table into its header (everything up to tbody content)
   * and an array of <tr> row strings.
   */
  private splitHtmlTable(table: string): [string, string[]] {
    table = table.trim();
    const lower = table.toLowerCase();

    const tbodyStart = lower.indexOf('<tbody');
    if (tbodyStart !== -1) {
      const tbodyTagEnd = lower.indexOf('>', tbodyStart);
      if (tbodyTagEnd !== -1) {
        const header = table.slice(0, tbodyTagEnd + 1);
        const tbodyClose = lower.indexOf('</tbody>', tbodyTagEnd + 1);
        const bodyEnd = tbodyClose !== -1 ? tbodyClose : table.length;
        const bodyContent = table.slice(tbodyTagEnd + 1, bodyEnd);
        const rows = this.findHtmlRows(bodyContent);
        return [header, rows];
      }
    }

    // No tbody: treat everything before the first <tr> as header
    const rows = this.findHtmlRows(table);
    if (rows.length === 0) {
      return [table, []];
    }
    const firstRowIdx = table.toLowerCase().indexOf('<tr');
    const header = table.slice(0, firstRowIdx);
    return [header, rows];
  }

  /**
   * Chunk a markdown or HTML table into smaller sub-tables, each repeating the header.
   *
   * @param text - The input markdown or HTML table as a string
   * @returns Array of chunks
   */
  chunk(text: string): Chunk[] {
    if (!text.trim()) {
      return [];
    }

    const isHtml = text.toLowerCase().includes('<table');
    let header: string;
    let dataRows: string[];
    let footer: string;

    if (isHtml) {
      [header, dataRows] = this.splitHtmlTable(text);
      footer = text.toLowerCase().includes('</tbody>') ? '</tbody></table>' : '</table>';
      if (dataRows.length < 1) {
        return [];
      }
    } else {
      const lines = text.trim().split('\n');
      if (lines.length < 3) {
        // Need header row, separator row, and at least one data row
        return [];
      }
      [header, dataRows] = this.splitMarkdownTable(text);
      footer = '';
    }

    if (this.isRowMode) {
      return this.chunkByRows(text, header, dataRows, footer);
    } else {
      return this.chunkByTokens(text, header, dataRows, footer);
    }
  }

  private chunkByRows(
    originalText: string,
    header: string,
    dataRows: string[],
    footer: string
  ): Chunk[] {
    if (dataRows.length <= this.chunkSize) {
      return [
        new Chunk({
          text: originalText,
          tokenCount: dataRows.length,
          startIndex: 0,
          endIndex: originalText.length,
        }),
      ];
    }

    const chunks: Chunk[] = [];
    const headerLen = header.length;
    let currentCharIndex = headerLen;

    for (let i = 0; i < dataRows.length; i += this.chunkSize) {
      const chunkRows = dataRows.slice(i, i + this.chunkSize);
      const chunkText = header + chunkRows.join('') + footer;
      const dataRowsLen = chunkRows.join('').length;

      chunks.push(
        new Chunk({
          text: chunkText,
          tokenCount: chunkRows.length,
          startIndex: currentCharIndex,
          endIndex: currentCharIndex + dataRowsLen,
        })
      );

      currentCharIndex += dataRowsLen;
    }

    return chunks;
  }

  private chunkByTokens(
    originalText: string,
    header: string,
    dataRows: string[],
    footer: string
  ): Chunk[] {
    const tok = this.tokenizer!;

    const tableTokenCount = tok.countTokens(originalText.trim());
    if (tableTokenCount <= this.chunkSize) {
      return [
        new Chunk({
          text: originalText,
          tokenCount: tableTokenCount,
          startIndex: 0,
          endIndex: originalText.length,
        }),
      ];
    }

    const headerTokenCount = tok.countTokens(header);
    const footerTokenCount = footer ? tok.countTokens(footer) : 0;
    let currentTokenCount = headerTokenCount + footerTokenCount;
    let currentIndex = 0;
    let currentChunk = [header];
    const chunks: Chunk[] = [];

    for (const row of dataRows) {
      const rowSize = tok.countTokens(row);

      if (currentTokenCount + rowSize >= this.chunkSize && currentChunk.length > 1) {
        const chunkText = currentChunk.join('') + footer;
        const chunkBodyLen =
          chunks.length === 0
            ? currentChunk.join('').length
            : currentChunk.join('').length - header.length;

        chunks.push(
          new Chunk({
            text: chunkText,
            startIndex: currentIndex,
            endIndex: currentIndex + chunkBodyLen,
            tokenCount: currentTokenCount,
          })
        );
        currentIndex += chunkBodyLen;
        currentChunk = [header, row];
        currentTokenCount = headerTokenCount + footerTokenCount + rowSize;
      } else {
        currentChunk.push(row);
        currentTokenCount += rowSize;
      }
    }

    // Flush remaining rows
    if (currentChunk.length > 1) {
      const chunkText = currentChunk.join('') + footer;
      const chunkBodyLen =
        chunks.length === 0
          ? chunkText.length
          : currentChunk.join('').length - header.length;

      chunks.push(
        new Chunk({
          text: chunkText,
          startIndex: currentIndex,
          endIndex: currentIndex + chunkBodyLen,
          tokenCount: currentTokenCount,
        })
      );
    }

    return chunks;
  }

  toString(): string {
    const tok = this.isRowMode ? 'row' : this.tokenizer!.toString();
    return `TableChunker(tokenizer=${tok}, chunkSize=${this.chunkSize})`;
  }
}
