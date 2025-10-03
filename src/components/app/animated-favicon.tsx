
'use client';

import { useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Logo } from '@/components/logo';

export function AnimatedFavicon() {

  useEffect(() => {
    const favicon = document.getElementById('favicon') as HTMLLinkElement | null;
    if (!favicon) return;

    // SVG must be a string to be encoded
    const svgString = renderToStaticMarkup(<Logo />);

    // Create a data URL from the SVG
    const dataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;

    favicon.href = dataUrl;

  }, []);

  return null;
}
