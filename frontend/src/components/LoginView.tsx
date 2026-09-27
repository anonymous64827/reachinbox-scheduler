import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, ShieldCheck, Zap, Server, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';
import { toast } from 'sonner';

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      toast.error('Google sign-in did not return credentials.');
      return;
    }

    try {
      const data = await api.googleLogin(credentialResponse.credential);
      if (data.success) {
        localStorage.setItem('reachinbox_token', data.token);
        toast.success(`Welcome back, ${data.user.name || data.user.email}!`);
        onLoginSuccess(data.user, data.token);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Google sign-in failed');
    }
  };

  const handleDemoLogin = async () => {
    try {
      const data = await api.demoLogin();
      if (data.success) {
        localStorage.setItem('reachinbox_token', data.token);
        toast.success(`Signed in as ${data.user.name}`);
        onLoginSuccess(data.user, data.token);
      }
    } catch (err: any) {
      toast.error('Demo sign-in failed: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Gradient Blurs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-xl shadow-indigo-600/30">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            ReachInbox
          </h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mt-1">
            Email Job Scheduler & Automation Engine
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Built with BullMQ, Redis, PostgreSQL/SQLite, Ethereal SMTP & Slack Webhooks
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-2.5 mb-8 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-xs text-slate-300">
          <div className="flex items-center space-x-2.5">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>BullMQ delayed scheduling & provider throttling</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <Server className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Survives server restarts with zero job loss</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Hourly rate limiting with live Slack notifications</span>
          </div>
        </div>

        {/* Real Google OAuth Login */}
        <div className="space-y-4">
          <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google Sign-In failed')}
              useOneTap={false}
              theme="filled_black"
              shape="pill"
              text="continue_with"
            />
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
              Or Fast Evaluator Review
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* 1-Click Demo Login */}
          <button
            onClick={handleDemoLogin}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer group"
          >
            <span>Sign In as Evaluator (Mitrajit / Yadav036)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-center text-slate-500 mt-6">
          ReachInbox Software Development Intern Assignment
        </p>
      </div>
    </div>
  );
};
