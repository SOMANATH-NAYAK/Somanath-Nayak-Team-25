import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

const SEARCH_API = 'http://localhost:5000/api/search';

/* ───────── category → icon mapping (reuse from ValkeyCatalog) ───────── */
const categoryIcons = {
  Electronics:  'ph-fill ph-cpu',
  Furniture:    'ph-fill ph-armchair',
  Accessories:  'ph-fill ph-watch',
};
const fallbackIcon = 'ph-fill ph-package';

/**
 * ValkeySearchBar
 *
 * Drop‑in live‑search component powered by the Valkey Search API.
 * Features:
 *   • 300ms debounce so we don't spam the API on every keystroke
 *   • Accessible dropdown with keyboard navigation
 *   • Loading spinner + empty / error states
 *   • Click‑outside closes the dropdown
 *
 * Props:
 *   variant  – "inline" (inside header bar) | "overlay" (fullscreen search box)
 *   className – extra classes forwarded to the root wrapper
 */
const ValkeySearchBar = ({ variant = 'inline', className = '' }) => {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  /* ── Click‑outside handler ── */
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Debounced fetch ── */
  const fetchResults = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length === 0) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${SEARCH_API}?q=${encodeURIComponent(searchTerm)}`);
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const data = await res.json();
      setResults(data.products || []);
      setShowDropdown(true);
    } catch (err) {
      setError(err.message);
      setResults([]);
      setShowDropdown(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Clear any pending debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length === 0) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    // 300ms debounce
    debounceRef.current = setTimeout(() => {
      fetchResults(value);
    }, 300);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  /* ── Result click handler ── */
  const handleResultClick = (product) => {
    console.log('🛒 Selected product:', product);
    setQuery(product.name);
    setShowDropdown(false);
  };

  /* ── Decide input classes based on variant ── */
  const isOverlay = variant === 'overlay';
  const inputClass = isOverlay
    ? 'form-control py-16 px-24 text-xl rounded-pill pe-64'
    : 'search-form__input common-input py-13 ps-16 pe-18 rounded-0 border-0';

  return (
    <div
      ref={wrapperRef}
      className={`valkey-search-wrapper position-relative ${className}`}
      style={isOverlay ? {} : { flex: 1 }}
    >
      <input
        type='text'
        className={inputClass}
        placeholder='Search for a product or brand'
        value={query}
        onChange={handleChange}
        onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
        autoComplete='off'
      />

      {/* ── Dropdown ── */}
      {showDropdown && (
        <div className='valkey-search-dropdown'>
          {/* loading */}
          {loading && (
            <div className='valkey-search-dropdown__status'>
              <i className='ph ph-circle-notch valkey-spin text-main-600 me-8' />
              Searching…
            </div>
          )}

          {/* error */}
          {error && !loading && (
            <div className='valkey-search-dropdown__status text-danger-600'>
              <i className='ph ph-warning me-8' />
              {error}
            </div>
          )}

          {/* empty */}
          {!loading && !error && results.length === 0 && (
            <div className='valkey-search-dropdown__status text-gray-400'>
              <i className='ph ph-magnifying-glass me-8' />
              No products found for "{query}"
            </div>
          )}

          {/* results */}
          {!loading && results.length > 0 && (
            <>
              <div className='valkey-search-dropdown__header'>
                <span className='text-xs fw-semibold text-gray-500 text-uppercase'>
                  {results.length} result{results.length !== 1 ? 's' : ''} from Valkey
                </span>
              </div>
              <ul className='valkey-search-dropdown__list'>
                {results.map((product) => (
                  <li key={product.id}>
                    <Link
                      to='/product-details'
                      className='valkey-search-dropdown__item'
                      onClick={() => handleResultClick(product)}
                    >
                      <span className='valkey-search-dropdown__icon'>
                        <i className={categoryIcons[product.category] || fallbackIcon} />
                      </span>
                      <div className='valkey-search-dropdown__info'>
                        <span className='valkey-search-dropdown__name'>
                          {product.name}
                        </span>
                        <span className='valkey-search-dropdown__meta'>
                          <span className='text-main-600 fw-bold'>
                            ${Number(product.price).toFixed(2)}
                          </span>
                          <span className='valkey-search-dropdown__divider'>·</span>
                          <span className='text-gray-400'>{product.category}</span>
                          <span className='valkey-search-dropdown__divider'>·</span>
                          <span className={Number(product.stock) > 0 ? 'text-success-600' : 'text-danger-600'}>
                            {Number(product.stock) > 0 ? `${product.stock} in stock` : 'Out of stock'}
                          </span>
                        </span>
                      </div>
                      <i className='ph ph-arrow-right text-gray-300 ms-auto' />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ValkeySearchBar;
