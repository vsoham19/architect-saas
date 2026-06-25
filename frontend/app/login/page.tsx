'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { Shield, ShieldAlert, Award, Hammer, Wrench, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import CustomSelect from '../../components/CustomSelect';

export default function LoginPage() {
  const router = useRouter();
  const { allUsers, login, loginByEmail, isInitialized, initialize, isSandboxMode, setSandboxMode } = useAuthStore();
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
      color: 'border-amber-200/60 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:border-amber-400/40',
    },
    {
      role: 'senior',
      title: 'Senior Lead',
      description: 'Supervises, reviews blueprints & proposes revisions.',
      icon: Shield,
      color: 'border-teal-200/60 text-teal-700 bg-teal-50 hover:bg-teal-100 hover:border-teal-400/40',
    },
    {
      role: 'junior',
      title: 'Junior',
      description: 'Drafts deliverables, updates tasks & tracks markups.',
      icon: Hammer,
      color: 'border-emerald-200/60 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400/40',
    },
    {
      role: 'admin',
      title: 'System Admin',
      description: 'Superuser dashboard, append-only logs & audits.',
      icon: Wrench,
      color: 'border-border/60 text-muted-foreground bg-secondary/60 hover:bg-secondary/80',
    }
  ];

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden select-none bg-background">
      {/* Ambient gradient glows */}
      <div className="absolute -top-40 -left-40 w-[32rem] h-[32rem] bg-teal-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[32rem] h-[32rem] bg-emerald-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-emerald-400/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Fine grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(13, 148, 136, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(13, 148, 136, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Noise-ish vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.02)_100%)]" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-xl z-10 flex flex-col items-center gap-7"
      >

        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-teal-200 bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wider mb-5 backdrop-blur-sm">
            <ShieldAlert size={12} className="animate-pulse motion-reduce:animate-none" />
            <span>Interactive Sandbox Environment</span>
          </div>

          <div className="flex items-center justify-center gap-2.5 mb-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-teal-700 shadow-lg shadow-teal-500/20 border border-teal-400/20">
              <span className="text-lg font-black text-white font-sans">A</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-sans uppercase">
              ARCHITECT <span className="font-light text-primary">SaaS</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-xs mt-1 max-w-sm mx-auto font-medium leading-relaxed">
            Collaborative blueprints checking, task workflows, and revision tags for architectural studios.
          </p>
        </div>

        {/* Login Card Container */}
        <div className="w-full bg-card rounded-3xl border border-border p-8 shadow-xl shadow-slate-200/50 relative">

          {/* Sandbox Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-secondary border border-border/80 rounded-2xl relative z-10 text-xs mb-5 shadow-xs">
            <div className="flex flex-col">
              <span className="font-bold text-foreground">Use Virtual Sandbox Mode</span>
              <span className="text-[10px] text-muted-foreground">Runs locally in browser (offline-ready)</span>
            </div>
            <button
              type="button"
              onClick={() => setSandboxMode(!isSandboxMode)}
              aria-label="Toggle sandbox mode"
              aria-pressed={isSandboxMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${isSandboxMode ? 'bg-gradient-to-r from-teal-500 to-emerald-500' : 'bg-slate-200'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${isSandboxMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-5 relative z-10">
            <div>
              <label htmlFor="login-email" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono mb-2">
                ENTER WORKSPACE EMAIL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                  <Mail size={16} />
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. sarah.jenkins@spatialdesign.com"
                  className="w-full bg-secondary border border-border rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold text-foreground placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none focus:bg-card transition-all"
                />
              </div>
              <p className="text-[10px] text-muted-foreground/80 mt-2 font-medium">
                * Input any email address. New emails will automatically create a new account with the selected role.
              </p>
            </div>

            <div>
              <label htmlFor="login-role" className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono mb-2">
                CHOOSE ROLE (FOR NEW ACCOUNTS)
              </label>
              <CustomSelect
                value={selectedRole}
                onChange={(value) => setSelectedRole(value as any)}
                options={[
                  { value: 'junior', label: 'Junior Architect' },
                  { value: 'senior', label: 'Senior Lead Architect' },
                  { value: 'principal', label: 'Principal Architect / Studio Lead' }
                ]}
                className="w-full"
              />
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider text-[11px] active:scale-[0.98]"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 size={14} className="animate-spin motion-reduce:animate-none text-white" />
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
          <div className="mt-8 pt-6 border-t border-border relative z-10">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-mono mb-4 text-center">
              SANDBOX PERSONAS (QUICK ACCESS)
            </h3>

            {!isInitialized && !isSandboxMode ? (
              <div className="flex flex-col items-center justify-center py-4 gap-2">
                <Loader2 size={20} className="animate-spin motion-reduce:animate-none text-teal-500" />
                <span className="text-[10px] font-semibold font-mono text-muted-foreground">INITIALIZING DATABASE...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {rolesInfo.map((roleInfo) => {
                  const Icon = roleInfo.icon;
                  const matchedUser = allUsers.find((u) => u.role === roleInfo.role);

                  if (!matchedUser) return null;

                  return (
                    <button
                      key={roleInfo.role}
                      type="button"
                      onClick={() => handleSandboxLogin(matchedUser.id)}
                      className={`flex flex-col items-start p-2.5 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-[0.97] hover:shadow-lg hover:shadow-slate-200/50 cursor-pointer backdrop-blur-sm ${roleInfo.color}`}
                    >
                      <div className="flex items-center justify-between w-full mb-0.5">
                        <span className="text-[10px] font-extrabold font-sans">
                          {roleInfo.title}
                        </span>
                        <Icon size={12} />
                      </div>
                      <p className="text-[9px] font-bold text-foreground mb-0.5 leading-tight">
                        {matchedUser.name}
                      </p>
                      <p className="text-[8px] text-muted-foreground line-clamp-1">
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
        <div className="text-center text-muted-foreground text-[10px] font-semibold mt-1">
          SaaS ERP Collab Sandbox • Powered by Supabase PostgreSQL
        </div>

      </motion.div>
    </div>
  );
}