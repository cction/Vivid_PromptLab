import React, { useState } from 'react';
import axios from 'axios';
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { translations } from '../lib/translations';

export function AddPresetModal({ isOpen, onClose, onSuccess, existingCategories, lang }) {
  const [formData, setFormData] = useState({
    title: '',
    categories: [],
    promptEn: '',
    promptZh: ''
  });
  const [categoryInput, setCategoryInput] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [translatingField, setTranslatingField] = useState(null); // 'en' or 'zh'

  const t = translations[lang].modal;

  if (!isOpen) return null;

  const handleTranslate = async (text, source, target) => {
    if (!text || translatingField) return;
    
    // Check if target field is already filled
    const targetField = target === 'zh' ? 'promptZh' : 'promptEn';
    if (formData[targetField]) return;

    setTranslatingField(target);
    try {
      const res = await axios.post('http://localhost:3001/api/translate', {
        text,
        source,
        target
      });
      if (res.data.translatedText) {
        setFormData(prev => ({
          ...prev,
          [targetField]: res.data.translatedText
        }));
      }
    } catch (error) {
      console.error("Translation failed", error);
    } finally {
      setTranslatingField(null);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleAddCategory = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && categoryInput.trim()) {
      e.preventDefault();
      const newCat = categoryInput.trim().replace(',', '');
      if (newCat && !formData.categories.includes(newCat)) {
        setFormData(prev => ({
          ...prev,
          categories: [...prev.categories, newCat]
        }));
      }
      setCategoryInput('');
    }
  };

  const removeCategory = (catToRemove) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c !== catToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const data = new FormData();
    data.append('title', formData.title);
    // Send categories as JSON string
    data.append('categories', JSON.stringify(formData.categories));
    data.append('promptEn', formData.promptEn);
    data.append('promptZh', formData.promptZh);
    if (file) {
      data.append('image', file);
    }

    try {
      await axios.post('http://localhost:3001/api/presets', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSuccess();
      onClose();
      // Reset form
      setFormData({ title: '', categories: [], promptEn: '', promptZh: '' });
      setCategoryInput('');
      setFile(null);
      setPreview(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save preset');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="pod-panel w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="pod-panel-header">
          <h2 className="text-lg font-semibold text-neutral-100">{t.title}</h2>
          <button onClick={onClose} className="pod-icon-button hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 pod-scrollbar-y">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {/* Image Upload */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-neutral-400">{t.coverImage}</label>
              <div 
                className={cn(
                  "border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer bg-black/20",
                  preview ? "border-purple-500/50" : "hover:border-white/20 hover:bg-white/5"
                )}
                onClick={() => document.getElementById('image-upload').click()}
              >
                {preview ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden group">
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-sm">{t.clickToChange}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-neutral-500">
                    <div className="p-4 bg-white/5 rounded-full">
                      <Upload size={24} />
                    </div>
                    <p className="text-sm">{t.clickToUpload}</p>
                  </div>
                )}
                <input 
                  id="image-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-neutral-400">{t.inputTitle}</label>
                <input
                  type="text"
                  required
                  className="pod-input w-full"
                  placeholder={t.inputTitlePlaceholder}
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-neutral-400">{t.inputCategory}</label>
                <div className="relative flex flex-col gap-2">
                   <div className="flex flex-wrap gap-2 mb-1">
                      {formData.categories.map(cat => (
                        <span key={cat} className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 text-xs flex items-center gap-1">
                          {cat}
                          <button type="button" onClick={() => removeCategory(cat)} className="hover:text-white">
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                   </div>
                   <input
                    type="text"
                    list="categories"
                    className="pod-input w-full"
                    placeholder={t.inputCategoryPlaceholder || "Add categories..."}
                    value={categoryInput}
                    onChange={e => setCategoryInput(e.target.value)}
                    onKeyDown={handleAddCategory}
                  />
                  <datalist id="categories">
                    {existingCategories.map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Prompts */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-neutral-400">{t.inputPromptEn}</label>
                {translatingField === 'en' && <Loader2 size={14} className="animate-spin text-purple-400" />}
              </div>
              <textarea
                required={!formData.promptZh} // At least one is required ideally, but keeping form simple
                className="pod-input w-full min-h-[100px] resize-none"
                placeholder={t.inputPromptEnPlaceholder}
                value={formData.promptEn}
                onChange={e => setFormData({...formData, promptEn: e.target.value})}
                onBlur={(e) => handleTranslate(e.target.value, 'en', 'zh')}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-neutral-400">{t.inputPromptZh}</label>
                {translatingField === 'zh' && <Loader2 size={14} className="animate-spin text-purple-400" />}
              </div>
              <textarea
                required={!formData.promptEn}
                className="pod-input w-full min-h-[100px] resize-none"
                placeholder={t.inputPromptZhPlaceholder}
                value={formData.promptZh}
                onChange={e => setFormData({...formData, promptZh: e.target.value})}
                onBlur={(e) => handleTranslate(e.target.value, 'zh', 'en')}
              />
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose} 
            className="pod-btn-ghost"
            disabled={isSubmitting}
          >
            {t.cancel}
          </button>
          <button 
            onClick={handleSubmit}
            className="pod-primary-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? t.saving : t.save}
          </button>
        </div>

      </div>
    </div>
  );
}
