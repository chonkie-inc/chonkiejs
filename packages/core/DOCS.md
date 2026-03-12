# @chonkie/core Documentation

Complete API reference and usage guide for @chonkie/core.

## Table of Contents

- [Installation](#installation)
- [RecursiveChunker](#recursivechunker)
- [TableChunker](#tablechunker)
- [FastChunker](#fastchunker)
- [Tokenizer](#tokenizer)
- [Chunk](#chunk)
- [RecursiveRules](#recursiverules)
- [RecursiveLevel](#recursivelevel)
- [Examples](#examples)

## Installation

```bash
npm install @chonkie/core
```

## RecursiveChunker

Main class for recursive text chunking. Splits text hierarchically using customizable rules.

### Constructor

```typescript
new RecursiveChunker(options?: RecursiveChunkerOptions)
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `chunkSize` | `number` | `512` | Maximum tokens per chunk |
| `minCharactersPerChunk` | `number` | `24` | Minimum characters when merging small splits |
| `rules` | `RecursiveRules` | Default rules | Custom chunking hierarchy |
| `tokenizer` | `Tokenizer` | Character tokenizer | Custom tokenizer instance |

**Example:**

```typescript
import { RecursiveChunker } from '@chonkie/core';

const chunker = new RecursiveChunker({
  chunkSize: 512,
  minCharactersPerChunk: 24
});
```

### Methods

#### `chunk(text: string): Promise<Chunk[]>`

Chunks a single text into an array of chunks.

**Parameters:**
- `text` (string) - The text to chunk

**Returns:**
- `Promise<Chunk[]>` - Array of chunks

**Example:**

```typescript
const chunks = await chunker.chunk('Your text here...');

for (const chunk of chunks) {
  console.log(chunk.text);
  console.log(`Position: ${chunk.startIndex}-${chunk.endIndex}`);
  console.log(`Tokens: ${chunk.tokenCount}`);
}
```

### How Recursive Chunking Works

The `RecursiveChunker` splits text hierarchically:

1. **Paragraphs** - Split on `\n\n`, `\r\n`, `\n`, `\r`
2. **Sentences** - Split on `. `, `! `, `? `
3. **Punctuation** - Split on `{`, `}`, `(`, `)`, `,`, etc.
4. **Words** - Split on whitespace
5. **Characters** - Token-level splitting (final fallback)

Each level only activates if chunks from the previous level exceed `chunkSize`.

## FastChunker

High-performance byte-based chunker powered by `@chonkiejs/chunk`.

Use this chunker when you want delimiter/pattern boundary chunking with minimal overhead and do not need token-based limits.

### Creation

```typescript
import { FastChunker } from '@chonkiejs/core';

const chunker = await FastChunker.create({
  chunkSize: 4096,
  delimiters: '\n.?',
  prefix: false,
  consecutive: false,
  forwardFallback: false
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `chunkSize` | `number` | `4096` | Target chunk size in bytes |
| `delimiters` | `string` | `\"\\n.?\"` | Delimiter characters used for boundary search |
| `pattern` | `string \| Uint8Array` | `undefined` | Multi-byte pattern to split on (overrides `delimiters`) |
| `prefix` | `boolean` | `false` | Put delimiter/pattern at the start of the next chunk |
| `consecutive` | `boolean` | `false` | Split at the start of consecutive delimiter/pattern runs |
| `forwardFallback` | `boolean` | `false` | Search forward when no boundary is found in backward window |

### Methods

#### `chunk(text: string): Chunk[]`

Chunks a single text into byte-bounded chunks.

```typescript
const chunks = chunker.chunk('First sentence. Second sentence. Third sentence.');

for (const chunk of chunks) {
  console.log(chunk.text);
  console.log(`Position: ${chunk.startIndex}-${chunk.endIndex}`);
  console.log(`Token count: ${chunk.tokenCount}`); // Always 0 for FastChunker
}
```

#### `chunkBatch(texts: string[]): Chunk[][]`

Chunks a batch of texts.

```typescript
const batch = chunker.chunkBatch([
  'Document one...',
  'Document two...',
]);
```

## TableChunker

Chunks Markdown and HTML tables into smaller sub-tables while keeping the original table header in every chunk.

Supports two modes:
- `row` mode: `chunkSize` is the maximum number of data rows per chunk.
- token mode: `chunkSize` is the maximum token count per chunk.

### Creation

```typescript
import { TableChunker } from '@chonkiejs/core';

// Row mode (default): up to 3 data rows per chunk
const rowChunker = await TableChunker.create({
  tokenizer: 'row',
  chunkSize: 3
});

// Token mode: use tokenizer-based limits
const tokenChunker = await TableChunker.create({
  tokenizer: 'character',
  chunkSize: 512
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tokenizer` | `Tokenizer \| 'row' \| string` | `'row'` | Chunking mode/tokenizer. `'row'` uses row-based chunking. |
| `chunkSize` | `number` | `3` | Max rows per chunk (`'row'` mode) or max tokens per chunk (token mode). |

### Methods

#### `chunk(text: string): Chunk[]`

Chunks a Markdown or HTML table string.

```typescript
const markdownTable = `
| Name | Age | City |
|------|-----|------|
| Alice | 30 | NYC |
| Bob | 25 | LA |
| Carol | 35 | Chicago |
`.trim();

const chunker = await TableChunker.create({ tokenizer: 'row', chunkSize: 2 });
const chunks = chunker.chunk(markdownTable);

for (const chunk of chunks) {
  console.log(chunk.text);
}
```

### Notes

- In row mode, `tokenCount` on output chunks represents number of data rows in that chunk.
- In token mode, `tokenCount` represents tokenizer-based token count.
- Empty/invalid table input returns an empty array.

## Tokenizer

Simple character-based tokenizer where 1 character = 1 token.

### Constructor

```typescript
new Tokenizer()
```

### Methods

#### `countTokens(text: string): number`

Counts the number of tokens (characters) in text.

```typescript
const tokenizer = new Tokenizer();
const count = tokenizer.countTokens('Hello'); // Returns 5
```

#### `encode(text: string): number[]`

Encodes text into character codes.

```typescript
const tokens = tokenizer.encode('Hi'); // Returns [72, 105]
```

#### `decode(tokens: number[]): string`

Decodes character codes back into text.

```typescript
const text = tokenizer.decode([72, 105]); // Returns 'Hi'
```

#### `decodeBatch(tokensBatch: number[][]): string[]`

Decodes multiple token arrays.

```typescript
const texts = tokenizer.decodeBatch([[72, 105], [66, 121, 101]]);
// Returns ['Hi', 'Bye']
```

## Chunk

Represents a text chunk with metadata.

### Constructor

```typescript
new Chunk(data: {
  text: string;
  startIndex: number;
  endIndex: number;
  tokenCount: number;
})
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `text` | `string` | The chunk text content |
| `startIndex` | `number` | Starting position in original text |
| `endIndex` | `number` | Ending position in original text |
| `tokenCount` | `number` | Number of tokens in the chunk |

### Methods

#### `toString(): string`

Returns the chunk's text content.

```typescript
const chunk = new Chunk({
  text: 'Hello',
  startIndex: 0,
  endIndex: 5,
  tokenCount: 5
});

console.log(chunk.toString()); // 'Hello'
```

## RecursiveRules

Defines the hierarchy of rules for recursive chunking.

### Constructor

```typescript
new RecursiveRules(config?: RecursiveRulesConfig)
```

**Config:**
- `levels` (optional) - Array of `RecursiveLevelConfig` objects

If no levels provided, uses default hierarchy (paragraphs → sentences → punctuation → words → characters).

**Example:**

```typescript
import { RecursiveRules } from '@chonkie/core';

// Use default rules
const defaultRules = new RecursiveRules();

// Custom rules
const customRules = new RecursiveRules({
  levels: [
    { delimiters: ['\n\n'] },    // Paragraphs only
    { whitespace: true },         // Words
    {}                            // Characters
  ]
});
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `levels` | `RecursiveLevel[]` | Array of chunking levels |
| `length` | `number` | Number of levels |

### Methods

#### `getLevel(index: number): RecursiveLevel | undefined`

Gets a level by index.

```typescript
const firstLevel = rules.getLevel(0);
```

## RecursiveLevel

Represents one level in the recursive chunking hierarchy.

### Constructor

```typescript
new RecursiveLevel(config?: RecursiveLevelConfig)
```

**Config:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `delimiters` | `string \| string[]` | `undefined` | Delimiters to split on |
| `whitespace` | `boolean` | `false` | Use whitespace as delimiter |
| `includeDelim` | `'prev' \| 'next' \| 'none'` | `'prev'` | Where to include delimiter |

**Examples:**

```typescript
import { RecursiveLevel } from '@chonkie/core';

// Split on newlines
const paragraphLevel = new RecursiveLevel({
  delimiters: ['\n\n', '\n']
});

// Split on punctuation, include delimiter with previous chunk
const sentenceLevel = new RecursiveLevel({
  delimiters: ['. ', '! ', '? '],
  includeDelim: 'prev'
});

// Split on whitespace
const wordLevel = new RecursiveLevel({
  whitespace: true
});

// Token level (no splitting)
const tokenLevel = new RecursiveLevel();
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `delimiters` | `string \| string[] \| undefined` | Delimiters for splitting |
| `whitespace` | `boolean` | Whether to use whitespace |
| `includeDelim` | `'prev' \| 'next' \| 'none'` | Delimiter placement |

## Examples

### Basic Usage

```typescript
import { RecursiveChunker } from '@chonkie/core';

const chunker = new RecursiveChunker({ chunkSize: 256 });
const chunks = await chunker.chunk('Your long text here...');

chunks.forEach(chunk => {
  console.log(`[${chunk.startIndex}-${chunk.endIndex}]: ${chunk.text}`);
});
```

### Custom Rules

```typescript
import { RecursiveChunker, RecursiveRules } from '@chonkie/core';

// Create custom rules for code chunking
const codeRules = new RecursiveRules({
  levels: [
    { delimiters: ['\n\n'] },           // Blank lines (blocks)
    { delimiters: ['\n'] },             // Single lines
    { delimiters: [';', '{', '}'] },    // Statements
    { whitespace: true },                // Words
    {}                                   // Characters
  ]
});

const chunker = new RecursiveChunker({
  chunkSize: 512,
  rules: codeRules
});

const chunks = await chunker.chunk(codeString);
```

### Custom Tokenizer

```typescript
import { RecursiveChunker, Tokenizer } from '@chonkie/core';

const tokenizer = new Tokenizer();
const chunker = new RecursiveChunker({
  chunkSize: 1000,
  tokenizer
});

const chunks = await chunker.chunk('Your text here...');
```

### Processing Chunks

```typescript
import { RecursiveChunker } from '@chonkie/core';

const chunker = new RecursiveChunker({ chunkSize: 512 });
const text = 'Your very long document text...';
const chunks = await chunker.chunk(text);

// Filter small chunks
const largeChunks = chunks.filter(chunk => chunk.tokenCount > 100);

// Get chunk statistics
const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);
const avgTokens = totalTokens / chunks.length;

console.log(`Total chunks: ${chunks.length}`);
console.log(`Average tokens per chunk: ${avgTokens.toFixed(2)}`);

// Reconstruct original text
const reconstructed = chunks.map(c => c.text).join('');
console.log('Match:', reconstructed === text);
```

## TypeScript Types

All exports include full TypeScript type definitions:

```typescript
import type {
  RecursiveChunkerOptions,
  FastChunkerOptions,
  RecursiveLevelConfig,
  RecursiveRulesConfig,
  IncludeDelim
} from '@chonkiejs/core';
```

## FAQ

### Top-level await error with tsx/esbuild

**Error:**
```
ERROR: Top-level await is currently not supported with the "cjs" output format
```

**Solution:**

If you're using top-level await, ensure your project is configured for ESM:

**Option 1: Use ESM (Recommended)**

Add to your `package.json`:
```json
{
  "type": "module"
}
```

**Option 2: Wrap in async function**

```typescript
// Instead of top-level await:
const chunker = new RecursiveChunker();
const chunks = await chunker.chunk(text); // ❌ Error

// Use this:
async function main() {
  const chunker = new RecursiveChunker();
  const chunks = await chunker.chunk(text); // ✅ Works
}

main();
```

**Option 3: Use .mjs extension**

Rename your file from `script.ts` to `script.mts` or `script.js` to `script.mjs`.

### Cannot find module '@chonkiejs/core'

Make sure you've installed the package:

```bash
npm install @chonkiejs/core
```

If using TypeScript, ensure `node_modules` is not in your `exclude` array in `tsconfig.json`.

## License

MIT © Bhavnick Minhas
