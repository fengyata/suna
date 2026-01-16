import { Suspense } from 'react';
import { Navbar } from '@/components/home/navbar';

export default function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="w-full relative">
      {/* <Navbar /> */}
      <Suspense fallback={null}>{children}</Suspense>
    </div>
  );
}
