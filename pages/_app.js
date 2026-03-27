import '../styles/globals.css'
import Head from 'next/head'
import { useEffect } from 'react'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  // Force SW update check on every page load to prevent stale assets
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => reg.update());
      });
    }
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ff4d1c" />
        <link rel="icon" type="image/png" href="/icons/icon-192x192.png" />
        <link rel="shortcut icon" type="image/png" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta property="og:title" content="Cinis — AI coaching for ADHD and executive function" />
        <meta property="og:description" content="Where start meets finished. The AI that builds your external executive function." />
        <meta property="og:image" content="https://cinis.app/og-image.png" />
        <meta property="og:url" content="https://cinis.app" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Cinis — AI coaching for ADHD and executive function" />
        <meta name="twitter:description" content="Where start meets finished. The AI that builds your external executive function." />
        <meta name="twitter:image" content="https://cinis.app/og-image.png" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
