"use client";
import Link from "next/link";
import type { BusinessLine } from "@/lib/brand";
import { useSiteLanguage } from "@/lib/language-client";
import FloatingCart from "@/app/floating-cart";
import CollectionCatalog from "./catalog-client";
export default function CollectionView({ line }: { line: BusinessLine }) {
  const { language, changeLanguage } = useSiteLanguage();
  const en = language === "en";
  return <main className="collection">
    <nav className="collection__top" aria-label={en ? "Navigation" : "Navegación"}>
      <Link className="collection__back" href="/#lineas">{en ? "← Back to collections" : "← Volver a las colecciones"}</Link>
      <span className="collection__brand">ATHELIER</span>
    </nav>
    <nav className="collection__language" aria-label={en ? "Language" : "Idioma"}>
      <button type="button" aria-pressed={!en} onClick={()=>changeLanguage("es")}>ES</button>
      <button type="button" aria-pressed={en} onClick={()=>changeLanguage("en")}>EN</button>
    </nav>
    <FloatingCart />
    <section className="collection__hero">
      <div>
        <span className="collection__eyebrow">{line.number} / {line.category[language]}</span>
        <h1 className="collection__title">{line.name}</h1>
        <p className="collection__tagline">{line.tagline[language]}</p>
        <p className="collection__intro">{line.introduction[language]}</p>
      </div>
      <img className="collection__image" src={line.image} alt={line.imageAlt[language]} loading="lazy" width="700" height="875" />
    </section>
    <section className="collection__section" aria-labelledby="ideas">
      <h2 id="ideas">{en ? "Discover what we make" : "Lo que podrás encontrar"}</h2>
      <ul className="collection__examples">{line.examples.map(example => <li key={example.es}>{example[language]}</li>)}</ul>
      <p className="collection__notice">{en ?
        "This page describes planned offerings. The catalogue will show purchasable products once the owners publish them. Orders and payments are not currently accepted." :
        "Esta sección presenta las posibilidades previstas. Los productos aparecerán cuando los propietarios los publiquen. Todavía no se aceptan pedidos ni pagos."}</p>
    </section>
    <CollectionCatalog linea={line.id} />
    <nav className="collection__top" aria-label={en ? "More collections" : "Otras colecciones"}>
      <Link className="collection__back" href="/#lineas">{en ? "← Choose another collection" : "← Elegir otra línea de negocio"}</Link>
    </nav>
  </main>;
}
