import React, { useState, useEffect } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ValidationStatus, PasswordStrength } from '../types';
import { Check, ChevronDown } from 'lucide-react';
import { authAPI } from '../services/apiService';

interface RegisterScreenProps {
  onNavigate: (path: string) => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    learningGoal: ''
  });
  
  const [agreed, setAgreed] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Validation States
  const [emailStatus, setEmailStatus] = useState(ValidationStatus.Idle);
  const [passwordStrength, setPasswordStrength] = useState(PasswordStrength.None);

  useEffect(() => {
    // Real-time Email Validation
    if (formData.email.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setEmailStatus(emailRegex.test(formData.email) ? ValidationStatus.Valid : ValidationStatus.Invalid);
    } else {
      setEmailStatus(ValidationStatus.Idle);
    }

    // Password Strength
    const pass = formData.password;
    if (pass.length === 0) setPasswordStrength(PasswordStrength.None);
    else if (pass.length < 6) setPasswordStrength(PasswordStrength.Weak);
    else if (pass.length < 10) setPasswordStrength(PasswordStrength.Medium);
    else setPasswordStrength(PasswordStrength.Strong);

  }, [formData.email, formData.password]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    if (formData.password !== formData.confirmPassword) return;

    setIsLoading(true);

    try {
      const nameParts = formData.fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Register via API
      await authAPI.register({
        username: formData.email.split('@')[0],
        email: formData.email,
        password: formData.password,
        password_confirm: formData.confirmPassword,
        role: 'student',
        first_name: firstName,
        last_name: lastName,
      });

      // Auto-login after registration
      await authAPI.login(formData.email.split('@')[0], formData.password);

      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        onNavigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setIsLoading(false);
      alert(err.message || 'Registration failed. Please try again.');
    }
  };

  // Success Overlay (Confetti Simulation)
  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
        {/* Simple CSS Confetti */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           {[...Array(20)].map((_, i) => (
               <div 
                key={i}
                className="absolute animate-fade-in"
                style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    width: '10px',
                    height: '10px',
                    backgroundColor: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'][Math.floor(Math.random() * 4)],
                    transform: `rotate(${Math.random() * 360}deg)`,
                    animation: `fadeIn 0.5s ease-out, slideUp 2s ease-out forwards`,
                    animationDelay: `${Math.random() * 0.5}s`
                }}
               />
           ))}
        </div>

        <div className="bg-success/10 p-6 rounded-full mb-6 animate-slide-up">
            <Check className="w-12 h-12 text-success" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2 animate-slide-up">Account Created!</h2>
        <div className="flex gap-2 items-center mt-4 animate-pulse">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <div className="w-2 h-2 bg-primary rounded-full animation-delay-200"></div>
            <div className="w-2 h-2 bg-primary rounded-full animation-delay-400"></div>
        </div>
        <p className="text-slate-500 mt-4 text-sm">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <AuthLayout
      imageSrc="https://picsum.photos/seed/student_study/1440/900"
      testimonialQuote="The structured learning paths helped me pivot my career into Data Science seamlessly."
      testimonialAuthor="Michael Ross, Data Analyst"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Create Account</h1>
        <p className="text-slate-500 text-sm">Join thousands of learners today.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          name="fullName"
          placeholder="John Doe"
          value={formData.fullName}
          onChange={handleChange}
          required
        />

        <Input
          name="email"
          type="email"
          placeholder="name@company.com"
          value={formData.email}
          onChange={handleChange}
          status={emailStatus}
          errorMessage="Invalid email address"
          required
        />

        <div>
          <Input
            name="password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          {/* Password Strength Indicator */}
          {formData.password && (
            <div className="flex gap-1 mt-2 h-1">
              <div className={`flex-1 rounded-full transition-colors duration-300 ${passwordStrength !== PasswordStrength.None ? (passwordStrength === PasswordStrength.Weak ? 'bg-error' : passwordStrength === PasswordStrength.Medium ? 'bg-warning' : 'bg-success') : 'bg-slate-100'}`}></div>
              <div className={`flex-1 rounded-full transition-colors duration-300 ${[PasswordStrength.Medium, PasswordStrength.Strong].includes(passwordStrength) ? (passwordStrength === PasswordStrength.Medium ? 'bg-warning' : 'bg-success') : 'bg-slate-100'}`}></div>
              <div className={`flex-1 rounded-full transition-colors duration-300 ${passwordStrength === PasswordStrength.Strong ? 'bg-success' : 'bg-slate-100'}`}></div>
            </div>
          )}
          {formData.password && (
              <p className="text-[10px] text-slate-400 mt-1 text-right uppercase tracking-wider font-semibold">
                  {passwordStrength}
              </p>
          )}
        </div>

        <Input
          name="confirmPassword"
          type="password"
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleChange}
          status={formData.confirmPassword.length > 0 && formData.confirmPassword !== formData.password ? ValidationStatus.Invalid : ValidationStatus.Idle}
          errorMessage="Passwords do not match"
          required
        />

        <div className="relative">
          <select
            name="learningGoal"
            value={formData.learningGoal}
            onChange={handleChange}
            className="w-full h-12 bg-transparent border-b border-gray-200 text-slate-900 focus:outline-none focus:border-primary appearance-none py-3 pr-8 cursor-pointer"
            required
          >
            <option value="" disabled>Select your learning goal</option>
            <option value="career">Career Advancement</option>
            <option value="skills">Skills Development</option>
            <option value="academic">Academic Preparation</option>
            <option value="hobby">Personal Interest</option>
          </select>
          <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
        </div>

        <div className="flex items-start gap-3 mt-2">
            <input 
                type="checkbox" 
                id="terms" 
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="terms" className="text-sm text-slate-600">
                I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>
            </label>
        </div>

        <Button type="submit" isLoading={isLoading} disabled={!agreed}>
          Create Account
        </Button>
      </form>

      <p className="text-center mt-6 text-sm text-slate-600">
        Already have an account?{' '}
        <button 
          onClick={() => onNavigate('/login')}
          className="text-primary font-semibold hover:underline"
        >
          Sign in
        </button>
      </p>
    </AuthLayout>
  );
};
