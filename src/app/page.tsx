"use client";

import { useEffect, useState } from "react";

type Language = "es" | "en";

const businessLines = [
  {
    key: "reposteria",
    number: "01",
    name: "Dulce Tentación",
    category: { es: "Repostería", en: "Bakery" },
    description: { es: "Momentos que se disfrutan", en: "Moments to savour" },
  },
  {
    key: "personalizaciones",
    number: "02",
    name: "Manchas y Trazos",
    category: { es: "Personalizaciones", en: "Personalised gifts" },
    description: { es: "Detalles que cuentan historias", en: "Details that tell stories" },
  },
  {
    key: "fotografia",
    number: "03",
    name: "Eco en Tinta",
    category: { es: "Fotografía y recuerdos", en: "Photography & keepsakes" },
    description: { es: "Tus recuerdos toman forma", en: "Your memories take shape" },
  },
] as const;

export default function Home() {
  const [language, setLanguage] = useState<Language>("es");
  const [imageFailed, setImageFailed] = useState(false);
  const english = language === "en";

  useEffect(() => {
    document.documentElement.lang = english ? "en" : "es-MX";
  }, [english]);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const sections = document.querySelectorAll<HTMLElement>(".business-band");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -3% 0px" },
    );

    sections.forEach((section) => {
      section.classList.add("reveal-ready");
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <main className="landing">
      <section
        id="inicio"
        className="welcome"
        aria-label={english ? "Welcome to Athelier" : "Bienvenidos a Athelier"}
      >
        <nav
          className="language-switch"
          aria-label={english ? "Choose language" : "Seleccionar idioma"}
        >
          <button
            type="button"
            className={english ? "language-switch__option" : "language-switch__option is-active"}
            onClick={() => setLanguage("es")}
            aria-pressed={!english}
            lang="es"
          >
            ES
          </button>
          <button
            type="button"
            className={english ? "language-switch__option is-active" : "language-switch__option"}
            onClick={() => setLanguage("en")}
            aria-pressed={english}
            lang="en"
          >
            EN
          </button>
        </nav>

        {english ? (
          <picture className="welcome__art">
            <source
              media="(orientation: portrait)"
              type="image/svg+xml"
              srcSet="/welcome-vertical.svg"
            />
            <img
              src="/welcome-horizontal.svg"
              alt="Athelier. Welcome."
              width={1600}
              height={900}
              decoding="async"
              fetchPriority="high"
            />
          </picture>
        ) : (
          <div className="welcome__art welcome__art--brand">
            {imageFailed ? (
              <img
                src="/logo-athelier.svg"
                alt="Athelier. Tu historia hecha presente, única como tú."
                className="welcome__fallback"
                width={1261}
                height={729}
              />
            ) : (
              <img
                src="/athelier-hero.svg"
                alt="Athelier. Tu historia hecha presente, única como tú."
                width={1672}
                height={941}
                decoding="async"
                fetchPriority="high"
                onError={() => setImageFailed(true)}
              />
            )}
          </div>
        )}

        <a
          className="scroll-cue"
          href="#lineas"
          aria-label={english ? "Explore our collections" : "Descubre nuestras líneas"}
        >
          <span>{english ? "Discover" : "Descubre"}</span>
          <span className="scroll-cue__arrow" aria-hidden="true">↓</span>
        </a>
      </section>

      <div
        className="business-lines"
        id="lineas"
        aria-label={english ? "Our brands" : "Nuestras líneas de negocio"}
      >
        {businessLines.map((line) => (
          <section
            className={`business-band business-band--${line.key}`}
            key={line.key}
            aria-labelledby={`line-${line.key}`}
          >
            <div className="business-band__inner">
              <div className="business-band__intro">
                <span className="business-band__number" aria-hidden="true">
                  {line.number} <span className="business-band__rule" />
                </span>
                <span className="business-band__category">{line.category[language]}</span>
              </div>
              <h2 className="business-band__name" id={`line-${line.key}`}>
                {line.name}
              </h2>
              <p className="business-band__description">{line.description[language]}</p>
            </div>
            <div className="business-band__ornament" aria-hidden="true" />
          </section>
        ))}
      </div>
    </main>
  );
}
