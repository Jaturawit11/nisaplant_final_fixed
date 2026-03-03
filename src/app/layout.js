import './globals.css'

export const viewport = {
  themeColor: '#ffffff',
}

export const metadata = {
  title: 'Nisa Plant POS',
  description: 'Locked Blueprint - Mobile First',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Mali:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  )
}
