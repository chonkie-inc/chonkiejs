import { describe, it, expect, vi } from 'vitest';
import { SemanticChunker } from '../src/semantic';
import { Tokenizer } from '../src/tokenizer';

describe('SemanticChunker', () => {
  const mockEmbed = vi.fn();

  it('should chunk text based on semantic similarity', async () => {
    // Setup mock embeddings
    // We'll have 5 sentences. similarityWindow=3.
    // similarities will be computed for index 0 and 1.
    // similarities.length = sentences.length - similarityWindow = 5 - 3 = 2.
    mockEmbed.mockImplementation(async (texts: string[]) => {
      return texts.map(t => {
        if (t.includes('topic A')) return [1, 0, 0];
        if (t.includes('topic B')) return [0, 1, 0];
        return [0, 0, 1];
      });
    });

    const chunker = await SemanticChunker.create({
      embeddings: mockEmbed,
      threshold: 0.5, // low threshold for testing
      similarityWindow: 1, // smaller window for easier testing
      chunkSize: 1000,
    });

    const text = "Sentence 1 about topic A. Sentence 2 about topic A. Sentence 3 about topic B. Sentence 4 about topic B.";
    // splitSentences might produce 4 sentences.
    
    const chunks = await chunker.chunk(text);
    
    expect(chunks.length).toBeGreaterThan(0);
    expect(mockEmbed).toHaveBeenCalled();
  });

  it('should respect chunkSize by grouping sentences', async () => {
    mockEmbed.mockResolvedValue([[1, 0], [1, 0], [1, 0], [1,0]]);

    const chunker = await SemanticChunker.create({
      embeddings: mockEmbed,
      chunkSize: 15, 
      threshold: 0.9,
      minCharactersPerSentence: 0,
    });

    const text = "Small sentence. Another small one. Third one. Final sentence.";
    // Each is ~15 chars. Similarity 1.0. Should all be one group initially.
    // splitOversizedGroups should split them into chunks of ~15 tokens.
    
    const chunks = await chunker.chunk(text);

    for (const chunk of chunks) {
      expect(chunk.tokenCount).toBeLessThanOrEqual(20); // allow some margin if characters != tokens exactly
    }
  });

  it('should handle empty text', async () => {
    const chunker = await SemanticChunker.create({
      embeddings: mockEmbed,
    });
    const chunks = await chunker.chunk("");
    expect(chunks).toEqual([]);
  });
});
