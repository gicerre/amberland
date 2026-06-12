import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Le immagini possono arrivare da Cloudinary o da URL arbitrari incollati
    // dal Master (storage gratuito, vedi src/lib/upload/image-service.ts).
    // `unoptimized` evita di dover elencare ogni host in remotePatterns e non
    // espone /_next/image come proxy aperto. Gli asset locali sono già WebP
    // ottimizzati e Cloudinary serve immagini già ottimizzate via CDN.
    unoptimized: true,
  },
};

export default nextConfig;
