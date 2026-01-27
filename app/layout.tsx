import './globals.css'

export const metadata = {
  title: 'Invoice Generator',
  description: 'Generate invoices from Google Sheets data',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
