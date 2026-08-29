'use client';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/auth/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-[#022c16] text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="font-black text-xl">JÀMM AK XÉEWAL</h1>
          <p className="text-xs text-gray-400">Admin Dashboard</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <Link href="/dashboard" className="block px-4 py-3 text-sm hover:bg-gray-800 rounded-lg transition-colors">
            <i className="fa-solid fa-gauge mr-2"></i> Tableau de bord
          </Link>
          <Link href="/dashboard/besoins" className="block px-4 py-3 text-sm hover:bg-gray-800 rounded-lg transition-colors">
            <i className="fa-solid fa-bullhorn mr-2"></i> Besoins & Signalements
          </Link>
          <Link href="/dashboard/adherents" className="block px-4 py-3 text-sm hover:bg-gray-800 rounded-lg transition-colors">
            <i className="fa-solid fa-users mr-2"></i> Adhérents
          </Link>
          <Link href="/dashboard/options" className="block px-4 py-3 text-sm hover:bg-gray-800 rounded-lg transition-colors">
            <i className="fa-solid fa-sliders mr-2"></i> Options (Quartiers)
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button onClick={handleLogout} className="w-full px-4 py-3 text-sm text-left hover:bg-gray-800 rounded-lg transition-colors">
            <i className="fa-solid fa-right-from-bracket mr-2"></i> Déconnexion
          </button>
          <p className="text-xs text-gray-400 mt-2 text-center">{user.name} ({user.email})</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
