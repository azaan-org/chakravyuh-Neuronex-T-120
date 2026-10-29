import './globals.css';
import Nav from '@/components/Nav';

export const metadata = {
  title: 'PulseENTC',
  description: 'Interactive ENTC labs that find and fix student misconceptions with AI.'
};

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0a0f15' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
