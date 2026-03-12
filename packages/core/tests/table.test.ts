import { TableChunker } from '../src';

const MARKDOWN_TABLE = `| Name | Age | City |
|------|-----|------|
| Alice | 30 | NYC |
| Bob | 25 | LA |
| Carol | 35 | Chicago |
| Dave | 28 | Boston |
| Eve | 22 | Seattle |`;

const MARKDOWN_TABLE_SMALL = `| Name | Age |
|------|-----|
| Alice | 30 |`;

const HTML_TABLE = `<table>
<thead><tr><th>Name</th><th>Age</th></tr></thead>
<tbody>
<tr><td>Alice</td><td>30</td></tr>
<tr><td>Bob</td><td>25</td></tr>
<tr><td>Carol</td><td>35</td></tr>
<tr><td>Dave</td><td>28</td></tr>
</tbody>
</table>`;

const HTML_TABLE_SMALL = `<table>
<thead><tr><th>Name</th><th>Age</th></tr></thead>
<tbody>
<tr><td>Alice</td><td>30</td></tr>
</tbody>
</table>`;

describe('TableChunker', () => {
  describe('Creation', () => {
    it('should create with default options (row mode)', async () => {
      const chunker = await TableChunker.create();
      expect(chunker).toBeInstanceOf(TableChunker);
      expect(chunker.chunkSize).toBe(3);
    });

    it('should create with explicit row tokenizer', async () => {
      const chunker = await TableChunker.create({ tokenizer: 'row', chunkSize: 5 });
      expect(chunker.chunkSize).toBe(5);
    });

    it('should create with character tokenizer', async () => {
      const chunker = await TableChunker.create({ tokenizer: 'character', chunkSize: 200 });
      expect(chunker.chunkSize).toBe(200);
    });

    it('should throw for chunkSize <= 0', async () => {
      await expect(TableChunker.create({ chunkSize: 0 })).rejects.toThrow('chunkSize must be greater than 0');
      await expect(TableChunker.create({ chunkSize: -1 })).rejects.toThrow('chunkSize must be greater than 0');
    });
  });

  describe('Row mode - markdown', () => {
    it('should return single chunk when rows <= chunkSize', async () => {
      const chunker = await TableChunker.create({ chunkSize: 5 });
      const chunks = chunker.chunk(MARKDOWN_TABLE);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe(MARKDOWN_TABLE);
      expect(chunks[0].tokenCount).toBe(5);
    });

    it('should split into multiple chunks when rows > chunkSize', async () => {
      const chunker = await TableChunker.create({ chunkSize: 2 });
      const chunks = chunker.chunk(MARKDOWN_TABLE);
      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.tokenCount).toBeLessThanOrEqual(2);
      }
    });

    it('each chunk should contain the header', async () => {
      const chunker = await TableChunker.create({ chunkSize: 2 });
      const chunks = chunker.chunk(MARKDOWN_TABLE);
      for (const chunk of chunks) {
        expect(chunk.text).toContain('| Name | Age | City |');
        expect(chunk.text).toContain('|------|-----|------|');
      }
    });

    it('should return empty array for empty string', async () => {
      const chunker = await TableChunker.create();
      expect(chunker.chunk('')).toEqual([]);
      expect(chunker.chunk('   ')).toEqual([]);
    });

    it('should return empty array for table with fewer than 3 rows', async () => {
      const chunker = await TableChunker.create();
      expect(chunker.chunk('| A | B |\n|---|---|')).toEqual([]);
    });

    it('single-row table fits in one chunk', async () => {
      const chunker = await TableChunker.create({ chunkSize: 3 });
      const chunks = chunker.chunk(MARKDOWN_TABLE_SMALL);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe(MARKDOWN_TABLE_SMALL);
    });

    it('startIndex and endIndex should be consistent across chunks', async () => {
      const chunker = await TableChunker.create({ chunkSize: 2 });
      const chunks = chunker.chunk(MARKDOWN_TABLE);
      expect(chunks.length).toBeGreaterThan(1);

      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i].startIndex).toBeLessThan(chunks[i].endIndex);
        if (i > 0) {
          expect(chunks[i].startIndex).toBeGreaterThanOrEqual(chunks[i - 1].endIndex);
        }
      }
    });

    it('all data rows should appear across chunks', async () => {
      const chunker = await TableChunker.create({ chunkSize: 2 });
      const chunks = chunker.chunk(MARKDOWN_TABLE);
      const allText = chunks.map(c => c.text).join('\n');
      expect(allText).toContain('Alice');
      expect(allText).toContain('Bob');
      expect(allText).toContain('Carol');
      expect(allText).toContain('Dave');
      expect(allText).toContain('Eve');
    });
  });

  describe('Row mode - HTML', () => {
    it('should return single chunk when rows <= chunkSize', async () => {
      const chunker = await TableChunker.create({ chunkSize: 5 });
      const chunks = chunker.chunk(HTML_TABLE);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe(HTML_TABLE);
    });

    it('should split HTML table rows', async () => {
      const chunker = await TableChunker.create({ chunkSize: 2 });
      const chunks = chunker.chunk(HTML_TABLE);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('each HTML chunk should contain the header', async () => {
      const chunker = await TableChunker.create({ chunkSize: 2 });
      const chunks = chunker.chunk(HTML_TABLE);
      for (const chunk of chunks) {
        expect(chunk.text.toLowerCase()).toContain('<thead>');
      }
    });

    it('should return empty array for HTML table with no data rows', async () => {
      const chunker = await TableChunker.create();
      const emptyHtml = '<table><thead><tr><th>A</th></tr></thead><tbody></tbody></table>';
      expect(chunker.chunk(emptyHtml)).toEqual([]);
    });
  });

  describe('Token mode - markdown', () => {
    it('should return single chunk when table fits in chunkSize', async () => {
      const chunker = await TableChunker.create({ tokenizer: 'character', chunkSize: 10000 });
      const chunks = chunker.chunk(MARKDOWN_TABLE);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe(MARKDOWN_TABLE);
    });

    it('should split when table exceeds chunkSize', async () => {
      const chunker = await TableChunker.create({ tokenizer: 'character', chunkSize: 50 });
      const chunks = chunker.chunk(MARKDOWN_TABLE);
      // Should produce multiple chunks since the full table is much larger than 50 chars
      expect(chunks.length).toBeGreaterThan(1);
      // Each chunk should have fewer total chars than the full table
      for (const chunk of chunks) {
        expect(chunk.text.length).toBeLessThan(MARKDOWN_TABLE.length);
      }
    });

    it('each token-mode chunk should contain the header', async () => {
      const chunker = await TableChunker.create({ tokenizer: 'character', chunkSize: 50 });
      const chunks = chunker.chunk(MARKDOWN_TABLE);
      for (const chunk of chunks) {
        expect(chunk.text).toContain('| Name | Age | City |');
      }
    });
  });

  describe('toString', () => {
    it('should describe row mode', async () => {
      const chunker = await TableChunker.create({ chunkSize: 3 });
      expect(chunker.toString()).toBe('TableChunker(tokenizer=row, chunkSize=3)');
    });
  });
});
