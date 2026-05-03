import './globals.css';
import { Quicksand, Baloo_2 } from 'next/font/google';
import { I18nProvider } from '@/lib/i18n-context';
import { Toaster } from '@/components/ui/sonner';

// Quicksand: friendly rounded sans-serif with full Vietnamese support — body
const quicksand = Quicksand({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-quicksand',
  display: 'swap',
});

// Baloo 2: playful chunky display face with full Vietnamese support — headings
const baloo = Baloo_2({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-baloo',
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
    <html lang="vi" className={`${quicksand.variable} ${baloo.variable}`}>
      <body className="min-h-screen bg-background text-foreground">
        <I18nProvider>
          {children}
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
