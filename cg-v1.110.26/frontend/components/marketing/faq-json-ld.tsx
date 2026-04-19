/**
 * FaqJsonLd
 *
 * Emits a Schema.org FAQPage blob as an application/ld+json script.
 * Pair this with the visible FAQ component so Google can render rich
 * snippets in search results.
 *
 * The JSON is escaped to defend against a `</script>` injection via
 * user-provided answer text.
 */

export interface FaqJsonLdItem {
  question: string;
  answer: string;
}

export interface FaqJsonLdProps {
  items: FaqJsonLdItem[];
}

export function FaqJsonLd({ items }: FaqJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  const safe = JSON.stringify(data).replace(/</g, '\u003c');

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
