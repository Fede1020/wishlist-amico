import './globals.css';

export const metadata = {
  title: 'DaComprare - La tua wishlist intelligente',
  description: 'Tutti i giochi da prendere, divisi per negozio. Spunta quelli comprati e fatti consigliare dall\'AI.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}