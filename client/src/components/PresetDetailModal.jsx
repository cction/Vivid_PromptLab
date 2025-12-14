import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { X, Copy, Check, Tag, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { translations } from '../lib/translations';

export function PresetDetailModal({ isOpen, onClose, preset, lang }) {
  const [copiedEn, setCopiedEn] = useState(false);
  const [copiedZh, setCopiedZh] = useState(false);
  const [prompts, setPrompts] = useState({ en: '', zh: '' });
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (isOpen && preset) {
      const initPrompts = async () => {
        let en = preset.promptEn || '';
        let zh = preset.promptZh || '';

        // Auto translate if missing
        if (en && !zh) {
          setIsTranslating(true);
          try {
            const res = await axios.post('http://localhost:3001/api/translate', {
              text: en,
              source: 'en',
              target: 'zh'
            });
            if (res.data.translatedText) zh = res.data.translatedText;
          } catch (e) {
            console.error(e);
          }
          setIsTranslating(false);
        } else if (!en && zh) {
          setIsTranslating(true);
          try {
            const res = await axios.post('http://localhost:3001/api/translate', {
              text: zh,
              source: 'zh',
              target: 'en'
            });
            if (res.data.translatedText) en = res.data.translatedText;
          } catch (e) {
            console.error(e);
          }
          setIsTranslating(false);
        }

        setPrompts({ en, zh });
      };
      initPrompts();
    }
  }, [isOpen, preset]);

  if (!isOpen || !preset) return null;

  const t = translations[lang].modal;
  const cardT = translations[lang].card;

  const imageUrl = preset.image 
    ? (preset.image.startsWith('http') ? preset.image : `http://localhost:3001${preset.image}`) 
    : null;

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'en') {
      setCopiedEn(true);
      setTimeout(() => setCopiedEn(false), 2000);
    } else {
      setCopiedZh(true);
      setTimeout(() => setCopiedZh(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="pod-panel w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative bg-[#0a0a0a] border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-2">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
              {preset.title}
            </h2>
            <div className="flex items-center gap-3 text-sm text-neutral-400">
               <span>{t.source}: @PromptLab</span>
               <span className="w-1 h-1 rounded-full bg-neutral-600" />
               <span>{t.model}: Nano Banana Pro</span>
            </div>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-3">
              {(preset.categories || []).map((cat, i) => (
                <span 
                  key={i} 
                  className="px-3 py-1 rounded-full text-xs font-medium bg-[#1A2333] text-blue-200 border border-blue-900/30 hover:bg-[#232D3F] transition-colors"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
          
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors p-1">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-2 pod-scrollbar-y flex flex-col gap-6">
          
          {/* Main Image */}
          <div className="w-full rounded-xl overflow-hidden bg-neutral-900 border border-white/5 shrink-0">
            {imageUrl ? (
               <img src={imageUrl} alt={preset.title} className="w-full h-auto block" />
            ) : (
              <div className="aspect-video flex items-center justify-center text-neutral-600">
                <Tag size={48} />
              </div>
            )}
          </div>

          {/* Prompt Section EN */}
          {prompts.en && (
            <div className="bg-[#111] rounded-xl border border-white/10 overflow-hidden flex flex-col shrink-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-300">{t.inputPromptEn || 'English Prompt'}</span>
                  {isTranslating && !prompts.zh && <Loader2 size={14} className="animate-spin text-neutral-500" />}
                </div>
                <button
                  onClick={() => handleCopy(prompts.en, 'en')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-300",
                    copiedEn 
                      ? "bg-emerald-500/20 text-emerald-400" 
                      : "bg-white/10 text-neutral-400 hover:bg-white/20 hover:text-white"
                  )}
                >
                  {copiedEn ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedEn ? cardT.copied : cardT.copy}</span>
                </button>
              </div>
              <div className="p-4 overflow-y-auto pod-scrollbar-y">
                <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap font-mono">
                  {prompts.en}
                </p>
              </div>
            </div>
          )}

          {/* Prompt Section ZH */}
          {(prompts.zh || isTranslating) && (
            <div className="bg-[#111] rounded-xl border border-white/10 overflow-hidden flex flex-col shrink-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-300">{t.inputPromptZh || 'Chinese Prompt'}</span>
                  {isTranslating && <Loader2 size={14} className="animate-spin text-purple-400" />}
                </div>
                <button
                  onClick={() => handleCopy(prompts.zh, 'zh')}
                  disabled={!prompts.zh}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-300",
                    copiedZh 
                      ? "bg-emerald-500/20 text-emerald-400" 
                      : "bg-white/10 text-neutral-400 hover:bg-white/20 hover:text-white"
                  )}
                >
                  {copiedZh ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedZh ? cardT.copied : cardT.copy}</span>
                </button>
              </div>
              <div className="p-4 overflow-y-auto pod-scrollbar-y">
                <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap font-mono">
                  {prompts.zh || <span className="text-neutral-600 italic">{t.saving || 'Translating...'}</span>}
                </p>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
