import './globals.css';

export const metadata = {
  title: 'Google Spend Leaderboard',
  description: 'Monthly Google Ads spend leaderboard by strategist',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
