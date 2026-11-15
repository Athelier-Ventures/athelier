"use client";

import { useEffect, useState } from "react";

type Language = "es" | "en";

export default function Home() {
  const [language, setLanguage] = useState<Language>("es");
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    document.documentElement.lang = language === "es" ? "es-MX" : "en";
  }, [language]);

  const english = language === "en";

  return (
    <main
      className="welcome"
      aria-label={english ? "Welcome to Athelier" : "Bienvenidos a Athelier"}
    >
      <nav
        className="language-switch"
        aria-label={english ? "Choose language" : "Seleccionar idioma"}
      >
        <button
          type="button"
          className={language === "es" ? "language-switch__option is-active" : "language-switch__option"}
          onClick={() => setLanguage("es")}
          aria-pressed={language === "es"}
          lang="es"
        >ES</button>
        <button
          type="button"
          className={language === "en" ? "language-switch__option is-active" : "language-switch__option"}
          onClick={() => setLanguage("en")}
          aria-pressed={language === "en"}
          lang="en"
        >EN</button>
      </nav>
      {imageFailed ? (
        <picture className="welcome__art">
          <source
            media="(orientation: portrait)"
            srcSet={english ? "/welcome-vertical.svg" : "/bienvenida-vertical.svg"}
          />
          <img
            src={english ? "/welcome-horizontal.svg" : "/bienvenida-horizontal.svg"}
            alt={english ? "Athelier. Welcome." : "Athelier. Bienvenidos."}
            width={1600}
            height={900}
          />
        </picture>
      ) : (
        <div className="welcome__art welcome__art--brand">
          <img
            src="/athelier-hero.webp"
            alt="Athelier. Tu historia hecha presente, unica como tu."
            width={1672}
            height={941}
            decoding="async"
            fetchPriority="high"
            onError={() => setImageFailed(true)}
          />
        </div>
      )}
    </main>
  );
}
