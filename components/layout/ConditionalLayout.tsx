'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();

  // Don't show header/footer for embed routes and public KYC link routes
  const isEmbedRoute = pathname?.startsWith('/embed');
  const isPublicKycRoute = pathname?.startsWith('/kyc/') &&
    !pathname?.includes('/kyc/individual') &&
    !pathname?.includes('/kyc/business');

  const isPublicRoute = isEmbedRoute || isPublicKycRoute;

  // Hide devtools indicator on public routes
  useEffect(() => {
    if (isPublicRoute) {
      const hideDevtools = () => {
        const devtools = document.getElementById('devtools-indicator');
        if (devtools) {
          devtools.style.display = 'none';
        }
      };

      // Try immediately and with delays (element might be added later)
      hideDevtools();
      const interval = setInterval(hideDevtools, 100);
      setTimeout(() => clearInterval(interval), 3000);

      return () => clearInterval(interval);
    }
  }, [isPublicRoute]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
