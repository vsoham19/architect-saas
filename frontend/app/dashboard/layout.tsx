'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import Navbar from '../../components/Navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { currentUser, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, isInitialized, router]);

  if (!isInitialized || !currentUser) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-xs font-mono uppercase tracking-wider animate-pulse">
            Loading Workspace Session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200 relative overflow-x-hidden">
      {/* Blueprint SVG Vector Backdrop - Left Side */}
      <div className="absolute top-[80px] left-0 w-[300px] h-[600px] pointer-events-none select-none z-0 hidden xl:block opacity-30">
        <svg width="100%" height="100%" viewBox="0 0 300 600" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="rgba(13, 148, 136, 0.10)" strokeWidth="1">
          {/* Isometric Structure */}
          <path d="M50,150 L150,100 L250,150 L150,200 Z" />
          <path d="M50,150 L50,300 L150,350 L150,200 Z" />
          <path d="M250,150 L250,300 L150,350 Z" />

          {/* Subdivisions / Grid projection */}
          <path d="M50,200 L150,250 L250,200" />
          <path d="M50,250 L150,300 L250,250" />
          <path d="M100,125 L100,275" />
          <path d="M200,125 L200,275" />

          {/* Diagonal cross trusses */}
          <path d="M50,150 L150,200" strokeDasharray="2,2" />
          <path d="M150,100 L250,150" strokeDasharray="2,2" />

          {/* Dimension annotations */}
          <line x1="30" y1="150" x2="30" y2="300" stroke="rgba(13, 148, 136, 0.18)" />
          <line x1="25" y1="150" x2="35" y2="150" stroke="rgba(13, 148, 136, 0.18)" />
          <line x1="25" y1="300" x2="35" y2="300" stroke="rgba(13, 148, 136, 0.18)" />
          <text x="18" y="230" fill="rgba(13, 148, 136, 0.3)" fontSize="8" fontFamily="monospace" transform="rotate(-90 18 230)">H: 15.00m</text>

          <line x1="50" y1="320" x2="150" y2="370" stroke="rgba(13, 148, 136, 0.18)" />
          <text x="90" y="350" fill="rgba(13, 148, 136, 0.3)" fontSize="8" fontFamily="monospace" transform="rotate(26 90 350)">W: 10.00m</text>

          {/* Compass/Circle Grid */}
          <circle cx="150" cy="480" r="50" strokeDasharray="4,4" />
          <circle cx="150" cy="480" r="25" />
          <line x1="150" y1="410" x2="150" y2="550" strokeDasharray="2,2" />
          <line x1="80" y1="480" x2="220" y2="480" strokeDasharray="2,2" />
          <path d="M150,480 L185,445" strokeWidth="1.5" />
          <text x="190" y="440" fill="rgba(13, 148, 136, 0.3)" fontSize="8" fontFamily="monospace">45° N</text>

          {/* Project Data Stamp */}
          <rect x="30" y="550" width="160" height="35" stroke="rgba(13, 148, 136, 0.12)" />
          <text x="35" y="561" fill="rgba(13, 148, 136, 0.3)" fontSize="7" fontFamily="monospace">DWG NO: SEC-A-09</text>
          <text x="35" y="571" fill="rgba(13, 148, 136, 0.3)" fontSize="7" fontFamily="monospace">SCALE: 1:100</text>
          <text x="35" y="581" fill="rgba(13, 148, 136, 0.3)" fontSize="7" fontFamily="monospace">SaaS ERP REDESIGN</text>
        </svg>
      </div>

      {/* Blueprint SVG Vector Backdrop - Right Side */}
      <div className="absolute top-[120px] right-0 w-[300px] h-[600px] pointer-events-none select-none z-0 hidden xl:block opacity-30">
        <svg width="100%" height="100%" viewBox="0 0 300 600" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="rgba(13, 148, 136, 0.10)" strokeWidth="1">
          {/* Structural Truss Profile */}
          <path d="M20,100 L260,100 L140,20 L20,100" />
          <line x1="20" y1="100" x2="140" y2="100" />
          <line x1="140" y1="100" x2="260" y2="100" />

          {/* Truss struts */}
          <line x1="20" y1="100" x2="80" y2="60" />
          <line x1="80" y1="100" x2="80" y2="60" />
          <line x1="80" y1="60" x2="140" y2="100" />
          <line x1="140" y1="20" x2="140" y2="100" />
          <line x1="140" y1="100" x2="200" y2="60" />
          <line x1="200" y1="100" x2="200" y2="60" />
          <line x1="200" y1="60" x2="260" y2="100" />

          {/* Elevation contours */}
          <path d="M10,240 C60,230 110,260 160,250 C210,240 240,210 290,220" strokeDasharray="3,3" />
          <path d="M10,270 C70,260 120,290 170,280 C220,270 250,240 290,250" strokeDasharray="3,3" />
          <path d="M10,300 C80,290 130,320 180,310 C230,300 260,270 290,280" strokeDasharray="3,3" />

          {/* Stairs / Steps drafting */}
          <path d="M50,450 L75,450 L75,430 L100,430 L100,410 L125,410 L125,390 L150,390 L150,370 L175,370 L175,350 L200,350" />
          <path d="M50,470 L95,470 L95,450 L120,450 L120,430 L145,430 L145,410 L170,410 L170,390 L195,390 L195,370 L200,370" strokeDasharray="2,2" />

          {/* Circular technical markings */}
          <circle cx="75" cy="430" r="4" stroke="rgba(13, 148, 136, 0.22)" />
          <circle cx="125" cy="390" r="4" stroke="rgba(13, 148, 136, 0.22)" />
          <circle cx="175" cy="350" r="4" stroke="rgba(13, 148, 136, 0.22)" />

          {/* Coordinate lines */}
          <line x1="10" y1="520" x2="290" y2="520" strokeDasharray="4,4" />
          <text x="220" y="512" fill="rgba(13, 148, 136, 0.3)" fontSize="8" fontFamily="monospace">GRID LINE A-12</text>
        </svg>
      </div>

      <Navbar />

      <main className="flex-1 overflow-y-auto py-4 sm:py-6 md:py-8 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}