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
    image: null,
    imageUrl: '',
    categories: []
  });
  const [categoryInput, setCategoryInput] = useState('');
  const [existingTags, setExistingTags] = useState([]);

  useEffect(() => {
    if (!isOpen || !isEditing) return;
    const fetchTags = async () => {
      try {
        const res = await axios.get('http://localhost:3001/api/tags');
        setExistingTags(res.data || []);
      } catch (err) {
        console.error('Failed to fetch tags', err);
      }
    };
    fetchTags();
  }, [isOpen, isEditing]);

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
          imageUrl: imgUrl,
          categories: Array.isArray(preset.categories) ? preset.categories : []
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
      formData.append('categories', JSON.stringify(editForm.categories || []));
      
      if (editForm.image) {
        formData.append('image', editForm.image);
      }

      await axios.put(`http://localhost:3001/api/presets/${preset.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setPrompts({ en: editForm.promptEn, zh: editForm.promptZh });
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

  const handleAddCategory = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && categoryInput.trim()) {
      e.preventDefault();
      const value = categoryInput.trim().replace(',', '');
      if (!value) return;
      setEditForm(prev => {
        const current = Array.isArray(prev.categories) ? prev.categories : [];
        if (current.includes(value)) return prev;
        return { ...prev, categories: [...current, value] };
      });
      setCategoryInput('');
    }
  };

  const handleRemoveCategory = (cat) => {
    setEditForm(prev => ({
      ...prev,
      categories: (prev.categories || []).filter(c => c !== cat)
    }));
  };

  if (!isOpen || !preset) return null;

  const t = translations[lang].modal;
  const cardT = translations[lang].card;
  const categoryLabels = translations[lang].categories || {};

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
                {editForm.title || preset.title}
              </h2>
            )}
            
            <div className="flex items-center gap-3 text-sm text-neutral-400">
               <span>{t.source}: @PromptLab</span>
               <span className="w-1 h-1 rounded-full bg-neutral-600" />
               <span>{t.model}: Nano Banana Pro</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {isEditing ? (
                <>
                  {(editForm.categories || []).map((cat) => (
                    <span
                      key={cat}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-black/60 text-neutral-200 border border-white/15 flex items-center gap-1"
                    >
                      <span className="truncate max-w-[120px]">
                        {categoryLabels[cat] || cat}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(cat)}
                        className="text-neutral-400 hover:text-white ml-1"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={categoryInput}
                    onChange={e => setCategoryInput(e.target.value)}
                    onKeyDown={handleAddCategory}
                    className="px-3 py-1 rounded-full text-xs bg-neutral-900 border border-white/10 text-neutral-200 focus:outline-none"
                    placeholder={t.inputCategoryPlaceholder || 'Add tag'}
                  />
                  {existingTags.length > 0 && (
                    <select
                      className="px-3 py-1 rounded-full text-xs bg-neutral-900 border border-white/10 text-neutral-200 focus:outline-none"
                      defaultValue=""
                      onChange={e => {
                        const value = e.target.value;
                        if (!value) return;
                        setEditForm(prev => {
                          const current = Array.isArray(prev.categories) ? prev.categories : [];
                          if (current.includes(value)) return prev;
                          return { ...prev, categories: [...current, value] };
                        });
                        e.target.value = '';
                      }}
                    >
                      <option value="">{t.selectExistingCategory || '选择现有标签'}</option>
                      {existingTags.map(tag => (
                        <option key={tag.name} value={tag.name}>
                          {categoryLabels[tag.name] || tag.name}
                        </option>
                      ))}
                    </select>
                  )}
                 </>
              ) : (
                (editForm.categories || preset.categories || []).map((cat, i) => (
                  <span 
                    key={cat + i} 
                    className="px-3 py-1 rounded-full text-xs font-medium bg-black/60 text-neutral-200 border border-white/15 hover:bg-black/70 transition-colors"
                  >
                    {categoryLabels[cat] || cat}
                  </span>
                ))
              )}
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
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all duration-200 shadow-md",
                  isSaving
                    ? "bg-purple-500/70 text-white cursor-wait"
                    : "bg-purple-500 text-white hover:bg-purple-400"
                )}
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>{t.save}</span>
              </button>
            )}
            <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors p-1">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 p-6 pt-2 flex gap-6">
          <div className="w-[45%] max-w-md flex flex-col gap-4">
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
                  <label className="cursor-pointer flex flex-col items-center gap-2 text-white bg黑/50 p-4 rounded-xl hover:bg-black/70 transition-colors border border-white/20">
                    <ImagePlus size={32} />
                    <span className="text-sm font-medium">{t.clickToChange}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-4">
            {(prompts.en || isEditing) && (
              <div className="bg-[#111] rounded-xl border border-white/10 overflow-hidden flex flex-col flex-1 min-h-0">
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
                <div className="p-4 overflow-y-auto pod-scrollbar-y flex-1 min-h-0">
                  {isEditing ? (
                    <textarea
                      value={editForm.promptEn}
                      onChange={e => setEditForm(prev => ({ ...prev, promptEn: e.target.value }))}
                      onBlur={() => handleTranslate(editForm.promptEn, 'en')}
                      className="w-full h-full bg-transparent text-sm text-neutral-300 font-mono leading-relaxed resize-none focus:outline-none"
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

            {(prompts.zh || isTranslating || isEditing) && (
              <div className="bg-[#111] rounded-xl border border-white/10 overflow-hidden flex flex-col flex-1 min-h-0">
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
                <div className="p-4 overflow-y-auto pod-scrollbar-y flex-1 min-h-0">
                  {isEditing ? (
                    <textarea
                      value={editForm.promptZh}
                      onChange={e => setEditForm(prev => ({ ...prev, promptZh: e.target.value }))}
                      onBlur={() => handleTranslate(editForm.promptZh, 'zh')}
                      className="w-full h-full bg-transparent text-sm text-neutral-300 font-mono leading-relaxed resize-none focus:outline-none"
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
    </div>
  );
}
