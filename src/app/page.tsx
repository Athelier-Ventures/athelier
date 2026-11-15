"use client";

import { useEffect, useState } from "react";

type Language = "es" | "en";

export default function Home() {
  // Español es el idioma inicial para todos los visitantes.
  const [language, setLanguage] = useState<Language>("es");

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
        >
          ES
        </button>
        <button
          type="button"
          className={language === "en" ? "language-switch__option is-active" : "language-switch__option"}
          onClick={() => setLanguage("en")}
          aria-pressed={language === "en"}
          lang="en"
        >
          EN
        </button>
      </nav>

      <picture key={language} className="welcome__art">
        <source
          media="(orientation: portrait)"
          type="image/svg+xml"
          srcSet={english ? "/welcome-vertical.svg" : "/bienvenida-vertical.svg"}
        />
        <img
          src={english ? "/welcome-horizontal.svg" : "/bienvenida-horizontal.svg"}
          alt={english ? "Athelier. Welcome." : "Athelier. Bienvenidos."}
          width={1600}
          height={900}
          decoding="async"
          fetchPriority="high"
        />
      </picture>
    </main>
  );
}
