import React from 'react';

export function RealEstateAgentSchema() {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": ["RealEstateAgent", "LocalBusiness", "ProfessionalService"],
    "@id": "https://onestoppropertysolution.in/#realestateagent",
    "name": "One Stop Property Solutions",
    "alternateName": [
      "One Stop Property Solutions Kamothe",
      "Best Real Estate Agent in Kamothe",
      "Top Property Consultant Navi Mumbai",
      "One Stop Property Solutions Navi Mumbai"
    ],
    "legalName": "One Stop Property Solutions",
    "url": "https://onestoppropertysolution.in",
    "logo": "https://onestoppropertysolution.in/logo.png",
    "image": [
      "https://onestoppropertysolution.in/office-front.jpg",
      "https://onestoppropertysolution.in/team.jpg"
    ],
    "description": "One Stop Property Solutions is the #1 rated real estate agency and property consultancy in Kamothe, Navi Mumbai. Established in 2014, offering expert services in 1BHK, 2BHK, 3BHK flat resales, new project bookings, CIDCO transfer properties, commercial shops, office leasing, and home loan documentation across Kamothe, Kharghar, and Panvel.",
    "foundingDate": "2014",
    "priceRange": "₹₹ - ₹₹₹₹",
    "telephone": ["+91-9845260285", "+91-9870178204", "+91-8879757407"],
    "email": "contact@onestoppropertysolution.in",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Shop No. 3, Plot No. 87/88A, Tulsi Corner Building, Sector 21",
      "addressLocality": "Kamothe, Navi Mumbai",
      "addressRegion": "Maharashtra",
      "postalCode": "410209",
      "addressCountry": "IN"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 19.0144,
      "longitude": 73.0931
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday"
        ],
        "opens": "10:00",
        "closes": "20:30"
      }
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "bestRating": "5.0",
      "worstRating": "1.0",
      "ratingCount": "385",
      "reviewCount": "385"
    },
    "areaServed": [
      {
        "@type": "AdministrativeArea",
        "name": "Kamothe, Navi Mumbai"
      },
      {
        "@type": "AdministrativeArea",
        "name": "Khandeshwar, Navi Mumbai"
      },
      {
        "@type": "AdministrativeArea",
        "name": "Kharghar, Navi Mumbai"
      },
      {
        "@type": "AdministrativeArea",
        "name": "Panvel, Navi Mumbai"
      },
      {
        "@type": "AdministrativeArea",
        "name": "Roadpali, Navi Mumbai"
      },
      {
        "@type": "AdministrativeArea",
        "name": "Ulwe, Navi Mumbai"
      },
      {
        "@type": "AdministrativeArea",
        "name": "Taloja, Navi Mumbai"
      }
    ],
    "sameAs": [
      "https://www.justdial.com/Navi-Mumbai/One-Stop-Property-Solutions-Near-Jivan-Jyot-Hospital-Kamothe/022PXX22-XX22-140510162544-Y7I8_BZDET",
      "https://thepropertist.com/agent/one-stop-property-solutions",
      "https://ilovenavimumbai.com/kamothe-real-estate-agents",
      "https://www.99acres.com",
      "https://www.magicbricks.com",
      "https://housing.com",
      "https://www.facebook.com/onestoppropertysolutions"
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}
