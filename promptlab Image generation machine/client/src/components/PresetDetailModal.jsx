import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { X, Copy, Check, Tag, Loader2, Edit2, Save, ImagePlus } from 'lucide-react';
import { cn } from '../lib/utils';
import { translations } from '../lib/translations';

export function PresetDetailModal({ isOpen, onClose, preset, lang, onSuccess }) {
  const [copiedEn, setCopiedEn] = useState(false);
  const [copiedZh, setCopiedZh] = useState(false);
  const [prompts, setPrompts] = useState({ en: '', zh: '' });
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    promptEn: '',
    promptZh: '',
    image: null, // File object or null
    imageUrl: '' // Preview URL
  });

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
        
        // Init edit form
        let imgUrl = null;
        if (preset.image) {
           if (preset.image.startsWith('http')) {
             imgUrl = preset.image;
           } else {
             const path = preset.image.startsWith('/') ? preset.image : `/${preset.image}`;
             imgUrl = `http://localhost:3001${path}`;
           }
        }
        setEditForm({
          title: preset.title,
          promptEn: en,
          promptZh: zh,
          image: null,
          imageUrl: imgUrl
        });
      };
      initPrompts();
    }
  }, [isOpen, preset]);

  // Handle auto-translation when editing
  const handleTranslate = async (text, source) => {
    // We should allow empty text, but usually we translate non-empty. 
    // If text is empty, maybe clear the other side?
    if (!text.trim()) return;
    
    // Don't translate if the other side already has content? 
    // Usually user wants to overwrite if they are typing. 
    // But let's check if the user is just fixing a typo.
    // A simple debounce is handled by onBlur naturally.
    
    setIsTranslating(true);
    try {
      const target = source === 'en' ? 'zh' : 'en';
      
      // Call API
      const res = await axios.post('http://localhost:3001/api/translate', {
        text,
        source,
        target
      });
      
      if (res.data.translatedText) {
        setEditForm(prev => ({
          ...prev,
          [target === 'en' ? 'promptEn' : 'promptZh']: res.data.translatedText
        }));
      }
    } catch (e) {
      console.error("Translation failed:", e);
    }
    setIsTranslating(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', editForm.title);
      formData.append('promptEn', editForm.promptEn);
      formData.append('promptZh', editForm.promptZh);
      // We don't change categories here yet, keep original
      formData.append('categories', JSON.stringify(preset.categories || []));
      
      if (editForm.image) {
        formData.append('image', editForm.image);
      }

      await axios.put(`http://localhost:3001/api/presets/${preset.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Update local view state
      setPrompts({ en: editForm.promptEn, zh: editForm.promptZh });
      preset.title = editForm.title;
      preset.promptEn = editForm.promptEn;
      preset.promptZh = editForm.promptZh;
      // Image update is tricky without full refresh, but we can assume success
      // Ideally we reload parent or update preset object ref
      
      setIsEditing(false);
      // Optional: notify parent to refresh if passed
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to save', err);
      alert('Failed to save changes');
    }
    setIsSaving(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditForm(prev => ({
        ...prev,
        image: file,
        imageUrl: URL.createObjectURL(file)
      }));
    }
  };

  if (!isOpen || !preset) return null;

  const t = translations[lang].modal;
  const cardT = translations[lang].card;

  // View Mode Image URL
  let imageUrl = editForm.imageUrl; 

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
          <div className="flex flex-col gap-1 w-full mr-4">
            {isEditing ? (
              <input
                type="text"
                value={editForm.title}
                onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                className="text-xl font-bold text-neutral-100 bg-neutral-900 border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-purple-500 w-full"
                placeholder={t.inputTitle}
              />
            ) : (
              <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
                {preset.title}
              </h2>
            )}
            
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
          
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="p-2 rounded-full bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
                title={t.edit || "Edit"}
              >
                <Edit2 size={18} />
              </button>
            ) : (
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="p-2 rounded-full bg-purple-600 text-white hover:bg-purple-500 transition-colors flex items-center gap-2 px-4"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span className="text-sm font-medium">{t.save}</span>
              </button>
            )}
            <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors p-1">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 pt-2 pod-scrollbar-y flex flex-col gap-6">
          
          {/* Main Image */}
          <div className="w-full rounded-xl overflow-hidden bg-neutral-900 border border-white/5 shrink-0 relative group">
            {imageUrl ? (
               <img src={imageUrl} alt={preset.title} className="w-full h-auto block" />
            ) : (
              <div className="aspect-video flex items-center justify-center text-neutral-600">
                <Tag size={48} />
              </div>
            )}
            
            {isEditing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <label className="cursor-pointer flex flex-col items-center gap-2 text-white bg-black/50 p-4 rounded-xl hover:bg-black/70 transition-colors border border-white/20">
                  <ImagePlus size={32} />
                  <span className="text-sm font-medium">{t.clickToChange}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>
            )}
          </div>

          {/* Prompt Section EN */}
          {(prompts.en || isEditing) && (
            <div className="bg-[#111] rounded-xl border border-white/10 overflow-hidden flex flex-col shrink-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-300">{t.inputPromptEn || 'English Prompt'}</span>
                  {isTranslating && <Loader2 size={14} className="animate-spin text-neutral-500" />}
                </div>
                {!isEditing && (
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
                )}
              </div>
              <div className="p-4 overflow-y-auto pod-scrollbar-y">
                {isEditing ? (
                  <textarea
                    value={editForm.promptEn}
                    onChange={e => setEditForm(prev => ({ ...prev, promptEn: e.target.value }))}
                    onBlur={() => handleTranslate(editForm.promptEn, 'en')}
                    className="w-full bg-transparent text-sm text-neutral-300 font-mono leading-relaxed resize-none focus:outline-none min-h-[100px]"
                    placeholder={t.inputPromptEnPlaceholder}
                  />
                ) : (
                  <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap font-mono">
                    {prompts.en}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Prompt Section ZH */}
          {(prompts.zh || isTranslating || isEditing) && (
            <div className="bg-[#111] rounded-xl border border-white/10 overflow-hidden flex flex-col shrink-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-300">{t.inputPromptZh || 'Chinese Prompt'}</span>
                  {isTranslating && <Loader2 size={14} className="animate-spin text-purple-400" />}
                </div>
                {!isEditing && (
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
                )}
              </div>
              <div className="p-4 overflow-y-auto pod-scrollbar-y">
                {isEditing ? (
                  <textarea
                    value={editForm.promptZh}
                    onChange={e => setEditForm(prev => ({ ...prev, promptZh: e.target.value }))}
                    onBlur={() => handleTranslate(editForm.promptZh, 'zh')}
                    className="w-full bg-transparent text-sm text-neutral-300 font-mono leading-relaxed resize-none focus:outline-none min-h-[100px]"
                    placeholder={t.inputPromptZhPlaceholder}
                  />
                ) : (
                  <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap font-mono">
                    {prompts.zh || <span className="text-neutral-600 italic">{t.translating || 'Translating...'}</span>}
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
