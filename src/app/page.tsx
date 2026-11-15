"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { businessLines, type Language } from "@/lib/brand";

export default function Home() {
  const [language, setLanguage] = useState<Language>("es");
  const [imageFailed, setImageFailed] = useState(false);
  const english = language === "en";

  useEffect(() => {
    document.documentElement.lang = english ? "en" : "es-MX";
  }, [english]);

  useEffect(() => {
    const section = document.querySelector<HTMLElement>(".business-lines");
    if (!section) return;
    if (!("IntersectionObserver" in window)) {
      section.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        section.classList.add("is-visible");
        observer.disconnect();
      }
    }, { threshold: 0.06, rootMargin: "0px 0px 10% 0px" });
    observer.observe(section);
    section.classList.add("reveal-ready");
    return () => observer.disconnect();
  }, []);

  return (
    <main className="landing">
      <section id="inicio" className="welcome"
        aria-label={english ? "Welcome to Athelier" : "Bienvenidos a Athelier"}>
        <nav className="language-switch"
          aria-label={english ? "Choose language" : "Seleccionar idioma"}>
          <button type="button"
            className={english ? "language-switch__option" : "language-switch__option is-active"}
            onClick={() => setLanguage("es")} aria-pressed={!english} lang="es">ES</button>
          <button type="button"
            className={english ? "language-switch__option is-active" : "language-switch__option"}
            onClick={() => setLanguage("en")} aria-pressed={english} lang="en">EN</button>
        </nav>
        {english ? (
          <picture className="welcome__art">
            <source media="(orientation: portrait)" type="image/svg+xml" srcSet="/welcome-vertical.svg" />
            <img src="/welcome-horizontal.svg" alt="Athelier. Welcome."
              width={1600} height={900} decoding="async" fetchPriority="high" />
          </picture>
        ) : (
          <div className="welcome__art welcome__art--brand">
            {imageFailed ? (
              <img src="/logo-athelier.svg"
                alt="Athelier. Tu historia hecha presente, única como tú."
                className="welcome__fallback" width={1261} height={729} />
            ) : (
              <img src="/athelier-hero.svg"
                alt="Athelier. Tu historia hecha presente, única como tú."
                width={1672} height={941} decoding="async" fetchPriority="high"
                onError={() => setImageFailed(true)} />
            )}
          </div>
        )}
        <a className="scroll-cue" href="#lineas"
          aria-label={english ? "Explore our collections" : "Descubre nuestras líneas"}>
          <span>{english ? "Discover" : "Descubre"}</span>
          <span className="scroll-cue__arrow" aria-hidden="true">↓</span>
        </a>
      </section>

      <section id="lineas" className="business-lines"
        aria-label={english ? "Choose a collection" : "Elige una línea de negocio"}>
        <div className="business-lines__grid">
          {businessLines.map((line) => (
            <Link key={line.id} href={`/colecciones/${line.id}`}
              className={`business-panel business-panel--${line.id}`}
              aria-label={english
                ? `Explore ${line.name}, ${line.category.en}`
                : `Explorar ${line.name}, ${line.category.es}`}>
              <div className="business-panel__visual"
                style={{ backgroundImage: `linear-gradient(180deg, rgba(40, 24, 21, .04) 18%, rgba(45, 23, 26, .72) 100%), url("${line.image}")` }}
                role="img" aria-label={line.imageAlt[language]} />
              <div className="business-panel__content">
                <span className="business-panel__number">{line.number} / {line.category[language]}</span>
                <h2 className="business-panel__name">{line.name}</h2>
                <p className="business-panel__tagline">{line.tagline[language]}</p>
                <span className="business-panel__action">
                  {english ? "Explore collection" : "Explorar colección"}
                  <span aria-hidden="true"> ↗</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
        <div className="business-lines__footer">
          <span>ATHELIER</span>
          <Link href="/carrito">Carrito</Link>
          <Link href="/admin">Administración</Link>
          <a href="#inicio">{english ? "Back to start ↑" : "Volver al inicio ↑"}</a>
        </div>
      </section>
    </main>
  );
}
