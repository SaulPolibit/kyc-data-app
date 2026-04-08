import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Identity Verification',
  description: 'Complete your identity verification',
  // Prevent indexing of embed pages
  robots: {
    index: false,
    follow: false,
  },
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Minimal layout without app shell (no header/footer)
  // Note: This is a nested layout, html/body are provided by root layout
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
