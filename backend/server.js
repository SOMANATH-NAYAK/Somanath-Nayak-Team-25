const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');

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

    app.listen(PORT, () => {
      console.log(`🚀 Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Could not start server:', err);
    process.exit(1);
  }
})();
