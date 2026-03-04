<div align="center">

![Chonkie Logo](../../assets/chonkie_logo_br_transparent_bg.png)

# @chonkiejs/token

_HuggingFace tokenizer support for Chonkie - extends @chonkiejs/core with real tokenization._

[![npm version](https://img.shields.io/npm/v/@chonkiejs/token)](https://www.npmjs.com/package/@chonkiejs/token)
[![npm license](https://img.shields.io/npm/l/@chonkiejs/token)](https://www.npmjs.com/package/@chonkiejs/token)
[![GitHub](https://img.shields.io/badge/github-chonkie--ts-black.svg?logo=github)](https://github.com/chonkie-inc/chonkiejs)

</div>

## Features
🤗 **HuggingFace Integration** - Use any HuggingFace tokenizer model</br>
🔌 **Optional Plugin** - Install only when you need real tokenization</br>
📦 **Zero Config** - Works automatically with @chonkiejs/core</br>
⚡ **Progressive Enhancement** - Core works without it, better with it</br>

## Installation

Install with `npm`:
```bash
npm i @chonkiejs/token @chonkiejs/core
```

Install with `pnpm`:
```bash
pnpm add @chonkiejs/token @chonkiejs/core
```

Install with `yarn`:
```bash
yarn add @chonkiejs/token @chonkiejs/core
```

Install with `bun`:
```bash
bun add @chonkiejs/token @chonkiejs/core
```

## Quick Start

Simply install this package alongside `@chonkiejs/core`, then use tokenizer names:

```typescript
import { RecursiveChunker, TokenChunker } from '@chonkiejs/core';

// Use GPT-2 tokenization (automatically uses @chonkiejs/token)
const chunker = await RecursiveChunker.create({
  tokenizer: 'Xenova/gpt2',
  chunkSize: 512
});

const chunks = await chunker.chunk('Your text here...');
```

## Supported Models

Any HuggingFace model from transformers.js:

- `Xenova/gpt2`
- `Xenova/gpt-4`
- `bert-base-uncased`
- `google-bert/bert-base-multilingual-cased`
- And many more!

See: https://huggingface.co/models?library=transformers.js

## Usage Examples

### With RecursiveChunker

```typescript
import { RecursiveChunker } from '@chonkiejs/core';

const chunker = await RecursiveChunker.create({
  tokenizer: 'Xenova/gpt2',
  chunkSize: 512
});

const chunks = await chunker.chunk('Your document...');
```

### With TokenChunker

```typescript
import { TokenChunker } from '@chonkiejs/core';

const chunker = await TokenChunker.create({
  tokenizer: 'bert-base-uncased',
  chunkSize: 256,
  chunkOverlap: 50
});

const chunks = await chunker.chunk('Your text...');
```

### Direct Tokenizer Usage

```typescript
import { HuggingFaceTokenizer } from '@chonkiejs/token';

const tokenizer = await HuggingFaceTokenizer.create('Xenova/gpt2');

const count = tokenizer.countTokens('Hello world!');
const tokens = tokenizer.encode('Hello world!');
const text = tokenizer.decode(tokens);

console.log(`Token count: ${count}`);
```

## How It Works

When you call `Tokenizer.create('gpt2')` in @chonkiejs/core:

1. Core tries to dynamically import `@chonkiejs/token`
2. **If installed:** Uses HuggingFaceTokenizer
3. **If not installed:** Shows helpful error message

This keeps core lightweight while allowing advanced tokenization when needed!

## Contributing

Want to help grow Chonkie? Check out [CONTRIBUTING.md](../../CONTRIBUTING.md) to get started! Whether you're fixing bugs, adding features, improving docs, or simply leaving a ⭐️ on the repo, every contribution helps make Chonkie a better CHONK for everyone.

Remember: No contribution is too small for this tiny hippo!
