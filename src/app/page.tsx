export default function Home() {
  return (
    <main className="welcome" aria-label="Bienvenidos a Athelier">
      <picture className="welcome__art">
        <source
          media="(orientation: portrait)"
          type="image/svg+xml"
          srcSet="/bienvenida-vertical.svg"
        />
        <img
          src="/bienvenida-horizontal.svg"
          alt="Athelier. Bienvenidos."
          width={1600}
          height={900}
          decoding="async"
          fetchPriority="high"
        />
      </picture>
    </main>
  );
}
