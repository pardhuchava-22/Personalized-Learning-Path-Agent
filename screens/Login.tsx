
import React, { useState } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ValidationStatus } from '../types';
import { Mail, Lock, ArrowRight, AlertCircle, User } from 'lucide-react';
import { useAuth } from '../services/authContext';
import { dashboardPathForRole } from '../services/roles';

interface LoginScreenProps {
  onNavigate: (path: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const user = await login(username, password);
      
      onNavigate(dashboardPathForRole(user.role));
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      imageSrc="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=2073&auto=format&fit=crop"
      testimonialQuote="QuantumGuard transformed how I learn. The AI-driven insights helped me master complex topics in half the time."
      testimonialAuthor="Sarah Chen, Computer Science Student"
    >
      <div className="mb-8 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mb-3">
          Welcome back
        </h1>
        <p className="text-slate-500 text-sm md:text-base leading-relaxed">
          Enter your credentials to access your personalized learning workspace.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">{error}</p>
            <p className="text-xs text-red-600 mt-1">Check your username and password, then try again.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Input
            label="Username"
            type="text"
            placeholder="e.g. admin or student"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(''); }}
            required
            leftIcon={<User className="w-5 h-5" />}
          />
          
          <div>
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              required
              leftIcon={<Lock className="w-5 h-5" />}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 transition-all cursor-pointer"
            />
            <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">Remember me</span>
          </label>
          <button 
            type="button"
            className="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <Button type="submit" isLoading={isLoading} className="shadow-lg shadow-primary/20 hover:shadow-primary/30">
          Sign In <ArrowRight className="w-4 h-4 ml-2 opacity-80" />
        </Button>
      </form>

      {/* Quick Login Hints */}
      <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Quick Login</p>
        <div className="grid grid-cols-2 gap-2">
          <button 
            type="button"
            onClick={() => { setUsername('pardhu'); setPassword('password123'); setError(''); }}
            className="text-xs text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
          >
            <span className="font-bold text-indigo-600">Faculty</span>
            <br />
            <span className="text-slate-400">pardhu / password123</span>
          </button>
          <button 
            type="button"
            onClick={() => { setUsername('pavan'); setPassword('password123'); setError(''); }}
            className="text-xs text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all"
          >
            <span className="font-bold text-emerald-600">Student</span>
            <br />
            <span className="text-slate-400">pavan / password123</span>
          </button>
        </div>
      </div>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider font-semibold">
          <span className="px-4 bg-[#FAFAFA] text-slate-400">Or continue with</span>
        </div>
      </div>

      <Button variant="google" onClick={() => console.log('Google Auth')} className="hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all">
        <img 
          src="https://www.svgrepo.com/show/475656/google-color.svg" 
          alt="Google" 
          className="w-5 h-5"
        />
        Sign in with Google
      </Button>

      <p className="text-center mt-8 text-sm text-slate-600">
        Don't have an account?{' '}
        <button 
          onClick={() => onNavigate('/register')}
          className="text-primary font-semibold hover:text-primary-dark hover:underline transition-all"
        >
          Create account
        </button>
      </p>
    </AuthLayout>
  );
};
