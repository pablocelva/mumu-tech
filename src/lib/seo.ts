export interface SeoMetadataProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  author?: string;
  publishedTime?: string;
}

export const DEFAULT_SITE_METADATA = {
  siteName: 'Mumu Tech',
  title: 'Mumu Tech | Talleres de Electrónica DIY, Pedales y Reparaciones',
  description:
    'Espacio de electrónica creativa, construcción de pedales de guitarra DIY, sintetizadores, reparaciones de audio y modificaciones analógicas vintage.',
  url: 'https://mumutech.netlify.app',
  image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
  twitterHandle: '@mumutech',
  locale: 'es_CL',
};

/**
 * Generates JSON-LD schema for LocalBusiness / Technical Service & Workshops
 */
export function generateLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Mumu Tech',
    image: DEFAULT_SITE_METADATA.image,
    description: DEFAULT_SITE_METADATA.description,
    url: DEFAULT_SITE_METADATA.url,
    telephone: '+56900000000',
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'CL',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '10:00',
        closes: '20:00',
      },
    ],
    sameAs: [
      'https://instagram.com/mumutech',
      'https://wa.me/56900000000',
      'https://github.com/mumutech',
    ],
  };
}

/**
 * Generates JSON-LD for an educational workshop course or event
 */
export function generateCourseSchema(workshop: {
  title: string;
  description: string;
  price?: number;
  durationHours?: number;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: workshop.title,
    description: workshop.description,
    provider: {
      '@type': 'Organization',
      name: 'Mumu Tech',
      sameAs: DEFAULT_SITE_METADATA.url,
    },
    offers: workshop.price
      ? {
          '@type': 'Offer',
          price: workshop.price,
          priceCurrency: 'CLP',
          category: 'Taller de Electrónica',
        }
      : undefined,
  };
}
