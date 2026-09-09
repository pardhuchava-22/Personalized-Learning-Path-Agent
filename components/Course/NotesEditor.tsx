import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, List, Code, 
  Download, Check, Loader2, 
  Heading1, Heading2, Clock
} from 'lucide-react';

const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

interface NotesEditorProps {
  courseTitle?: string;
  moduleTitle?: string;
  timestamps?: { time: string; label: string }[];
  summary?: string;
}

export const NotesEditor: React.FC<NotesEditorProps> = ({ courseTitle, moduleTitle, timestamps = [], summary }) => {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [wordCount, setWordCount] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef('');

  useEffect(() => {
    const signature = [courseTitle, moduleTitle, summary, timestamps.map((item) => `${item.time}:${item.label}`).join('|')].join('::');
    if (editorRef.current && initializedRef.current !== signature) {
      const rawTitle = moduleTitle || courseTitle || 'Study Notes';
      const rawIntro = summary || `Capture the key ideas, code patterns, and questions from ${rawTitle}.`;
      
      const title = escapeHtml(rawTitle);
      const intro = escapeHtml(rawIntro);
      const notePins = timestamps.length
        ? timestamps.slice(0, 5).map((item) => `<li>${escapeHtml(item.time)} - ${escapeHtml(item.label)}</li>`).join('')
        : '<li>Use the timestamps below to anchor your notes.</li>';

      editorRef.current.innerHTML = `
        <h1 class="mt-0 text-2xl font-bold text-slate-900">${title}</h1>
        <p class="text-slate-700 leading-relaxed">${intro}</p>
        <h2 class="font-semibold text-slate-900 mt-6 mb-3">Timestamp Pins</h2>
        <ul class="list-disc pl-5 space-y-1 text-slate-700">${notePins}</ul>
        <h2 class="font-semibold text-slate-900 mt-6 mb-3">Key Takeaways</h2>
        <ul class="list-disc pl-5 space-y-1 text-slate-700">
          <li>Summarize the current module in your own words.</li>
          <li>Record any commands, snippets, or concepts you want to review later.</li>
          <li>Mark the moments that need a second watch.</li>
        </ul>
      `;
      initializedRef.current = signature;
      handleInput();
    }
  }, [courseTitle, moduleTitle, summary, timestamps]);

  const handleInput = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('saved');
    }, 1500);
  };

  const execFormat = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const insertCodeBlock = () => {
    const html = `
      <pre style="background: #0f172a; color: #e2e8f0; padding: 16px; border-radius: 8px; font-family: 'Fira Code', monospace; font-size: 13px; line-height: 1.5; margin: 12px 0; border: 1px solid #1e293b; white-space: pre-wrap; position: relative;"><div style="position: absolute; top: 0; left: 0; padding: 4px 8px; font-size: 10px; color: #64748b; font-weight: bold; user-select: none;">CODE</div><code>// Write your code here...</code></pre><p><br></p>
    `;
    document.execCommand('insertHTML', false, html);
    editorRef.current?.focus();
    handleInput();
  };

  const insertTimestamp = () => {
      const mockTime = "12:34"; 
      const html = `
        <span contenteditable="false" style="display: inline-flex; align-items: center; gap: 4px; background-color: #EEF2FF; color: #4F46E5; border: 1px solid #C7D2FE; border-radius: 4px; padding: 2px 6px; font-size: 11px; font-weight: 600; font-family: monospace; cursor: pointer; user-select: none; margin-right: 4px;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${mockTime}
        </span>&nbsp;
      `;
      document.execCommand('insertHTML', false, html);
      editorRef.current?.focus();
      handleInput();
  };

  const handleDownload = () => {
    const content = editorRef.current?.innerText || '';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QuantumGuard-Notes-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-white relative font-sans text-slate-900">
      {/* Professional Toolbar */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 shadow-inner overflow-x-auto no-scrollbar">
          <ToolbarButton icon={<Bold className="w-4 h-4" />} onClick={() => execFormat('bold')} tooltip="Bold (Ctrl+B)" />
          <ToolbarButton icon={<Italic className="w-4 h-4" />} onClick={() => execFormat('italic')} tooltip="Italic (Ctrl+I)" />
          <ToolbarButton icon={<Underline className="w-4 h-4" />} onClick={() => execFormat('underline')} tooltip="Underline (Ctrl+U)" />
          
          <div className="w-px h-5 bg-slate-300 mx-1.5 self-center shrink-0"></div>
          
          <ToolbarButton icon={<Heading1 className="w-4 h-4" />} onClick={() => execFormat('formatBlock', 'H1')} tooltip="Heading 1" />
          <ToolbarButton icon={<Heading2 className="w-4 h-4" />} onClick={() => execFormat('formatBlock', 'H2')} tooltip="Heading 2" />
          
          <div className="w-px h-5 bg-slate-300 mx-1.5 self-center shrink-0"></div>
          
          <ToolbarButton icon={<List className="w-4 h-4" />} onClick={() => execFormat('insertUnorderedList')} tooltip="Bullet List" />
          <ToolbarButton icon={<Code className="w-4 h-4" />} onClick={insertCodeBlock} tooltip="Insert Code Block" />
          <ToolbarButton icon={<Clock className="w-4 h-4" />} onClick={insertTimestamp} tooltip="Insert Video Timestamp" />
        </div>
        
        <div className="flex items-center pl-2 border-l border-slate-100 ml-2">
            <button 
                onClick={handleDownload} 
                className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-all duration-200" 
                title="Download Notes"
            >
                <Download className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto cursor-text bg-white custom-scrollbar" onClick={() => editorRef.current?.focus()}>
        <div 
            ref={editorRef}
            contentEditable
          suppressContentEditableWarning
            onInput={handleInput}
            className="prose prose-sm prose-slate max-w-none focus:outline-none p-8 min-h-full text-slate-800"
            spellCheck={false}
        >
            <h1 className="mt-0 text-2xl font-bold text-slate-900">React Core Concepts</h1>
            <p className="text-slate-700 leading-relaxed">
                React is a JavaScript library for building user interfaces. It allows you to create reusable UI components.
            </p>
            
            <h2 className="font-semibold text-slate-900 mt-6 mb-3">Key Takeaways</h2>
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li>Components are the building blocks of React apps</li>
                <li>Props pass data from parent to child</li>
                <li>State manages local data within a component</li>
            </ul>

            <h2 className="font-semibold text-slate-900 mt-6 mb-3">Example Code</h2>
            <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: '16px', borderRadius: '8px', fontFamily: "'Fira Code', monospace", fontSize: '13px', lineHeight: '1.5', margin: '12px 0', border: '1px solid #1e293b', whiteSpace: 'pre-wrap', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, padding: '4px 8px', fontSize: '10px', color: '#64748b', fontWeight: 'bold', userSelect: 'none' }}>CODE</div>
                <code>{`function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}`}</code>
            </pre>
            <p><br/></p>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="px-4 py-2.5 bg-white border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-400 select-none">
        <div className="flex items-center gap-3">
             {saveStatus === 'saving' ? (
                 <span className="flex items-center gap-1.5 text-indigo-500 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                 </span>
             ) : (
                 <span className="flex items-center gap-1.5 text-emerald-600 transition-colors duration-300">
                    <Check className="w-3 h-3" /> Saved to cloud
                 </span>
             )}
             <span className="w-px h-3 bg-slate-200"></span>
             <span className="hover:text-slate-600 transition-colors cursor-help">Markdown supported</span>
        </div>
        <div className="flex items-center gap-2">
            <span>{wordCount} words</span>
            <span className="w-px h-3 bg-slate-200"></span>
            <span>Last edit: Just now</span>
        </div>
      </div>
    </div>
  );
};

const ToolbarButton = ({ icon, onClick, tooltip }: { icon: React.ReactNode, onClick: () => void, tooltip: string }) => (
  <button 
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-slate-200 transition-all duration-200 shrink-0"
    title={tooltip}
  >
    {icon}
  </button>
);