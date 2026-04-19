/**
 * GlobalJsonLd
 *
 * Combined Organization + SoftwareApplication structured-data blob
 * intended for the marketing layout (renders on every public page).
 *
 * The JSON is escaped to defend against a `</script>` injection.
 */

export function GlobalJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://www.find-commonground.com/#organization',
        name: 'CommonGround',
        url: 'https://www.find-commonground.com',
        logo: {
          '@type': 'ImageObject',
          url: 'https://www.find-commonground.com/images/logo-email.png',
        },
        sameAs: [] as string[],
      },
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://www.find-commonground.com/#software',
        name: 'CommonGround',
        url: 'https://www.find-commonground.com',
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web, iOS, Android',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        publisher: {
          '@id': 'https://www.find-commonground.com/#organization',
        },
      },
    ],
  };

  const safe = JSON.stringify(data).replace(/</g, '\u003c');

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
