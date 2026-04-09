import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DataGhost',
  description: 'Vulnerability Management Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Anti-flash: read darkMode from localStorage BEFORE first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('darkMode');
                  var isDark = saved === null ? true : saved === 'true';
                  document.documentElement.style.background = isDark ? '#0A0A0F' : '#F0F2F5';
                  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                } catch(e) {
                  document.documentElement.style.background = '#0A0A0F';
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
