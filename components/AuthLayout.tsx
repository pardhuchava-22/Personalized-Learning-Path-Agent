import React from 'react';
import { Sparkles } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  imageSrc: string;
  testimonialQuote: string;
  testimonialAuthor: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  imageSrc,
  testimonialQuote,
  testimonialAuthor
}) => {
  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-[#FAFAFA]">
      
      {/* Mobile: Image Area (Top) */}
      <div className="md:hidden w-full h-32 relative overflow-hidden bg-slate-900 shrink-0">
        <img 
          src={imageSrc} 
          alt="Learning" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FAFAFA] to-transparent"></div>
        <div className="absolute top-6 left-6 flex items-center gap-2">
            <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-lg border border-white/20">
                <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">QuantumGuard</span>
        </div>
      </div>

      {/* Left Panel: Form */}
      <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col p-6 md:p-12 lg:p-16 justify-center overflow-y-auto">
        <div className="max-w-[420px] mx-auto w-full">
          {/* Logo (Desktop Only) */}
          <div className="hidden md:flex items-center gap-2 mb-12">
            <div className="bg-primary/10 p-2 rounded-xl">
                <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">QuantumGuard</span>
          </div>

          {/* Content */}
          <div className="animate-slide-up">
            {children}
          </div>
        </div>
      </div>

      {/* Right Panel: Image & Testimonial (Desktop) */}
      <div className="hidden md:block w-[55%] lg:w-[60%] relative overflow-hidden bg-slate-900">
        {/* Background Image with Parallax Effect */}
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-[20s] ease-in-out hover:scale-110"
          style={{ backgroundImage: `url(${imageSrc})` }}
        ></div>
        
        {/* Sophisticated Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/40 via-slate-900/60 to-slate-900/40 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-90"></div>

        {/* Testimonial Content */}
        <div className="absolute bottom-0 left-0 w-full p-12 lg:p-16 z-10">
          <blockquote className="max-w-2xl">
            <p className="text-white text-xl lg:text-2xl font-medium leading-relaxed mb-6 font-sans tracking-tight">
              "{testimonialQuote}"
            </p>
            <footer className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white font-bold text-sm">
                {testimonialAuthor.charAt(0)}
              </div>
              <div>
                <cite className="text-white font-semibold not-italic block tracking-wide">
                  {testimonialAuthor}
                </cite>
                <span className="text-slate-300 text-sm">Student at QuantumGuard</span>
              </div>
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
};