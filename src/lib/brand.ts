export type LineId = "reposteria" | "personalizaciones" | "fotografia";
export type Language = "es" | "en";
export type Localized = { es: string; en: string };

export interface BusinessLine {
  id: LineId;
  number: string;
  name: string;
  category: Localized;
  tagline: Localized;
  introduction: Localized;
  image: string;
  imageAlt: Localized;
  examples: Localized[];
}

/** Images are editorial references, not listings for sale. Unsplash License. */
export const businessLines: BusinessLine[] = [
  {
    id: "reposteria",
    number: "01",
    name: "Dulce Tentación",
    category: { es: "Repostería", en: "Bakery" },
    tagline: { es: "Momentos que se disfrutan", en: "Moments to savour" },
    introduction: {
      es: "Galletas y detalles dulces para compartir. Elige únicamente las presentaciones y complementos que habilite el taller.",
      en: "Cookies and handcrafted treats. Choose from the formats and additions offered by the studio."
    },
    image: "https://images.unsplash.com/photo-1772651392135-b891a5e4f8a3?auto=format&fit=crop&w=1100&q=80",
    imageAlt: { es: "Caja de galletas artesanales", en: "Artisan cookies in a gift box" },
    examples: [
      { es: "Galletas en caja o bolsa", en: "Cookies in a box or bag" },
      { es: "Complementos como nuez, arándanos o chocolate", en: "Optional nuts, cranberries or chocolate" },
      { es: "Presentaciones para regalar", en: "Gift-ready presentations" }
    ]
  },
  {
    id: "personalizaciones",
    number: "02",
    name: "Manchas y Trazos",
    category: { es: "Personalizaciones", en: "Personalised creations" },
    tagline: { es: "Detalles que cuentan historias", en: "Details that tell stories" },
    introduction: {
      es: "Libretas, tazas y cilindros con acabados y detalles definidos por ti, siempre dentro de las posibilidades que publique el taller.",
      en: "Notebooks, mugs and tumblers with personal touches selected from the studio's available options."
    },
    image: "https://images.unsplash.com/photo-1683920978925-34df45224ad6?auto=format&fit=crop&w=1100&q=80",
    imageAlt: { es: "Libreta rosa y materiales de papelería", en: "Pink notebook and stationery" },
    examples: [
      { es: "Libretas de 50, 100 o 150 hojas", en: "50, 100 or 150-sheet notebooks" },
      { es: "Pastas, secciones, imágenes y dedicatorias", en: "Covers, sections, images and dedications" },
      { es: "Tazas y cilindros con vinil permanente", en: "Custom mugs and tumblers" }
    ]
  },
  {
    id: "fotografia",
    number: "03",
    name: "Eco en Tinta",
    category: { es: "Fotografía y recuerdos", en: "Photography & keepsakes" },
    tagline: { es: "Tus recuerdos toman forma", en: "Your memories take shape" },
    introduction: {
      es: "Tú compartes tus fotografías; nosotros las transformamos en álbumes, pósters y portarretratos, incluso con experiencias digitales mediante NFC.",
      en: "Share your photos and turn them into albums, posters and frames, including NFC-linked digital galleries."
    },
    image: "https://images.unsplash.com/photo-1595981235363-6cf7a4a34c76?auto=format&fit=crop&w=1100&q=80",
    imageAlt: { es: "Fotografías y recuerdos impresos en tonos pastel", en: "Printed photographs and keepsakes in pastel colours" },
    examples: [
      { es: "Álbumes fotográficos", en: "Photo albums" },
      { es: "Pósters y portarretratos", en: "Posters and picture frames" },
      { es: "Portarretratos NFC con galerías actualizables", en: "NFC frames with updatable galleries" }
    ]
  }
];

export function findBusinessLine(id: string): BusinessLine | undefined {
  return businessLines.find((line) => line.id === id);
}
