import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api/products';
const CART_API_URL = 'http://localhost:5000/api/cart';

/* ───────────── category → icon + accent colour mapping ───────────── */
const categoryMeta = {
  Electronics:  { icon: 'ph-fill ph-cpu',           accent: 'main'    },
  Furniture:    { icon: 'ph-fill ph-armchair',       accent: 'warning' },
  Accessories:  { icon: 'ph-fill ph-watch',          accent: 'info'    },
};
const fallbackMeta = { icon: 'ph-fill ph-package',   accent: 'main'    };
const getCategoryMeta = (cat) => categoryMeta[cat] || fallbackMeta;

/* ───────────── stock badge helper ───────────── */
const stockBadge = (stock) => {
  const n = Number(stock);
  if (n <= 0)  return { label: 'Out of stock',   cls: 'bg-danger-600'  };
  if (n <= 20) return { label: `Only ${n} left!`, cls: 'bg-warning-600' };
  return              { label: 'In Stock',        cls: 'bg-success-600' };
};

/* ═══════════════════════════════════════════════════════════════════════
   Skeleton card shown while the API request is in‑flight
   ═══════════════════════════════════════════════════════════════════════ */
const SkeletonCard = () => (
  <div className="col-xxl-3 col-lg-4 col-sm-6 col-12">
    <div
      className="product-card px-16 py-24 border border-gray-100 rounded-16 position-relative overflow-hidden"
      style={{ minHeight: 340 }}
    >
      {/* shimmer overlay */}
      <div className="valkey-skeleton-shimmer" />

      <div
        className="rounded-8 mb-16"
        style={{ height: 44, width: '55%', background: 'var(--gray-100, #e9ecef)' }}
      />
      <div
        className="rounded-8 mb-12"
        style={{ height: 22, width: '80%', background: 'var(--gray-100, #e9ecef)' }}
      />
      <div
        className="rounded-8 mb-24"
        style={{ height: 16, width: '40%', background: 'var(--gray-100, #e9ecef)' }}
      />
      <div
        className="rounded-8 mb-12"
        style={{ height: 16, width: '60%', background: 'var(--gray-100, #e9ecef)' }}
      />
      <div
        className="rounded-pill mt-24"
        style={{ height: 44, width: '100%', background: 'var(--gray-100, #e9ecef)' }}
      />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   Individual product card
   ═══════════════════════════════════════════════════════════════════════ */
const ProductCard = ({ product }) => {
  const meta  = getCategoryMeta(product.category);
  const badge = stockBadge(product.stock);
  const [addingToCart, setAddingToCart] = useState(false);
  const [feedback, setFeedback] = useState('');

  const addToCart = async () => {
    try {
      setAddingToCart(true);
      setFeedback('');

      const res = await fetch(CART_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      setFeedback('Added to cart');
    } catch (error) {
      setFeedback(`Could not add item: ${error.message}`);
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <div className="col-xxl-3 col-lg-4 col-sm-6 col-12">
      <div className="product-card valkey-card px-16 py-24 border border-gray-100 hover-border-main-600 rounded-16 position-relative transition-2">

        {/* ── Stock badge ── */}
        <span
          className={`valkey-badge text-white text-xs fw-bold px-12 py-4 rounded-pill position-absolute ${badge.cls}`}
          style={{ top: 12, right: 12, zIndex: 2 }}
        >
          {badge.label}
        </span>

        {/* ── Category icon circle ── */}
        <div className="flex-center mb-16">
          <span
            className={`valkey-icon-circle bg-${meta.accent}-50 text-${meta.accent}-600 flex-center rounded-circle`}
            style={{ width: 72, height: 72, fontSize: 32 }}
          >
            <i className={meta.icon} />
          </span>
        </div>

        {/* ── Content ── */}
        <div className="product-card__content text-center">
          <span
            className={`text-xs fw-semibold text-${meta.accent}-600 text-uppercase letter-spacing-1`}
          >
            {product.category}
          </span>

          <h6 className="title text-lg fw-semibold mt-8 mb-4">
            <Link to="/product-details" className="link text-line-2">
              {product.name}
            </Link>
          </h6>

          {/* price */}
          <div className="product-card__price mb-12">
            <span className="text-heading text-xl fw-bold">
              ${Number(product.price).toFixed(2)}
            </span>
          </div>

          {/* stock bar */}
          <div className="mb-16">
            <div
              className="progress w-100 bg-color-three rounded-pill h-4"
              role="progressbar"
              aria-label="Stock level"
              aria-valuenow={Number(product.stock)}
              aria-valuemin={0}
              aria-valuemax={200}
            >
              <div
                className={`progress-bar ${badge.cls} rounded-pill`}
                style={{ width: `${Math.min((Number(product.stock) / 200) * 100, 100)}%` }}
              />
            </div>
            <span className="text-gray-600 text-xs fw-medium mt-4 d-block">
              {product.stock} units available
            </span>
          </div>

          {/* add-to-cart button */}
          <button
            type="button"
            className="btn bg-main-50 text-main-600 hover-bg-main-600 hover-text-white w-100 py-11 rounded-pill flex-center gap-8 fw-semibold transition-2"
            onClick={addToCart}
            disabled={addingToCart}
          >
            {addingToCart ? 'Adding…' : 'Add to Cart'} <i className="ph ph-shopping-cart text-lg" />
          </button>
          {feedback && (
            <p className="text-xs mt-8 mb-0 text-gray-500">{feedback}</p>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   Main catalog component — fetches from the Valkey‑backed API
   ═══════════════════════════════════════════════════════════════════════ */
const ValkeyCatalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        const data = await res.json();
        if (!cancelled) setProducts(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProducts();
    return () => { cancelled = true; };
  }, []);

  /* ── Loading state ── */
  if (loading) {
    return (
      <section className="product py-80">
        <div className="container container-lg">
          <div className="text-center mb-40">
            <h5 className="text-heading fw-bold mb-8">
              <i className="ph ph-database text-main-600 me-8" />
              Valkey Product Catalog
            </h5>
            <p className="text-gray-500 text-md">Loading products from Valkey…</p>
          </div>
          <div className="row gy-4 g-12">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <section className="product py-80">
        <div className="container container-lg">
          <div
            className="text-center py-48 px-24 border border-danger-200 bg-danger-50 rounded-16"
            style={{ maxWidth: 520, margin: '0 auto' }}
          >
            <i
              className="ph ph-warning-circle text-danger-600 mb-16 d-block"
              style={{ fontSize: 48 }}
            />
            <h6 className="text-danger-600 fw-bold mb-8">
              Unable to Load Products
            </h6>
            <p className="text-gray-600 text-md mb-24">{error}</p>
            <button
              type="button"
              className="btn bg-danger-600 text-white hover-bg-danger-700 py-11 px-32 rounded-pill fw-semibold transition-2"
              onClick={() => window.location.reload()}
            >
              <i className="ph ph-arrow-clockwise me-8" />
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  /* ── Success state ── */
  return (
    <section className="product py-80">
      <div className="container container-lg">
        {/* Section header */}
        <div className="text-center mb-40">
          <span className="text-main-600 text-sm fw-bold text-uppercase letter-spacing-1 mb-8 d-block">
            Powered by Valkey
          </span>
          <h5 className="text-heading fw-bold mb-8">
            <i className="ph ph-database text-main-600 me-8" />
            Product Catalog
          </h5>
          <p className="text-gray-500 text-md">
            {products.length} products loaded in real‑time from our Valkey data store
          </p>
        </div>

        {/* Grid */}
        {products.length === 0 ? (
          <div className="text-center py-48">
            <i
              className="ph ph-shopping-bag-open text-gray-300 d-block mb-16"
              style={{ fontSize: 64 }}
            />
            <h6 className="text-gray-500 fw-semibold">No products found</h6>
            <p className="text-gray-400 text-sm">
              Run <code>npm run seed</code> in the backend to populate the database.
            </p>
          </div>
        ) : (
          <div className="row gy-4 g-12">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ValkeyCatalog;
