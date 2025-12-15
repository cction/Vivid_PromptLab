import React from 'react';
import { Copy, Check, Tag, Maximize2, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { translations } from '../lib/translations';
import axios from 'axios';

export function PresetCard({ preset, lang, onDelete, onClick }) {
  const [copied, setCopied] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const t = translations[lang].card;

  const prompt = lang === 'zh' ? (preset.promptZh || preset.promptEn) : preset.promptEn;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    // Use a flag to prevent multiple clicks if needed, but confirm is blocking usually.
    // The key issue might be hot module reloading not picking up the previous change or browser caching.
    // Let's add a log to verify the confirm result.
    const confirmed = window.confirm(t.confirmDelete || 'Are you sure?');
    console.log('Delete confirmed:', confirmed);
    
    if (confirmed) {
      setIsDeleting(true);
      try {
        await axios.delete(`http://localhost:3001/api/presets/${preset.id}`);
        onDelete();
      } catch (err) {
        console.error('Failed to delete preset:', err);
        alert('Failed to delete preset');
        setIsDeleting(false);
      }
    }
  };

  // Handle both local uploads and external URLs
  let imageUrl = null;
  if (preset.image) {
    if (preset.image.startsWith('http')) {
      imageUrl = preset.image;
    } else {
      // Ensure local paths start with slash if not already
      const path = preset.image.startsWith('/') ? preset.image : `/${preset.image}`;
      imageUrl = `http://localhost:3001${path}`;
    }
  }

  if (isDeleting) return null; // Optimistic UI update

  return (
    <div 
      onClick={onClick}
      className="group relative rounded-xl bg-neutral-900/40 border border-white/5 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 hover:border-white/10 flex flex-col h-full cursor-pointer"
    >
      {/* Glow Effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 pointer-events-none" />
      
      {/* Image Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-neutral-950">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={preset.title} 
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 bg-neutral-900/50 gap-2">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <Tag size={20} />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider">{t.noPreview}</span>
          </div>
        )}
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

        {/* Category Badge - Updated Style */}
        <div className="absolute top-2 left-2 z-10 flex gap-1 flex-wrap max-w-[80%]">
          {(preset.categories || []).slice(0, 3).map((cat, i) => (
            <span key={i} className="px-2 py-1 rounded-full text-[10px] font-medium bg-[#1A2333]/90 backdrop-blur-md text-blue-200 border border-blue-500/20 shadow-lg">
              {cat}
            </span>
          ))}
          {(preset.categories || []).length > 3 && (
            <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-[#1A2333]/90 backdrop-blur-md text-blue-200 border border-blue-500/20 shadow-lg">
              +{(preset.categories.length - 3)}
            </span>
          )}
        </div>

        {/* Delete Button (Only visible on hover) */}
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button 
            onClick={handleDelete}
            className="p-1.5 rounded-full bg-black/40 backdrop-blur-md text-white/70 hover:text-red-400 hover:bg-black/60 border border-white/10 shadow-lg transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 z-10 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
          <h3 className="text-sm font-bold text-white leading-tight line-clamp-1 mb-1 drop-shadow-md">
            {preset.title}
          </h3>
        </div>
      </div>

      {/* Content Section - Slide Up Reveal */}
      <div className="relative flex-grow flex flex-col bg-neutral-900/80 backdrop-blur-sm border-t border-white/5 p-3 transition-colors group-hover:bg-neutral-900/90">
        <div className="relative flex-grow">
          <p className="text-xs text-neutral-400 font-light leading-relaxed line-clamp-3 group-hover:text-neutral-300 transition-colors">
            {prompt}
          </p>
          
          {/* Fader for text overflow */}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-neutral-900/80 to-transparent pointer-events-none" />
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
          <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest">
            {t.langLabel}
          </span>
          
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all duration-300",
                copied 
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" 
                  : "bg-white/5 text-neutral-400 border border-transparent hover:bg-white/10 hover:text-white hover:border-white/10"
              )}
            >
              {copied ? (
                <>
                  <Check size={12} />
                  <span>{t.copied}</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>{t.copy}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
