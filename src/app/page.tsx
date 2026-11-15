"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { businessLines } from "@/lib/brand";
import { useSiteLanguage } from "@/lib/language-client";
import FloatingCart from "./floating-cart";

export default function Home() {
  const { language, changeLanguage } = useSiteLanguage();
  const english = language === "en";
  const [showCollections, setShowCollections] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const cooldownUntil = useRef(0);
  const touchStart = useRef<number | null>(null);

  const reveal = useCallback((next: boolean) => {
    if (Date.now() < cooldownUntil.current) return;
    cooldownUntil.current = Date.now() + 950;
    setShowCollections(next);
    window.history.replaceState(null, "", next ? "#lineas" : "#inicio");
  }, []);

  useEffect(() => {
    if (window.location.hash === "#lineas") setShowCollections(true);
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 5) return;
      event.preventDefault(); // Wheel triggers a stage transition, never page scroll.
      reveal(event.deltaY > 0);
    };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select, [contenteditable]")) return;
      if (["ArrowDown", "PageDown", " "].includes(event.key)) { event.preventDefault(); reveal(true); }
      if (["ArrowUp", "PageUp", "Escape"].includes(event.key)) { event.preventDefault(); reveal(false); }
    };
    const onHash = () => setShowCollections(window.location.hash === "#lineas");
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", onHash);
    };
  }, [reveal]);

  return (
    <main className={`landing ${showCollections ? "is-open" : ""}`}
      onTouchStart={event => { touchStart.current = event.touches[0]?.clientY ?? null; }}
      onTouchEnd={event => {
        const firstY = touchStart.current;
        touchStart.current = null;
        if (firstY === null) return;
        const delta = firstY - (event.changedTouches[0]?.clientY ?? firstY);
        if (Math.abs(delta) >= 45) reveal(delta > 0);
      }}>
      <nav className="language-switch" aria-label={english ? "Select language" : "Seleccionar idioma"}>
        <button type="button" className={english ? "language-switch__option" : "language-switch__option is-active"}
          aria-pressed={!english} lang="es" onClick={() => changeLanguage("es")}>ES</button>
        <button type="button" className={english ? "language-switch__option is-active" : "language-switch__option"}
          aria-pressed={english} lang="en" onClick={() => changeLanguage("en")}>EN</button>
      </nav>
      <FloatingCart />
      <section id="inicio" className="welcome" aria-label={english ? "Athelier welcome" : "Bienvenida a Athelier"}
        aria-hidden={showCollections}>
        <picture className="welcome__art welcome__art--brand">
          <source media="(orientation: portrait)" type="image/svg+xml"
            srcSet={english ? "/athelier-hero-en.svg" : "/athelier-hero.svg"} />
          <img src={imageFailed ? "/logo-athelier.svg" : english ? "/athelier-hero-en.svg" : "/athelier-hero.svg"}
            alt={english ? "Athelier. Your story made tangible, as unique as you." : "Athelier. Tu historia hecha presente, única como tú."}
            width={1672} height={941} decoding="async" fetchPriority="high"
            onError={() => setImageFailed(true)} />
        </picture>
        <button className="scroll-cue" type="button" onClick={() => reveal(true)}
          tabIndex={showCollections ? -1 : 0} aria-label={english ? "Discover the three collections" : "Descubre las tres colecciones"}>
          <span>{english ? "Discover" : "Descubre"}</span>
          <span className="scroll-cue__arrow" aria-hidden="true">↓</span>
        </button>
      </section>
      <section id="lineas" className="business-lines"
        aria-label={english ? "Choose a collection" : "Elige una colección"}
        aria-hidden={!showCollections}>
        <div className="business-lines__grid">
          {businessLines.map(line => <Link key={line.id} href={`/colecciones/${line.id}`}
            tabIndex={showCollections ? 0 : -1}
            className={`business-panel business-panel--${line.id}`}
            aria-label={english ? `Explore ${line.name}, ${line.category.en}` : `Explorar ${line.name}, ${line.category.es}`}>
            <div className="business-panel__visual"
              style={{ backgroundImage: `linear-gradient(180deg, rgba(40,24,21,.04) 18%, rgba(45,23,26,.72) 100%), url("${line.image}")` }}
              role="img" aria-label={line.imageAlt[language]} />
            <div className="business-panel__content">
              <span className="business-panel__number">{line.number} / {line.category[language]}</span>
              <h2 className="business-panel__name">{line.name}</h2>
              <p className="business-panel__tagline">{line.tagline[language]}</p>
              <span className="business-panel__action">{english ? "Explore collection" : "Explorar colección"} <span aria-hidden="true">↗</span></span>
            </div>
          </Link>)}
        </div>
        <button className="return-cue" type="button" onClick={() => reveal(false)} tabIndex={showCollections ? 0 : -1}>
          {english ? "Back to Athelier ↑" : "Volver a Athelier ↑"}
        </button>
      </section>
      <Link className="landing__admin" href="/admin" aria-label={english ? "Administration" : "Administración"}>
        {english ? "Administration" : "Administración"}
      </Link>
    </main>
  );
}
