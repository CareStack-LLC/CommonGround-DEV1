import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/settings/',
          '/professional/',
          '/court-portal/',
          '/api/',
          '/messages/',
          '/schedule/',
          '/agreements/',
          '/clearfund/',
          '/kidcoms/',
          '/family-files/',
        ],
      },
    ],
    sitemap: 'https://www.find-commonground.com/sitemap.xml',
  };
}
