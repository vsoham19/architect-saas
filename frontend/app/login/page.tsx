'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { Shield, ShieldAlert, Award, Hammer, Wrench, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const { allUsers, login, loginByEmail, isInitialized, initialize } = useAuthStore();
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<'junior' | 'senior' | 'principal'>('junior');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Fetch users list from Supabase
    initialize();
  }, [initialize]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoggingIn(true);
    setErrorMessage('');

    try {
      const success = await loginByEmail(email, selectedRole);
      if (success) {
        router.push('/dashboard');
      } else {
        setErrorMessage('Authentication failed. Please check your Supabase connection pool.');
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('An unexpected error occurred. Try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSandboxLogin = (userId: string) => {
    login(userId);
    router.push('/dashboard');
  };

  // Group users by role for display
  const rolesInfo = [
    {
      role: 'principal',
      title: 'Principal',
      description: 'Creates projects, defines roster & has final sign-off.',
      icon: Award,
      color: 'border-amber-200 text-amber-600 bg-amber-50/50 hover:bg-amber-50',
    },
    {
      role: 'senior',
      title: 'Senior Lead',
      description: 'Supervises, reviews blueprints & proposes revisions.',
      icon: Shield,
      color: 'border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50',
    },
    {
      role: 'junior',
      title: 'Junior',
      description: 'Drafts deliverables, updates tasks & tracks markups.',
      icon: Hammer,
      color: 'border-emerald-200 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-50',
    },
    {
      role: 'admin',
      title: 'System Admin',
      description: 'Superuser dashboard, append-only logs & audits.',
      icon: Wrench,
      color: 'border-slate-200 text-slate-600 bg-slate-50/50 hover:bg-slate-50',
    }
  ];

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden select-none bg-[#f8fafc]">
      {/* Blueprint Grid Paper Background */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(29, 78, 216, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(29, 78, 216, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Decorative Technical Drawing Overlays */}
      <div className="absolute top-12 left-12 w-48 h-48 border border-slate-200/40 rounded-full border-dashed pointer-events-none hidden lg:block" />
      <div className="absolute bottom-12 right-12 w-64 h-64 border border-slate-200/40 rounded-full border-dashed pointer-events-none hidden lg:block" />

      <div className="w-full max-w-xl z-10 flex flex-col items-center gap-6">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider mb-4 shadow-xs">
            <ShieldAlert size={12} className="animate-pulse" />
            <span>Interactive Sandbox Environment</span>
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-md border border-blue-700">
              <span className="text-lg font-black text-white font-mono">S</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0f172a] font-mono uppercase">
              SAAS <span className="font-light text-slate-400">ERP</span>
            </h1>
          </div>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto font-medium leading-relaxed">
            Collaborative blueprints checking, task workflows, and revision tags for architectural studios.
          </p>
        </div>

        {/* Login Card Container with Double-Border technical drafting style */}
        <div className="w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-sm relative">
          <div className="absolute inset-2 border border-slate-100 rounded-2xl pointer-events-none opacity-40" />

          {/* Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-5 relative z-10">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-2">
                ENTER WORKSPACE EMAIL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. sarah.jenkins@spatialdesign.com"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:outline-none transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">
                * Input any email address. New emails will automatically create a new account with the selected role.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-2">
                CHOOSE ROLE (FOR NEW ACCOUNTS)
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:outline-none transition-all cursor-pointer"
              >
                <option value="junior">Junior Architect</option>
                <option value="senior">Senior Lead Architect</option>
                <option value="principal">Principal Architect / Studio Lead</option>
              </select>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider text-[11px]"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Entering Workspace...</span>
                </>
              ) : (
                <>
                  <span>Enter Workspace</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Sandbox Access Section */}
          <div className="mt-8 pt-6 border-t border-slate-100 relative z-10">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-4 text-center">
              SANDBOX PERSONAS (QUICK ACCESS)
            </h3>

            {!isInitialized ? (
              <div className="flex flex-col items-center justify-center py-4 gap-2">
                <Loader2 size={20} className="animate-spin text-blue-600" />
                <span className="text-[10px] font-semibold font-mono text-slate-400">INITIALIZING DATABASE...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {rolesInfo.map((roleInfo) => {
                  const Icon = roleInfo.icon;
                  const matchedUser = allUsers.find((u) => u.role === roleInfo.role);

                  if (!matchedUser) return null;

                  return (
                    <button
                      key={roleInfo.role}
                      type="button"
                      onClick={() => handleSandboxLogin(matchedUser.id)}
                      className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all hover:scale-[1.01] hover:shadow-xs cursor-pointer ${roleInfo.color}`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-extrabold font-sans">
                          {roleInfo.title}
                        </span>
                        <Icon size={14} />
                      </div>
                      <p className="text-[10px] font-bold text-slate-800 mb-1 leading-tight">
                        {matchedUser.name}
                      </p>
                      <p className="text-[9px] text-slate-400 line-clamp-1">
                        {matchedUser.email}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="text-center text-slate-400 text-[10px] font-semibold mt-4">
          SaaS ERP Collab Sandbox • Powered by Supabase PostgreSQL
        </div>

      </div>
    </div>
  );
}
