"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ActivateAdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Unlock admin access in localStorage
    localStorage.setItem('sc_admin_unlocked', 'true');
    
    // Redirect to home and trigger login modal via a temporary flag or just let context handle it
    // The AdminContext checks sc_admin_unlocked on load.
    // We can also set a session flag to show the modal once
    sessionStorage.setItem('sc_show_admin_login', 'true');
    
    router.push('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <h1 className="text-xl font-bold text-slate-900">Activating Admin Panel...</h1>
        <p className="text-slate-500">Redirecting to login...</p>
      </div>
    </div>
  );
}
