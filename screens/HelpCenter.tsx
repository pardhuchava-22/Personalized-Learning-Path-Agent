
import React, { useState } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { User } from '../types';
import { 
  Search, HelpCircle, Book, MessageSquare, Mail, 
  ChevronDown, ChevronRight, FileText, ExternalLink,
  ArrowRight, User as UserIcon
} from 'lucide-react';

interface HelpCenterProps {
  onNavigate: (path: string) => void;
}

export const HelpCenterScreen: React.FC<HelpCenterProps> = ({ onNavigate }) => {
  const user: User = {
    id: '1',
    name: 'Arka Maulana',
    email: 'arka.m@university.edu',
    role: 'student'
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const faqs = [
    { id: '1', q: 'How do I reset my password?', a: 'Go to Settings > Security and click "Update" next to Password. You will need to enter your current password.' },
    { id: '2', q: 'What happens if I lose internet during an exam?', a: 'The system automatically saves your progress. Do not close the window. Once connection is restored, you can resume. If the issue persists, contact proctor support immediately via the chat widget.' },
    { id: '3', q: 'Can I retake an exam?', a: 'Retake policies vary by course. Check the specific exam details page or contact your instructor.' },
    { id: '4', q: 'How is the attention score calculated?', a: 'Our AI analyzes gaze direction, head movement, and active window time to generate an engagement metric. It does not record biometric data permanently.' },
  ];

  const categories = [
    { title: 'Getting Started', icon: Book, count: 5 },
    { title: 'Exams & Proctoring', icon: FileText, count: 12 },
    { title: 'Account & Billing', icon: UserIcon, count: 4 },
    { title: 'Technical Support', icon: HelpCircle, count: 8 },
  ];

  return (
    <DashboardLayout currentUser={user} onNavigate={onNavigate} currentPath="/help">
      <div className="max-w-5xl mx-auto pb-12 animate-slide-up">
        
        {/* Hero Search */}
        <div className="bg-indigo-600 rounded-3xl p-8 md:p-12 text-center text-white mb-12 shadow-xl shadow-indigo-900/20 relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">How can we help you?</h1>
                <p className="text-indigo-100 mb-8">Search our knowledge base or browse categories below.</p>
                
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search for answers (e.g. 'Proctoring setup')" 
                        className="w-full h-14 pl-12 pr-4 rounded-xl text-slate-900 shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-400/30 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            
            {/* Decorative Circles */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3"></div>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {categories.map((cat) => (
                <div key={cat.title} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group text-center">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <cat.icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mb-1">{cat.title}</h3>
                    <p className="text-xs text-slate-500">{cat.count} articles</p>
                </div>
            ))}
        </div>

        {/* FAQs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <h2 className="text-xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    {faqs.map((faq) => (
                        <div key={faq.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-shadow hover:shadow-sm">
                            <button 
                                onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                                className="w-full flex items-center justify-between p-5 text-left"
                            >
                                <span className="font-semibold text-slate-800 text-sm">{faq.q}</span>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === faq.id ? 'rotate-180' : ''}`} />
                            </button>
                            {openFaq === faq.id && (
                                <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-3">
                                    {faq.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <button className="mt-6 text-sm font-bold text-indigo-600 hover:underline flex items-center gap-1">
                    View all articles <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            {/* Contact Support Widget */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-24">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Still need help?</h3>
                    <p className="text-sm text-slate-500 mb-6">Our support team is available 24/7 to assist you.</p>
                    
                    <div className="space-y-3">
                        <button className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-200">
                            <MessageSquare className="w-4 h-4" /> Live Chat
                        </button>
                        <button className="w-full py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                            <Mail className="w-4 h-4" /> Email Support
                        </button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider">Resources</p>
                        <a href="#" className="flex items-center justify-between py-2 text-sm text-slate-600 hover:text-indigo-600">
                            Student Guide <ExternalLink className="w-3 h-3" />
                        </a>
                        <a href="#" className="flex items-center justify-between py-2 text-sm text-slate-600 hover:text-indigo-600">
                            System Requirements <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </DashboardLayout>
  );
};
