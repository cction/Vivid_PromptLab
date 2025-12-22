import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import api from './lib/api';
import { Header } from './components/Header';
import { PresetCard } from './components/PresetCard';
import { AddPresetModal } from './components/AddPresetModal';
import { PresetDetailModal } from './components/PresetDetailModal';
import { TagManagerModal } from './components/TagManagerModal';
import { translations } from './lib/translations';
import { AdminLogin } from './components/AdminLogin';
import { AdminSettings } from './components/AdminSettings';
import './styles/podui.css'; // Ensure PodUI styles are loaded

const MAIN_CATEGORIES = [
  "建筑设计",
  "景观设计",
  "室内设计",
  "规划设计",
  "改造设计",
  "电商设计",
  "创意广告",
  "人物与摄影",
  "插画艺术",
  "创意玩法"
];

function App() {
  const [presets, setPresets] = useState([]);
  const [pinnedTags, setPinnedTags] = useState([]);
  const [lang, setLang] = useState('zh');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortByNewest, setSortByNewest] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize] = useState(60);
  const [totalPresets, setTotalPresets] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false); // For Add Modal
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false); // For Tag Manager
  const [selectedPreset, setSelectedPreset] = useState(null); // For View Modal
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [showAdminAuth, setShowAdminAuth] = useState(false);

  const t = translations[lang].app;

  const hasInitRef = useRef(false);

  const fetchPresets = useCallback(async (pageToLoad = 1) => {
    try {
      setIsLoading(true);
      const [presetsRes, settingsRes] = await Promise.all([
        api.get('/api/presets', {
          params: {
            page: pageToLoad,
            pageSize,
            category: selectedCategory === 'All' ? undefined : selectedCategory,
            q: searchTerm || undefined,
            sortMode: selectedCategory === 'All'
              ? (sortByNewest ? 'latest' : 'pinned_first')
              : (sortByNewest ? 'latest' : 'category')
          }
        }),
        api.get('/api/settings')
      ]);
      
      const data = presetsRes.data;
      const presetsList = Array.isArray(data) ? data : data.presets || [];

      setPresets(presetsList);
      setPinnedTags(settingsRes.data.pinnedTags || []);
      
      let counts = {};
      if (!Array.isArray(data) && data.categoryCounts) {
        counts = data.categoryCounts;
      } else {
        presetsList.forEach(p => {
          if (p.categories) {
            p.categories.forEach(c => {
              if (MAIN_CATEGORIES.includes(c)) {
                counts[c] = (counts[c] || 0) + 1;
              }
            });
          }
        });
      }
      setCategoryCounts(counts);

      setCategories(MAIN_CATEGORIES);

      const total = !Array.isArray(data) && typeof data.total === 'number'
        ? data.total
        : presetsList.length;
      setTotalPresets(total);
      setPage(pageToLoad);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, selectedCategory, searchTerm]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    const path = window.location.pathname || '/';
    let nextCategory = 'All';
    let nextNewest = false;
    if (path.startsWith('/admin')) {
      hasInitRef.current = true;
      return;
    }
    if (path.startsWith('/category/')) {
      const name = decodeURIComponent(path.slice('/category/'.length));
      if (MAIN_CATEGORIES.includes(name)) {
        nextCategory = name;
      }
    } else if (path === '/latest') {
      nextCategory = 'All';
      nextNewest = true;
    } else if (path === '/all') {
      nextCategory = 'All';
      nextNewest = false;
    }
    setSelectedCategory(nextCategory);
    setSortByNewest(nextNewest);
    hasInitRef.current = true;
    const onPop = () => {
      const p = window.location.pathname || '/';
      api.get('/api/auth/me').then(() => setIsAdmin(true)).catch(() => setIsAdmin(false));
      if (p.startsWith('/admin')) {
        fetchPresets(1);
        return;
      }
      let cat = 'All';
      let newest = false;
      if (p.startsWith('/category/')) {
        const nm = decodeURIComponent(p.slice('/category/'.length));
        if (MAIN_CATEGORIES.includes(nm)) {
          cat = nm;
        }
      } else if (p === '/latest') {
        cat = 'All';
        newest = true;
      } else if (p === '/all') {
        cat = 'All';
        newest = false;
      }
      setSelectedCategory(cat);
      setSortByNewest(newest);
      fetchPresets(1);
    };
    window.addEventListener('popstate', onPop);
    const onOpenAuth = () => setShowAdminAuth(true);
    window.addEventListener('openAdminAuth', onOpenAuth);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('openAdminAuth', onOpenAuth);
    };
  }, [fetchPresets]);

  useEffect(() => {
    const id = setTimeout(() => {
      fetchPresets(1);
    }, 0);
    return () => clearTimeout(id);
  }, [selectedCategory, searchTerm, fetchPresets]);

  useEffect(() => {
    api.get('/api/auth/me').then(() => setIsAdmin(true)).catch(() => setIsAdmin(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalPresets / pageSize));

  const handlePrevPage = () => {
    if (page > 1 && !isLoading) {
      fetchPresets(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages && !isLoading) {
      fetchPresets(page + 1);
    }
  };

  const filteredPresets = useMemo(() => {
    const byDateDesc = (x) => x.createdAt ? new Date(x.createdAt).getTime() : (Number(x.id) || 0);
    if (sortByNewest) {
      return presets.slice().sort((a, b) => byDateDesc(b) - byDateDesc(a));
    }
    if (selectedCategory === 'All') {
      return presets;
    }
    return presets.slice().sort((a, b) => {
      const aMain = (a.categories || []).find(c => MAIN_CATEGORIES.includes(c));
      const bMain = (b.categories || []).find(c => MAIN_CATEGORIES.includes(c));
      const aIdx = aMain ? MAIN_CATEGORIES.indexOf(aMain) : 999;
      const bIdx = bMain ? MAIN_CATEGORIES.indexOf(bMain) : 999;
      if (aIdx !== bIdx) return aIdx - bIdx;
      return byDateDesc(b) - byDateDesc(a);
    });
  }, [presets, sortByNewest, pinnedTags, selectedCategory]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <div className="podui-theme min-h-screen bg-base-dark text-neutral-200 font-sans selection:bg-purple-500/30">
      <div className="max-w-7xl mx-auto p-4 md:p-8 relative z-10">
        <Header 
          lang={lang} 
          setLang={setLang}
          searchTerm={searchInput}
          setSearchTerm={setSearchInput}
          categories={categories}
          categoryCounts={categoryCounts}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          sortByNewest={sortByNewest}
          setSortByNewest={setSortByNewest}
          onAddClick={() => setIsModalOpen(true)}
          onManageTags={() => setIsTagManagerOpen(true)}
          canEdit={isAdmin && (window.location.pathname || '/').startsWith('/admin')}
          isAdmin={isAdmin}
          onOpenAdminSettings={() => setShowAdminSettings(true)}
          onOpenAdminAuth={() => setShowAdminAuth(true)}
        />
        <div className="h-48 md:h-56" />
        <AdminLogin
          isOpen={showAdminAuth}
          onClose={() => setShowAdminAuth(false)}
          onSuccess={() => {
            setIsAdmin(true);
            setShowAdminAuth(false);
            window.history.pushState(null, '', '/admin');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
        />
        {(window.location.pathname || '/') === '/admin' && isAdmin && showAdminSettings && (
          <AdminSettings isOpen={showAdminSettings} onClose={() => setShowAdminSettings(false)} />
        )}

        {/* Grid - Enhanced Layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredPresets.map((preset, index) => (
            <div 
              key={preset.id} 
              className="animate-in fade-in slide-in-from-bottom-8 duration-700"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <PresetCard 
                preset={preset} 
                lang={lang} 
                onDelete={fetchPresets} 
                onClick={() => setSelectedPreset(preset)}
                canEdit={isAdmin && (window.location.pathname || '/').startsWith('/admin')}
              />
            </div>
          ))}
        </div>

        {/* Empty State - Modernized */}
        {filteredPresets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-neutral-500 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <span className="text-4xl">🔍</span>
            </div>
            <p className="text-xl font-medium text-neutral-300">{t.noPrompts}</p>
            <p className="text-sm mt-2 text-neutral-500 max-w-xs text-center">
              {t.noPromptsDesc}
            </p>
            {presets.length === 0 && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-8 px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-neutral-200 transition-colors"
              >
                {t.createFirst}
              </button>
            )}
          </div>
        )}

        {/* Modal */}
        <AddPresetModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => fetchPresets(page)}
          existingCategories={categories}
          lang={lang}
        />

        {/* Tag Manager Modal */}
        <TagManagerModal
          isOpen={isTagManagerOpen}
          onClose={() => setIsTagManagerOpen(false)}
          lang={lang}
          onSuccess={() => fetchPresets(page)}
        />

        {/* View Modal */}
        <PresetDetailModal
          isOpen={!!selectedPreset}
          onClose={() => setSelectedPreset(null)}
          preset={selectedPreset}
          lang={lang}
          onSuccess={() => fetchPresets(page)}
          canEdit={isAdmin && (window.location.pathname || '/').startsWith('/admin')}
        />

        {totalPresets > 0 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={handlePrevPage}
              disabled={page <= 1 || isLoading}
              className="px-3 py-1.5 rounded-full text-sm border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed bg-neutral-900 hover:bg-neutral-800"
            >
              {lang === 'zh' ? '上一页' : 'Previous'}
            </button>
            <span className="text-xs text-neutral-400">
              {lang === 'zh'
                ? `第 ${page} / ${totalPages} 页 · 共 ${totalPresets} 条`
                : `Page ${page} / ${totalPages} · ${totalPresets} items`}
            </span>
            <button
              onClick={handleNextPage}
              disabled={page >= totalPages || isLoading}
              className="px-3 py-1.5 rounded-full text-sm border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed bg-neutral-900 hover:bg-neutral-800"
            >
              {lang === 'zh' ? '下一页' : 'Next'}
            </button>
          </div>
        )}

        {/* Scroll To Top Button */}
        <button
          onClick={scrollToTop}
          className={`fixed bottom-8 right-8 p-3 bg-white text-black rounded-full shadow-lg hover:bg-neutral-200 transition-all duration-300 z-40 ${
            showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
          }`}
          title="Back to Top"
        >
          <ArrowUp size={24} />
        </button>
      </div>
    </div>
  );
}

export default App;
