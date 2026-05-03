import './globals.css';
import { Fredoka, Figtree } from 'next/font/google';
import { I18nProvider } from '@/lib/i18n-context';
import { Toaster } from '@/components/ui/sonner';

const fredoka = Fredoka({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fredoka',
  display: 'swap',
});

const figtree = Figtree({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-figtree',
  display: 'swap',
});

export const metadata = {
  title: 'Hát Kinh Thánh cùng Tiny Faith Songs · Bible Song Contest',
  description:
    'Cuộc thi âm nhạc Kinh Thánh dành cho các bé từ 15 tuổi trở xuống. Bible Song Contest for kids 15 and under.',
  icons: {
    icon: '/poster-vertical.jpg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${fredoka.variable} ${figtree.variable}`}>
      <body className="min-h-screen bg-background text-foreground">
        <I18nProvider>
          {children}
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
