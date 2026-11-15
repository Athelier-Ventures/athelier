"use client";

import { useEffect, useState } from "react";

type Language = "es" | "en";

export default function Home() {
  const [language, setLanguage] = useState<Language>("es");
  const [imageFailed, setImageFailed] = useState(false);
  const english = language === "en";

  useEffect(() => {
    document.documentElement.lang = english ? "en" : "es-MX";
  }, [english]);

  return (
    <main className="welcome" aria-label={english ? "Welcome to Athelier" : "Bienvenidos a Athelier"}>
      <nav className="language-switch" aria-label={english ? "Choose language" : "Seleccionar idioma"}>
        <button
          type="button"
          className={english ? "language-switch__option" : "language-switch__option is-active"}
          onClick={() => setLanguage("es")}
          aria-pressed={!english}
          lang="es"
        >ES</button>
        <button
          type="button"
          className={english ? "language-switch__option is-active" : "language-switch__option"}
          onClick={() => setLanguage("en")}
          aria-pressed={english}
          lang="en"
        >EN</button>
      </nav>

      {english ? (
        <picture className="welcome__art">
          <source media="(orientation: portrait)" type="image/svg+xml" srcSet="/welcome-vertical.svg" />
          <img src="/welcome-horizontal.svg" alt="Athelier. Welcome." width={1600} height={900} decoding="async" />
        </picture>
      ) : (
        <div className="welcome__art welcome__art--brand">
          {imageFailed ? (
            <img
              src="/logo-athelier.svg"
              alt="Athelier. Tu historia hecha presente, única como tú."
              className="welcome__fallback"
              width={1261}
              height={731}
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
    </main>
  );
}
