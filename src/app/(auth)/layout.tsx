'use client';
import './auth-globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata = {
  title: 'Admin | JÀMM AK XÉEWAL',
  description: 'Administration du mouvement JÀMM AK XÉEWAL',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} font-sans bg-gray-50`}>
        {children}
      </body>
    </html>
  );
}
