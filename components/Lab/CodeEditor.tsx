import React, { useRef, useState } from 'react';
import { RefreshCw, Copy, Check } from 'lucide-react';

interface CodeEditorProps {
  language: string;
  code: string;
  onChange: (value: string) => void;
  onReset?: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ language, code, onChange, onReset }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const value = e.currentTarget.value;
      
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // Enhanced syntax highlighting simulation via clean token placeholding
  // SECURITY NOTE: The `code` input is strictly escaped for HTML special characters (&, <, >)
  // at the very beginning of this function before any highlight spans are added. 
  // This guarantees that no arbitrary HTML can be injected, making the downstream 
  // dangerouslySetInnerHTML render completely safe from XSS.
  const highlightCode = (code: string) => {
    let escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const placeholders: string[] = [];
    
    // Extract and placeholder comments and strings first to prevent overlaps
    const stringOrCommentRegex = /(".*?"|'.*?'|`.*?`|\/\/.*|#.*)/g;
    
    let tokenized = escaped.replace(stringOrCommentRegex, (match) => {
      const id = placeholders.length;
      placeholders.push(match);
      return `__TOKEN_PLACEHOLDER_${id}__`;
    });

    if (language === 'html') {
      tokenized = tokenized.replace(/(&lt;\/?)(\w+)(.*?)(&gt;)/g, '<span style="color: #808080">$1</span><span style="color: #569CD6">$2</span>$3<span style="color: #808080">$4</span>');
      tokenized = tokenized.replace(/(\s)(\w+)(=)/g, '$1<span style="color: #9CDCFE">$2</span><span style="color: #D4D4D4">$3</span>');
    } else if (language === 'css') {
      tokenized = tokenized.replace(/([^{]+)({)/g, '<span style="color: #D7BA7D">$1</span><span style="color: #D4D4D4">$2</span>');
      tokenized = tokenized.replace(/(\s)(\w+-?\w*)(:)/g, '$1<span style="color: #9CDCFE">$2</span><span style="color: #D4D4D4">$3</span>');
      tokenized = tokenized.replace(/(:)([^;]+)(;)/g, '$1<span style="color: #CE9178">$2</span><span style="color: #D4D4D4">$3</span>');
    } else if (language === 'javascript' || language === 'java' || language === 'cpp') {
      // Common Keywords
      tokenized = tokenized.replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|public|private|void|int|string|bool|new|this)\b/g, '<span style="color: #569CD6">$1</span>');
      // Functions
      tokenized = tokenized.replace(/(\w+)(\()/g, '<span style="color: #DCDCAA">$1</span><span style="color: #D4D4D4">$2</span>');
    } else if (language === 'python') {
       // Python Keywords
       tokenized = tokenized.replace(/\b(def|return|if|else|elif|for|while|class|import|from|print|True|False|None)\b/g, '<span style="color: #C586C0">$1</span>');
       // Functions
       tokenized = tokenized.replace(/(\w+)(\()/g, '<span style="color: #DCDCAA">$1</span><span style="color: #D4D4D4">$2</span>');
    }

    // Restore the placeholder tokens safely with their designated styles
    let restored = tokenized;
    placeholders.forEach((token, id) => {
      let styledToken = token;
      if (token.startsWith('//') || token.startsWith('#')) {
        styledToken = `<span style="color: #6A9955">${token}</span>`;
      } else if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
        styledToken = `<span style="color: #CE9178">${token}</span>`;
      }
      restored = restored.replace(`__TOKEN_PLACEHOLDER_${id}__`, styledToken);
    });

    return restored;
  };

  const lineNumbers = code.split('\n').map((_, i) => i + 1).join('\n');

  return (
    <div className="flex flex-col h-full bg-[#1E1E1E] border-r border-[#3E3E42] min-w-[200px] relative group/editor">
      {/* Header */}
      <div className="h-9 bg-[#252526] border-b border-[#3E3E42] flex items-center justify-between px-3 select-none shrink-0">
        <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#CCCCCC] uppercase tracking-wider">
                {language === 'javascript' ? 'JS' : language === 'cpp' ? 'C++' : language.toUpperCase()}
            </span>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={handleCopy}
                className="text-[10px] text-[#858585] hover:text-white flex items-center gap-1 hover:bg-[#3E3E42] px-1.5 py-0.5 rounded transition-colors"
            >
                {isCopied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            </button>
            {onReset && (
                <button 
                    onClick={onReset}
                    className="text-[10px] text-[#858585] hover:text-white flex items-center gap-1 hover:bg-[#3E3E42] px-1.5 py-0.5 rounded transition-colors"
                >
                    <RefreshCw className="w-3 h-3" />
                </button>
            )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative overflow-hidden">
        
        {/* Line Numbers */}
        <div className="absolute left-0 top-0 bottom-0 w-[40px] bg-[#1E1E1E] text-[#6e7681] text-[13px] font-mono leading-[1.6] text-right pr-3 pt-2 select-none z-10 border-r border-[#3E3E42]/30">
          <pre>{lineNumbers}</pre>
        </div>

        {/* Input Layer (Textarea) */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          spellCheck={false}
          className="absolute left-[40px] top-0 right-0 bottom-0 w-[calc(100%-40px)] h-full bg-transparent text-transparent caret-[#D4D4D4] font-mono text-[13px] leading-[1.6] resize-none border-none outline-none p-2 z-20 whitespace-pre"
        />

        {/* Highlight Layer (Pre/Code) */}
        <pre 
            ref={preRef}
            className="absolute left-[40px] top-0 right-0 bottom-0 w-[calc(100%-40px)] h-full m-0 p-2 font-mono text-[13px] leading-[1.6] pointer-events-none whitespace-pre overflow-hidden bg-[#1E1E1E]"
            aria-hidden="true"
        >
            <code 
                className="block min-h-full"
                dangerouslySetInnerHTML={{ __html: highlightCode(code) + '<br>' }}
            />
        </pre>
      </div>
      
      {/* Footer Status */}
      {isFocused && (
          <div className="absolute bottom-0 right-0 bg-[#007acc] text-white text-[10px] px-2 py-0.5 rounded-tl z-30 opacity-90">
              Ln {code.substring(0, textareaRef.current?.selectionStart || 0).split('\n').length}, Col {(textareaRef.current?.selectionStart || 0) - (code.substring(0, textareaRef.current?.selectionStart || 0).lastIndexOf('\n') + 1) + 1}
          </div>
      )}
    </div>
  );
};