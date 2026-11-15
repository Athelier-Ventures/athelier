"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadCart } from "@/lib/cart-client";
import { useSiteLanguage } from "@/lib/language-client";
export default function FloatingCart() {
  const { language } = useSiteLanguage();
  const [count, setCount] = useState(0);
  useEffect(() => {
    const sync = () => setCount(loadCart().reduce((n, item) => n + item.quantity, 0));
    sync();
    window.addEventListener("athelier-cart-changed", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("athelier-cart-changed", sync); window.removeEventListener("storage", sync); };
  }, []);
  return <Link className="floating-cart" href="/carrito" aria-label={language === "en" ? `Shopping cart, ${count} items` : `Carrito de compras, ${count} productos`}>
    <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.4 13.5a2 2 0 0 0 2 1.5h10a2 2 0 0 0 2-1.6L23 6H6"/></svg>
    <span className="floating-cart__count">{count}</span>
  </Link>;
}
