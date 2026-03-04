<div align="center">

![Chonkie Logo](../../assets/chonkie_logo_br_transparent_bg.png)

# @chonkiejs/cloud

_Cloud-based chunkers for Chonkie via api.chonkie.ai - semantic, neural, and AI-powered text chunking._

[![npm version](https://img.shields.io/npm/v/@chonkiejs/cloud)](https://www.npmjs.com/package/@chonkiejs/cloud)
[![npm license](https://img.shields.io/npm/l/@chonkiejs/cloud)](https://www.npmjs.com/package/@chonkiejs/cloud)
[![Documentation](https://img.shields.io/badge/docs-DOCS.md-blue.svg)](./DOCS.md)
[![GitHub](https://img.shields.io/badge/github-chonkie--ts-black.svg?logo=github)](https://github.com/chonkie-inc/chonkiejs)

</div>

## Features
🌐 **Cloud-Powered** - Leverage powerful chunking via api.chonkie.ai</br>
🧠 **Semantic & Neural** - AI-powered intelligent chunking</br>
🔧 **Refineries** - Post-process chunks with embeddings and overlap</br>
🔑 **Easy Auth** - Auto-reads CHONKIE_API_KEY from environment</br>
📦 **Returns Chunk Objects** - Compatible with @chonkiejs/core</br>
✨ **Clean API** - Simple, consistent interface across all chunkers</br>

## Installation

Install with `npm`:
```bash
npm i @chonkiejs/cloud
```

Install with `pnpm`:
```bash
pnpm add @chonkiejs/cloud
```

Install with `yarn`:
```bash
yarn add @chonkiejs/cloud
```

Install with `bun`:
```bash
bun add @chonkiejs/cloud
```

## Quick Start

Set your API key:
```bash
export CHONKIE_API_KEY=your-api-key-here
```

Use a chunker:
```typescript
import { SemanticChunker } from '@chonkiejs/cloud';

// Create a chunker (automatically uses CHONKIE_API_KEY)
const chunker = new SemanticChunker({
  chunkSize: 512,
  threshold: 0.5
});

// Chunk your text
const chunks = await chunker.chunk({ text: 'Your text here...' });

// Use the chunks
for (const chunk of chunks) {
  console.log(chunk.text);
  console.log(`Tokens: ${chunk.tokenCount}`);
}
```

## Available Chunkers

| Name | Description |
|------|-------------|
| `TokenChunker` | Splits text into fixed-size token chunks with optional overlap |
| `SentenceChunker` | Splits text into sentence-based chunks respecting sentence boundaries |
| `RecursiveChunker` | Uses hierarchical rules (paragraphs → sentences → punctuation → words) with customizable recipes |
| `SemanticChunker` | Creates semantically coherent chunks using embedding-based similarity analysis |
| `NeuralChunker` | Uses neural networks for intelligent, context-aware chunking |
| `CodeChunker` | Splits code into structurally meaningful chunks based on AST parsing |
| `LateChunker` | Recursive chunking with embeddings for enhanced semantic coherence |

## Available Refineries

| Name | Description |
|------|-------------|
| `EmbeddingsRefinery` | Post-processes chunks by adding embeddings using specified embedding model |
| `OverlapRefinery` | Adds contextual overlap between chunks for better coherence |

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
