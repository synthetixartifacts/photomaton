import React, { useEffect, useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { Aperture, Sparkles } from 'lucide-react';
import { PhotoShowcase } from './PhotoShowcase';

// Google Client ID from environment
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

/**
 * Google Login Button Component
 * Custom styled button that triggers Google OAuth flow
 */
const GoogleLoginButton: React.FC<{
  onSuccess: (credential: string) => Promise<void>;
  disabled: boolean;
}> = ({ onSuccess, disabled }) => {
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleLoginRef = React.useRef<HTMLDivElement>(null);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      setGoogleLoading(true);
      try {
        await onSuccess(credentialResponse.credential);
      } finally {
        setGoogleLoading(false);
      }
    }
  };

  const handleGoogleError = () => {
    console.error('Google login failed');
  };

  const triggerGoogleLogin = () => {
    // Find and click the hidden Google button
    const googleButton = googleLoginRef.current?.querySelector('div[role="button"]') as HTMLElement;
    if (googleButton) {
      googleButton.click();
    }
  };

  return (
    <>
      {/* Hidden Google Login component */}
      <div ref={googleLoginRef} className="hidden">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          useOneTap={false}
        />
      </div>

      {/* Custom styled button */}
      <button
        onClick={triggerGoogleLogin}
        disabled={disabled || googleLoading}
        className="w-full bg-white hover:bg-zinc-100 hover:scale-[1.02] active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed disabled:scale-100 text-zinc-900 font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 group shadow-lg shadow-white/10"
      >
        {googleLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            {/* Google logo */}
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </>
        )}
      </button>
    </>
  );
};

export const LoginPage: React.FC = () => {
  const {
    loginWithGoogle,
    error,
    loading,
    isAuthenticated,
    providers,
    clearError,
  } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = '/';
    }
  }, [isAuthenticated]);

  // Clear error when component mounts (fresh page load)
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const showGoogle = providers?.google && GOOGLE_CLIENT_ID;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col lg:flex-row overflow-x-hidden">
      {/* Left Column - Photo Showcase (Desktop only, hidden on mobile) */}
      <div className="relative hidden lg:flex w-1/2 h-screen items-center justify-center p-12">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px'
            }}
          />
          {/* Gradient orbs */}
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-zinc-800/40 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-red-900/10 rounded-full blur-3xl" />
        </div>

        {/* Photo showcase component */}
        <PhotoShowcase />
      </div>

      {/* Divider line - Desktop only */}
      <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-zinc-700 to-transparent" />

      {/* Right Column - Login (Desktop) / First Section (Mobile) */}
      <div className="relative w-full lg:w-1/2 min-h-screen lg:h-screen flex items-center justify-center p-6 lg:p-12">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-sm w-full">
          {/* Logo/Header with animated entrance */}
          <div className="text-center mb-8 animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-3xl mb-5 shadow-lg shadow-black/20 group hover:border-zinc-700 transition-all duration-300">
              <Aperture className="w-10 h-10 text-white group-hover:rotate-45 transition-transform duration-500" strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Photomaton</h1>
            <p className="text-base text-zinc-400 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-red-500" />
              AI Photo Booth
              <Sparkles className="w-4 h-4 text-red-500" />
            </p>
          </div>

          {/* Feature highlights */}
          <div className="flex justify-center gap-4 mb-8 animate-fade-in-up animation-delay-100">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Instant Transform
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Multiple Styles
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
              High Quality
            </div>
          </div>

          {/* Login Card with hover effect */}
          <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-8 shadow-xl shadow-black/20 hover:border-zinc-700 transition-all duration-300 animate-fade-in-up animation-delay-200">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 animate-shake">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Welcome text */}
            <p className="text-zinc-400 text-center mb-6 text-sm">
              Sign in to create amazing AI-powered photos
            </p>

            {/* Login Buttons */}
            <div className="space-y-3">
              {/* Google Login Button */}
              {showGoogle && (
                <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                  <GoogleLoginButton
                    onSuccess={loginWithGoogle}
                    disabled={loading}
                  />
                </GoogleOAuthProvider>
              )}
            </div>
          </div>

          {/* Footer - Attribution */}
          <div className="text-center mt-8 animate-fade-in-up animation-delay-300">
            <p className="text-zinc-600 text-xs">
              Created by{' '}
              <a
                href="https://g-prompter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-orange-400 transition-colors duration-200"
              >
                G-Prompter
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Photo Showcase Section - Below login */}
      <div className="relative lg:hidden w-full py-12 px-6">
        {/* Divider line */}
        <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent mb-12" />

        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-zinc-800/40 rounded-full blur-3xl animate-pulse-slow" />
        </div>

        {/* Photo showcase component */}
        <PhotoShowcase />
      </div>
    </div>
  );
};
