import React from 'react';
import { Search, Plus, Sparkles, Filter, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { translations } from '../lib/translations';
import AivaLogo from '../assets/AIVA.svg';

export function Header({ 
  lang, 
  setLang, 
  searchTerm, 
  setSearchTerm, 
  onAddClick,
  onManageTags,
  onOpenAdminSettings,
  onOpenAdminAuth,
  categories,
  categoryCounts = {},
  selectedCategory,
  setSelectedCategory,
  sortByNewest,
  setSortByNewest,
  canEdit = false,
  isAdmin = false,
  onTagExpandedChange,
}) {
  const t = translations[lang].app;
  const categoryLabels = translations[lang].categories || {};
  const [isTagExpanded, setIsTagExpanded] = React.useState(false);
  const [hasTagOverflow, setHasTagOverflow] = React.useState(false);
  const tagsContainerRef = React.useRef(null);

  React.useEffect(() => {
    const el = tagsContainerRef.current;
    if (!el) return;
    const checkOverflow = () => {
      setHasTagOverflow(el.scrollHeight > el.clientHeight);
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => {
      window.removeEventListener('resize', checkOverflow);
    };
  }, [categories.length, lang]);

  const handleToggleTagExpand = () => {
    setIsTagExpanded(prev => {
      const next = !prev;
      if (typeof onTagExpandedChange === 'function') {
        onTagExpandedChange(next);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Combined Header + Filters */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto bg-base-dark/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        {/* Logo Section - Enhanced */}
        <div className="flex items-center gap-6 group">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/40 to-pink-600/40 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <img src={AivaLogo} alt="Logo" className="relative w-16 h-16 object-contain drop-shadow-[0_0_12px_rgba(197,174,246,0.3)] transition-transform duration-500 group-hover:scale-105" />
          </div>
          
          <div className="flex flex-col -mt-1">
            <h1 className="text-3xl font-black tracking-tighter">
              <span className="pod-text-aurora drop-shadow-sm">
                {t.title}
              </span>
            </h1>
            <div className="flex items-center gap-2">
              <div className="h-px w-8 bg-gradient-to-r from-purple-500 to-transparent"></div>
              <p className="text-purple-300/80 text-[10px] font-bold tracking-[0.2em] uppercase shadow-black drop-shadow-md">
                {t.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Language Switch - Pill Style */}
          <div className="flex bg-black/20 p-1 rounded-full border border-white/5 relative">
            <div 
              className={cn(
                "absolute inset-y-1 rounded-full bg-neutral-800 shadow-sm transition-all duration-300 ease-out",
                lang === 'zh' ? "left-1 w-[calc(50%-4px)]" : "left-[calc(50%+4px)] w-[calc(50%-8px)]"
              )}
            />
            <button
              onClick={() => setLang('zh')}
              className={cn(
                "relative z-10 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-300",
                lang === 'zh' ? "text-white" : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              中文
            </button>
            <button
              onClick={() => setLang('en')}
              className={cn(
                "relative z-10 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-300",
                lang === 'en' ? "text-white" : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              English
            </button>
          </div>

            {canEdit && (
              <button 
                onClick={onManageTags}
                className="p-2.5 rounded-full bg-black/20 text-neutral-400 hover:text-white hover:bg-black/40 transition-all border border-white/5"
                title="Manage Tags"
              >
                <Settings size={18} />
              </button>
            )}

          {!(typeof window !== 'undefined' && (window.location.pathname || '/').startsWith('/admin')) && (
            <button 
              onClick={() => {
                const path = typeof window !== 'undefined' ? (window.location.pathname || '/') : '/';
                if (!path.startsWith('/admin')) {
                  if (onOpenAdminAuth) onOpenAdminAuth();
                } else {
                  if (onOpenAdminSettings) onOpenAdminSettings();
                }
              }}
              className="group flex items-center gap-2 px-4 py-2 bg-black/20 text-neutral-300 rounded-full text-sm hover:bg-black/40 transition-all border border-white/5"
            >
              管理
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => onOpenAdminSettings && onOpenAdminSettings()}
              className="group flex items-center gap-2 px-4 py-2 bg-black/20 text-neutral-300 rounded-full text-sm hover:bg-black/40 transition-all border border-white/5"
            >
              账户设置
            </button>
          )}

          {canEdit && (
            <button 
              onClick={onAddClick}
              className="group flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-full font-semibold text-sm hover:bg-neutral-200 transition-all shadow-lg shadow-white/5 active:scale-95"
            >
              <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
              <span>{t.create}</span>
            </button>
          )}
        </div>
          </div>
          <div className="border-t border-white/10 my-2"></div>
          <div className="flex flex-col md:flex-row gap-6 items-center">
          {/* Search Input - Minimalist */}
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center bg-neutral-900/50 border border-white/5 rounded-2xl overflow-hidden transition-colors group-focus-within:border-white/10 group-focus-within:bg-neutral-900">
              <div className="pl-4 text-neutral-500 group-focus-within:text-purple-400 transition-colors">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none py-3 px-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
              />
            </div>
          </div>

            {/* Categories - Wrapping Tags */}
            <div className="flex-1 w-full flex items-center gap-2">
              <div
                ref={tagsContainerRef}
                className={cn(
                  "flex flex-wrap gap-2 overflow-hidden",
                  isTagExpanded ? "max-h-[999px]" : "max-h-11"
                )}
              >
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSortByNewest(false);
                  window.history.pushState(null, '', '/all');
                }}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap border transition-all duration-300",
                  selectedCategory === 'All' && !sortByNewest
                    ? "bg-white text-black border-white shadow-lg shadow-white/5"
                    : "bg-transparent border-white/5 text-neutral-400 hover:border-white/20 hover:text-neutral-200"
                )}
              >
                {t.allCategories}
              </button>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSortByNewest(true);
                  window.history.pushState(null, '', '/latest');
                }}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap border transition-all duration-300",
                  sortByNewest
                    ? "bg-white text-black border-white shadow-lg shadow-white/5"
                    : "bg-transparent border-white/5 text-neutral-400 hover:border-white/20 hover:text-neutral-200"
                )}
              >
                {t.latest}
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSortByNewest(false);
                    window.history.pushState(null, '', `/category/${encodeURIComponent(cat)}`);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap border transition-all duration-300 flex items-center gap-1.5",
                    selectedCategory === cat && !sortByNewest
                      ? "bg-white text-black border-white shadow-lg shadow-white/5"
                      : "bg-transparent border-white/5 text-neutral-400 hover:border-white/20 hover:text-neutral-200"
                  )}
                >
                  <span>{categoryLabels[cat] || cat}</span>
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full",
                    selectedCategory === cat
                      ? "bg-black/10 text-black/60"
                      : "bg-white/5 text-neutral-500"
                  )}>
                    {categoryCounts[cat] || 0}
                  </span>
                </button>
              ))}
              </div>
              {hasTagOverflow && (
                <button
                  onClick={handleToggleTagExpand}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium border border-white/10 text-neutral-400 hover:text-white hover:border-white/40 bg-black/30 whitespace-nowrap"
                >
                  {isTagExpanded ? (t.collapseTags || '收起') : (t.expandTags || '展开')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
