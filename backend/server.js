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

// ─── Search Index Bootstrap ────────────────────────────────────────────────────
const INDEX_NAME = 'idx:products';

// Mock session id for demo carts
const sessionId = 'user_123';

// Track whether full‑text search is available (index created)
let searchAvailable = true;

/**
 * Ensures the FT search index exists.
 * Called once at startup — idempotent (skips if index already exists).
 */
async function ensureSearchIndex() {
  try {
    await client.sendCommand([
      'FT.CREATE', 'idx:products',
      'ON', 'HASH',
      'PREFIX', '1', 'product:',
      'SCHEMA',
      'name', 'TEXT',
      'category', 'TAG',
      'price', 'NUMERIC'
    ]);
    console.log("✅ Search index created successfully");
  } catch (e) {
    if (e.message === 'Index already exists') {
      console.log("✅ Search index already exists");
    } else {
      console.error("❌ Search index creation failed:", e.message);
      // If index creation fails (Valkey/RediSearch mismatch), mark search as unavailable
      searchAvailable = false;
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
    if (!searchAvailable) {
      return res.status(501).json({ error: 'Search unavailable: index creation failed on server' });
    }
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

/* ====================================================================
   Shopping Cart API (simple demo backed by Valkey hashes + TTL)
   Uses a mock session id (sessionId) defined above for demonstration.
   Routes:
     POST /api/cart       - add/update item { productId, quantity }
     GET  /api/cart       - fetch cart
     DELETE /api/cart/:productId - remove item
==================================================================== */

// POST /api/cart
app.post('/api/cart', async (req, res) => {
  try {
    const { productId, quantity } = req.body || {};
    if (!productId || !quantity) {
      return res.status(400).json({ error: 'Missing productId or quantity' });
    }

    // Increment the product quantity in the user's cart hash
    await client.hIncrBy(`cart:${sessionId}`, productId, Number(quantity));

    // Ensure the cart has a 30-minute TTL
    await client.expire(`cart:${sessionId}`, 1800);

    // Return the updated cart
    const cart = await client.hGetAll(`cart:${sessionId}`);
    return res.json(cart);
  } catch (err) {
    console.error('❌ Error updating cart:', err);
    return res.status(500).json({ error: 'Failed to update cart' });
  }
});

// GET /api/cart
app.get('/api/cart', async (_req, res) => {
  try {
    const cart = await client.hGetAll(`cart:${sessionId}`);
    return res.json(cart);
  } catch (err) {
    console.error('❌ Error fetching cart:', err);
    return res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// DELETE /api/cart/:productId
app.delete('/api/cart/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    await client.hDel(`cart:${sessionId}`, productId);
    return res.json({ success: true, productId });
  } catch (err) {
    console.error('❌ Error deleting cart item:', err);
    return res.status(500).json({ error: 'Failed to delete cart item' });
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
