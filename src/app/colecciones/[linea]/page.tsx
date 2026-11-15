import Link from "next/link";
import { notFound } from "next/navigation";
import { businessLines, findBusinessLine } from "@/lib/brand";

type PageProps = { params: Promise<{ linea: string }> };

export function generateStaticParams() {
  return businessLines.map((line) => ({ linea: line.id }));
}

export default async function CollectionPage({ params }: PageProps) {
  const { linea } = await params;
  const line = findBusinessLine(linea);
  if (!line) notFound();

  return (
    <main className="collection">
      <nav className="collection__top" aria-label="Navegación">
        <Link className="collection__back" href="/#lineas">← Volver a las colecciones</Link>
        <span className="collection__brand">ATHELIER</span>
      </nav>
      <section className="collection__hero">
        <div>
          <span className="collection__eyebrow">{line.number} / {line.category.es}</span>
          <h1 className="collection__title">{line.name}</h1>
          <p className="collection__tagline">{line.tagline.es}</p>
          <p className="collection__intro">{line.introduction.es}</p>
        </div>
        <img className="collection__image" src={line.image}
          alt={line.imageAlt.es} loading="lazy" width="700" height="875" />
      </section>
      <section className="collection__section" aria-labelledby="ideas">
        <h2 id="ideas">Lo que podrás encontrar</h2>
        <ul className="collection__examples">
          {line.examples.map((example) => <li key={example.es}>{example.es}</li>)}
        </ul>
        <p className="collection__notice">
          Esta sección presenta las posibilidades previstas. El catálogo comercial y las compras
          estarán disponibles cuando los propietarios publiquen sus productos, precios y opciones.
          No se están aceptando pedidos ni pagos desde esta vista.
        </p>
      </section>
      <nav className="collection__top" aria-label="Explorar otras líneas">
        <Link className="collection__back" href="/#lineas">← Elegir otra línea de negocio</Link>
      </nav>
    </main>
  );
}
