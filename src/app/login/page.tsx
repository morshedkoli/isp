'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { loginSchema, LoginInput } from '@/types/schemas';
import { Wifi, Eye, EyeOff, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid admin credentials');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-emerald-950 via-teal-950 to-stone-950 flex items-center justify-center p-4">
      {/* Ambient Radial Lights */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-emerald-950 shadow-2xl shadow-emerald-500/30 ring-4 ring-emerald-500/20">
            <img src="/logo.png" alt="GrameenWifi Logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">GrameenWifi</h1>
          <p className="mt-1 text-sm font-medium text-emerald-300/80">Kalikaccha, Sarail, Brahmanbaria</p>
          <p className="mt-1 text-xs text-emerald-200/50">Sign in to access network management panel</p>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl shadow-[0_24px_64px_-16px_rgba(0,0,0,0.5)] ring-1 ring-white/20">
          <div className="p-8">
            {error && (
              <div className="mb-6 flex items-center gap-2 rounded-xl bg-rose-50/90 border border-rose-200 px-4 py-3 text-sm text-rose-700 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-rose-500" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    className="w-full rounded-xl border border-emerald-900/10 bg-emerald-50/20 py-2.5 pl-11 pr-4 text-stone-900 placeholder-stone-400 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/15"
                    placeholder="admin@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-rose-500 font-medium">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-emerald-900/10 bg-emerald-50/20 py-2.5 pl-11 pr-11 text-stone-900 placeholder-stone-400 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/15"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-emerald-700 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-rose-500 font-medium">{errors.password.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all hover:from-emerald-700 hover:to-teal-700 hover:shadow-emerald-600/40 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </span>
              </button>
            </form>

            {/* Help Text */}
            <div className="mt-6 border-t border-stone-100 pt-6 text-center">
              <p className="text-xs text-stone-500">
                Default credentials: <span className="font-semibold text-emerald-800">admin@isp.com</span> /{' '}
                <span className="font-semibold text-emerald-800">admin123</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-emerald-200/50">
          GrameenWifi · Kalikaccha, Sarail, Brahmanbaria © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

