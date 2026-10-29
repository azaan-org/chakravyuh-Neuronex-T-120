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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" />
      </head>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
