<div align="center">

![Chonkie Logo](../../assets/chonkie_logo_br_transparent_bg.png)

# @chonkiejs/core

_Core chunking library for Chonkie - lightweight and efficient text chunking with zero dependencies._

[![npm version](https://img.shields.io/npm/v/@chonkiejs/core)](https://www.npmjs.com/package/@chonkiejs/core)
[![npm license](https://img.shields.io/npm/l/@chonkiejs/core)](https://www.npmjs.com/package/@chonkiejs/core)
[![Documentation](https://img.shields.io/badge/docs-DOCS.md-blue.svg)](./DOCS.md)
[![GitHub](https://img.shields.io/badge/github-chonkie--ts-black.svg?logo=github)](https://github.com/chonkie-inc/chonkiejs)

</div>

## Features
✨ **Simple & Clean API** - Easy to use OOP design</br>
⚡ **Zero Dependencies** - Minimal, lightweight, fast</br>
🔤 **Character-based** - Simple tokenization (1 char = 1 token)</br>
🎯 **Recursive Chunking** - Smart hierarchical text splitting</br>
📦 **TypeScript First** - Full type safety with TypeScript</br>

## Installation

Install with `npm`:
```bash
npm i @chonkiejs/core
```

Install with `pnpm`:
```bash
pnpm add @chonkiejs/core
```

Install with `yarn`:
```bash
yarn add @chonkiejs/core
```

Install with `bun`:
```bash
bun add @chonkiejs/core
```

## Quick Start

```typescript
import { RecursiveChunker } from '@chonkiejs/core';

// Create a chunker
const chunker = await RecursiveChunker.create({
  chunkSize: 512,
  minCharactersPerChunk: 24
});

// Chunk your text
const chunks = await chunker.chunk('Your text here...');

// Use the chunks
for (const chunk of chunks) {
  console.log(chunk.text);
  console.log(`Tokens: ${chunk.tokenCount}`);
}
```

## Available Chunkers

| Name | Description |
|------|-------------|
| `RecursiveChunker` | Recursively splits text using hierarchical rules (paragraphs → sentences → punctuation → words → characters). Each level only activates if chunks exceed the configured size. |
| `TokenChunker` | Splits text into fixed-size token chunks with optional overlap. Uses character-based tokenization by default, or HuggingFace models with @chonkiejs/token. |
| `TableChunker` | Splits Markdown or HTML tables into smaller table chunks while repeating the original header in each chunk. Supports row-based and token-based modes. |
| `FastChunker` | Uses byte-based boundary detection through `@chonkiejs/chunk` for very fast chunking with delimiter or pattern controls. |

For detailed API documentation, configuration options, and advanced usage, see [DOCS.md](./DOCS.md).

## Contributing

Want to help grow Chonkie? Check out [CONTRIBUTING.md](../../CONTRIBUTING.md) to get started! Whether you're fixing bugs, adding features, improving docs, or simply leaving a ⭐️ on the repo, every contribution helps make Chonkie a better CHONK for everyone.

Remember: No contribution is too small for this tiny hippo!

## Acknowledgements

Chonkie would like to CHONK its way through a special thanks to all the users and contributors who have helped make this library what it is today! Your feedback, issue reports, and improvements have helped make Chonkie the CHONKIEST it can be.

And of course, special thanks to [Moto Moto](https://www.youtube.com/watch?v=I0zZC4wtqDQ&t=5s) for endorsing Chonkie with his famous quote:
> "I like them big, I like them chonkie in TypeScript" ~ Moto Moto... definitely did not say this

## Citation

If you use Chonkie in your research, please cite it as follows:

```bibtex
@software{chonkie2025,
  author = {Bhavnick Minhas and Shreyash Nigam},
  title = {Chonkie: A no-nonsense fast, lightweight, and efficient text chunking library},
  year = {2025},
  publisher = {GitHub},
  howpublished = {\url{https://github.com/chonkie-inc}},
}
```
