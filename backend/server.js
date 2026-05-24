const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');
const { SCHEMA_FIELD_TYPE } = require('@redis/search');

// ─── Config ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const VALKEY_URL = process.env.VALKEY_URL || 'redis://localhost:6379';

// ─── Bootstrap ─────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Create a persistent Valkey (Redis-compatible) client
const client = createClient({ url: VALKEY_URL });
client.on('error', (err) => console.error('⚠️  Valkey client error:', err));

// ─── Search Index Bootstrap ────────────────────────────────────────────────────
const INDEX_NAME = 'idx:products';

/**
 * Ensures the FT search index exists.
 * Called once at startup — idempotent (skips if index already exists).
 */
async function ensureSearchIndex() {
  try {
    // Check if the index already exists
    await client.ft.info(INDEX_NAME);
    console.log(`🔍 Search index "${INDEX_NAME}" already exists`);
  } catch (err) {
    // If info throws, the index doesn't exist yet — create it
    try {
      await client.ft.create(
        INDEX_NAME,
        {
          name:     { type: SCHEMA_FIELD_TYPE.TEXT   },
          category: { type: SCHEMA_FIELD_TYPE.TAG    },
          price:    { type: SCHEMA_FIELD_TYPE.NUMERIC },
        },
        {
          ON:     'HASH',
          PREFIX: 'product:',
        }
      );
      console.log(`✅ Created search index "${INDEX_NAME}"`);
    } catch (createErr) {
      console.error('❌ Failed to create search index:', createErr);
    }
  }
}

// ─── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/products
 * Returns every product stored as a Hash under the key pattern `product:{id}`.
 */
app.get('/api/products', async (_req, res) => {
  try {
    // Discover all product keys
    const keys = await client.keys('product:*');

    if (keys.length === 0) {
      return res.json([]);
    }

    // Fetch every hash in parallel – each hGetAll is O(1) for small hashes
    const products = await Promise.all(
      keys.map(async (key) => {
        const fields = await client.hGetAll(key);
        // Extract the id from the key  ("product:101" → "101")
        const id = key.split(':')[1];
        return { id, ...fields };
      })
    );

    return res.json(products);
  } catch (err) {
    console.error('❌ Error fetching products:', err);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/search?q=<query>
 * Full‑text search powered by Valkey Search (RediSearch‑compatible).
 *
 * Query examples:
 *   ?q=keyboard           → free‑text search across the `name` field
 *   ?q=@category:{Electronics}  → TAG filter
 *   ?q=@price:[100 200]         → NUMERIC range
 */
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Missing required query parameter: ?q=' });
    }

    const results = await client.ft.search(INDEX_NAME, query);

    // Format into a clean array of product objects
    const products = results.documents.map((doc) => {
      const id = doc.id.replace('product:', '');
      return { id, ...doc.value };
    });

    return res.json({
      total: results.total,
      products,
    });
  } catch (err) {
    console.error('❌ Search error:', err);
    return res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

// Health-check endpoint (handy for hackathon demos)
app.get('/api/health', async (_req, res) => {
  try {
    const pong = await client.ping();
    return res.json({ status: 'ok', valkey: pong });
  } catch {
    return res.status(503).json({ status: 'error', valkey: 'disconnected' });
  }
});

// ─── Start ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await client.connect();
    console.log('✅ Connected to Valkey');

    // Create the search index if it doesn't already exist
    await ensureSearchIndex();

    app.listen(PORT, () => {
      console.log(`🚀 Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Could not start server:', err);
    process.exit(1);
  }
})();
