import React, { useEffect, useRef, useState } from 'react';
import { ConsoleLog } from '../../types';
import { Terminal, AlertTriangle, Info, XCircle, Trash2, ChevronUp, ChevronDown, Maximize2, Minimize2, Play } from 'lucide-react';

interface PreviewPaneProps {
  mode?: 'web' | 'terminal';
  html?: string;
  css?: string;
  js?: string;
  terminalOutput?: string; // For non-web languages
  runTrigger: number;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({ 
    mode = 'web',
    html = '', 
    css = '', 
    js = '', 
    terminalOutput = '',
    runTrigger 
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(mode === 'terminal'); // Default open for terminal
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Web Mode: Build Iframe
  useEffect(() => {
    if (mode !== 'web') return;

    const srcDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { background-color: #ffffff; }
            ${css}
          </style>
          <script>
            // Override console
            const originalLog = console.log;
            const originalError = console.error;
            const originalWarn = console.warn;
            const originalInfo = console.info;

            function sendToParent(type, args) {
              const message = args.map(arg => {
                if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
                return String(arg);
              }).join(' ');
              window.parent.postMessage({ type: 'console', logType: type, message }, '*');
            }

            console.log = (...args) => { originalLog(...args); sendToParent('log', args); };
            console.error = (...args) => { originalError(...args); sendToParent('error', args); };
            console.warn = (...args) => { originalWarn(...args); sendToParent('warn', args); };
            console.info = (...args) => { originalInfo(...args); sendToParent('info', args); };
            
            window.onerror = function(msg, url, lineNo, columnNo, error) {
               sendToParent('error', [\`Error: \${msg} (Line \${lineNo})\`]);
               return false;
            };
          </script>
        </head>
        <body>
          ${html}
          <script>
            try {
              ${js}
            } catch (e) {
              console.error(e.message);
            }
          </script>
        </body>
      </html>
    `;

    if (iframeRef.current) {
      iframeRef.current.srcdoc = srcDoc;
    }
  }, [runTrigger, mode, html, css, js]);

  // Web Mode: Listen for logs
  useEffect(() => {
    if (mode !== 'web') return;
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'console') {
        setLogs(prev => [...prev, {
          type: e.data.logType,
          message: e.data.message,
          timestamp: new Date()
        }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mode]);

  return (
    <div className={`
        flex flex-col bg-white relative transition-all duration-300
        ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full w-full'}
    `}>
        {/* Header Bar */}
        <div className="h-9 bg-[#1E1E1E] border-b border-[#3E3E42] flex items-center justify-between px-3 text-[#CCCCCC] select-none">
            <div className="flex items-center gap-2">
                {mode === 'web' ? <Play className="w-3 h-3 text-green-500 fill-green-500" /> : <Terminal className="w-3 h-3" />}
                <span className="text-[11px] font-bold uppercase tracking-wider">{mode === 'web' ? 'Live Preview' : 'Terminal Output'}</span>
            </div>
            <div className="flex items-center gap-2">
                 <button 
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-1 hover:bg-[#3E3E42] rounded text-[#858585] hover:text-white transition-colors"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                 >
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                 </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-[#1E1E1E] relative overflow-hidden">
             {mode === 'web' ? (
                 <div className="absolute inset-0 bg-white">
                     <iframe
                        ref={iframeRef}
                        title="Preview"
                        className="w-full h-full border-none"
                        sandbox="allow-scripts allow-modals"
                     />
                 </div>
             ) : (
                 <div className="absolute inset-0 bg-[#0F0F0F] p-4 font-mono text-sm text-[#CCCCCC] overflow-y-auto custom-scrollbar">
                     <div className="mb-2 text-[#4F46E5] font-bold">$ run build</div>
                     {terminalOutput ? (
                         <pre className="whitespace-pre-wrap">{terminalOutput}</pre>
                     ) : (
                         <div className="text-[#666666] italic">Ready to compile...</div>
                     )}
                     <div className="mt-2 animate-pulse inline-block w-2 h-4 bg-[#CCCCCC]"></div>
                 </div>
             )}
        </div>

        {/* Web Console Panel (Collapsible) - Only for Web Mode */}
        {mode === 'web' && (
            <div className={`
                absolute bottom-0 left-0 right-0 bg-[#1E1E1E] border-t border-[#3E3E42] transition-all duration-300 flex flex-col shadow-2xl
                ${isConsoleOpen ? 'h-48' : 'h-8'}
            `}>
                <div 
                    className="h-8 flex items-center justify-between px-4 cursor-pointer bg-[#252526] hover:bg-[#2D2D2D]"
                    onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                >
                    <div className="flex items-center gap-2 text-[#D4D4D4] text-xs font-mono">
                        <Terminal className="w-3 h-3" />
                        <span>Console</span>
                        {logs.length > 0 && <span className="bg-[#4F46E5] text-white px-1.5 rounded-full text-[10px]">{logs.length}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setLogs([]); }}
                            className="p-1 hover:text-white text-[#858585]"
                            title="Clear Console"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                        {isConsoleOpen ? <ChevronDown className="w-3 h-3 text-[#858585]" /> : <ChevronUp className="w-3 h-3 text-[#858585]" />}
                    </div>
                </div>

                {isConsoleOpen && (
                    <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1 custom-scrollbar">
                        {logs.length === 0 ? (
                            <div className="text-[#666] italic px-2">Console is empty...</div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className={`flex items-start gap-2 px-2 py-0.5 border-b border-[#333] last:border-0 ${
                                    log.type === 'error' ? 'bg-[#EF4444]/10 text-[#EF4444]' :
                                    log.type === 'warn' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                                    log.type === 'info' ? 'text-[#4F46E5]' :
                                    'text-[#D4D4D4]'
                                }`}>
                                    <span className="mt-0.5 shrink-0">
                                        {log.type === 'error' ? <XCircle className="w-3 h-3" /> :
                                        log.type === 'warn' ? <AlertTriangle className="w-3 h-3" /> :
                                        log.type === 'info' ? <Info className="w-3 h-3" /> :
                                        <span className="w-3 h-3 block text-[#666]">{'>'}</span>}
                                    </span>
                                    <span className="whitespace-pre-wrap break-all">{log.message}</span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        )}
    </div>
  );
};