import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import QuantityControl from '../helper/QuantityControl'

const CART_API_URL = 'http://localhost:5000/api/cart';
const PRODUCTS_API_URL = 'http://localhost:5000/api/products';

const CartSection = () => {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const loadCart = async () => {
            try {
                const [cartRes, productsRes] = await Promise.all([
                    fetch(CART_API_URL),
                    fetch(PRODUCTS_API_URL),
                ]);

                if (!cartRes.ok) {
                    throw new Error(`Cart request failed with ${cartRes.status}`);
                }

                if (!productsRes.ok) {
                    throw new Error(`Products request failed with ${productsRes.status}`);
                }

                const cartData = await cartRes.json();
                const productsData = await productsRes.json();
                const productMap = new Map(productsData.map((product) => [String(product.id), product]));

                const items = Object.entries(cartData).map(([productId, quantity]) => {
                    const product = productMap.get(String(productId));
                    const qty = Number(quantity);
                    const price = product ? Number(product.price) : 0;

                    return {
                        productId,
                        quantity: qty,
                        productName: product ? product.name : `Product ${productId}`,
                        price,
                        image: productId,
                        subtotal: price * qty,
                    };
                });

                if (!cancelled) {
                    setCartItems(items);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err.message);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadCart();

        return () => {
            cancelled = true;
        };
    }, []);

    const totals = useMemo(() => {
        const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
        const tax = subtotal * 0.08;
        const total = subtotal + tax;

        return { subtotal, tax, total };
    }, [cartItems]);

    const handleRemoveItem = async (productId) => {
        await fetch(`${CART_API_URL}/${productId}`, { method: 'DELETE' });
        setCartItems((items) => items.filter((item) => item.productId !== productId));
    };

    if (loading) {
        return (
            <section className="cart py-80">
                <div className="container container-lg">
                    <div className="text-center py-48">
                        <h6 className="text-heading fw-bold mb-8">Loading cart…</h6>
                        <p className="text-gray-500 mb-0">Fetching your Valkey-backed cart.</p>
                    </div>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="cart py-80">
                <div className="container container-lg">
                    <div className="text-center py-48 px-24 border border-danger-200 bg-danger-50 rounded-16">
                        <h6 className="text-danger-600 fw-bold mb-8">Unable to Load Cart</h6>
                        <p className="text-gray-600 mb-0">{error}</p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="cart py-80">
            <div className="container container-lg">
                <div className="row gy-4">
                    <div className="col-xl-9 col-lg-8">
                        <div className="cart-table border border-gray-100 rounded-8 px-40 py-48">
                            <div className="overflow-x-auto scroll-sm scroll-sm-horizontal">
                                <table className="table style-three">
                                    <thead>
                                        <tr>
                                            <th className="h6 mb-0 text-lg fw-bold">Delete</th>
                                            <th className="h6 mb-0 text-lg fw-bold">Product Name</th>
                                            <th className="h6 mb-0 text-lg fw-bold">Price</th>
                                            <th className="h6 mb-0 text-lg fw-bold">Quantity</th>
                                            <th className="h6 mb-0 text-lg fw-bold">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cartItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="text-center py-48 text-gray-500">
                                                    Your cart is empty.
                                                </td>
                                            </tr>
                                        ) : (
                                            cartItems.map((item) => (
                                                <tr key={item.productId}>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="remove-tr-btn flex-align gap-12 hover-text-danger-600"
                                                            onClick={() => handleRemoveItem(item.productId)}
                                                        >
                                                            <i className="ph ph-x-circle text-2xl d-flex" />
                                                            Remove
                                                        </button>
                                                    </td>
                                                    <td>
                                                        <div className="table-product d-flex align-items-center gap-24">
                                                            <Link
                                                                to="/product-details"
                                                                className="table-product__thumb border border-gray-100 rounded-8 flex-center "
                                                            >
                                                                <img
                                                                    src="assets/images/thumbs/product-two-img1.png"
                                                                    alt=""
                                                                />
                                                            </Link>
                                                            <div className="table-product__content text-start">
                                                                <h6 className="title text-lg fw-semibold mb-8">
                                                                    <Link
                                                                        to="/product-details"
                                                                        className="link text-line-2"
                                                                        tabIndex={0}
                                                                    >
                                                                        {item.productName}
                                                                    </Link>
                                                                </h6>
                                                                <div className="flex-align gap-16 mb-16">
                                                                    <span className="text-neutral-600 text-sm">
                                                                        Product ID: {item.productId}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="text-lg h6 mb-0 fw-semibold">
                                                            ${item.price.toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <QuantityControl initialQuantity={item.quantity} />
                                                    </td>
                                                    <td>
                                                        <span className="text-lg h6 mb-0 fw-semibold">
                                                            ${item.subtotal.toFixed(2)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex-between flex-wrap gap-16 mt-16">
                                <div className="flex-align gap-16">
                                    <input
                                        type="text"
                                        className="common-input"
                                        placeholder="Coupon Code"
                                    />
                                    <button
                                        type="submit"
                                        className="btn btn-main py-18 w-100 rounded-8"
                                    >
                                        Apply Coupon
                                    </button>
                                </div>
                                <button
                                    type="submit"
                                    className="text-lg text-gray-500 hover-text-main-600"
                                >
                                    Update Cart
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-3 col-lg-4">
                        <div className="cart-sidebar border border-gray-100 rounded-8 px-24 py-40">
                            <h6 className="text-xl mb-32">Cart Totals</h6>
                            <div className="bg-color-three rounded-8 p-24">
                                <div className="mb-32 flex-between gap-8">
                                    <span className="text-gray-900 font-heading-two">Subtotal</span>
                                    <span className="text-gray-900 fw-semibold">${totals.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="mb-32 flex-between gap-8">
                                    <span className="text-gray-900 font-heading-two">
                                        Extimated Delivery
                                    </span>
                                    <span className="text-gray-900 fw-semibold">Free</span>
                                </div>
                                <div className="mb-0 flex-between gap-8">
                                    <span className="text-gray-900 font-heading-two">
                                        Extimated Taxs
                                    </span>
                                    <span className="text-gray-900 fw-semibold">USD {totals.tax.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="bg-color-three rounded-8 p-24 mt-24">
                                <div className="flex-between gap-8">
                                    <span className="text-gray-900 text-xl fw-semibold">Total</span>
                                    <span className="text-gray-900 text-xl fw-semibold">${totals.total.toFixed(2)}</span>
                                </div>
                            </div>
                            <Link
                                to="/checkout"
                                className="btn btn-main mt-40 py-18 w-100 rounded-8"
                            >
                                Proceed to checkout
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>

    )
}

export default CartSection