import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowUp } from 'lucide-react';
import { Header } from './components/Header';
import { PresetCard } from './components/PresetCard';
import { AddPresetModal } from './components/AddPresetModal';
import { PresetDetailModal } from './components/PresetDetailModal';
import { TagManagerModal } from './components/TagManagerModal';
import { translations } from './lib/translations';
import './styles/podui.css'; // Ensure PodUI styles are loaded

function App() {
  const [presets, setPresets] = useState([]);
  const [pinnedTags, setPinnedTags] = useState([]);
  const [lang, setLang] = useState('zh');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  
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
  
  const [isModalOpen, setIsModalOpen] = useState(false); // For Add Modal
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false); // For Tag Manager
  const [selectedPreset, setSelectedPreset] = useState(null); // For View Modal
  const [showScrollTop, setShowScrollTop] = useState(false);

  const t = translations[lang].app;

  useEffect(() => {
    fetchPresets();
    
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchPresets = async () => {
    try {
      const [presetsRes, settingsRes] = await Promise.all([
        axios.get('http://localhost:3001/api/presets'),
        axios.get('http://localhost:3001/api/settings')
      ]);
      
      setPresets(presetsRes.data);
      setPinnedTags(settingsRes.data.pinnedTags || []);
      
      // Calculate counts for MAIN_CATEGORIES
      const counts = {};
      presetsRes.data.forEach(p => {
        if (p.categories) {
          p.categories.forEach(c => {
            if (MAIN_CATEGORIES.includes(c)) {
              counts[c] = (counts[c] || 0) + 1;
            }
          });
        }
      });
      setCategoryCounts(counts);

      // Use predefined categories order
      setCategories(MAIN_CATEGORIES);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  };

  const filteredPresets = presets.filter(preset => {
    const matchesSearch = (preset.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (preset.promptEn?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (preset.promptZh?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || (preset.categories && preset.categories.includes(selectedCategory));
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    // Check if any category is pinned
    const aPinned = (a.categories || []).some(cat => pinnedTags.includes(cat));
    const bPinned = (b.categories || []).some(cat => pinnedTags.includes(cat));
    
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    
    // Default sort by Main Category order then creation time
    const aMain = (a.categories || []).find(c => MAIN_CATEGORIES.includes(c));
    const bMain = (b.categories || []).find(c => MAIN_CATEGORIES.includes(c));
    
    const aIdx = aMain ? MAIN_CATEGORIES.indexOf(aMain) : 999;
    const bIdx = bMain ? MAIN_CATEGORIES.indexOf(bMain) : 999;
    
    if (aIdx !== bIdx) return aIdx - bIdx;
    
    return 0;
  });

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
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          categories={categories}
          categoryCounts={categoryCounts}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          onAddClick={() => setIsModalOpen(true)}
          onManageTags={() => setIsTagManagerOpen(true)}
        />

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
          onSuccess={fetchPresets}
          existingCategories={categories}
          lang={lang}
        />

        {/* Tag Manager Modal */}
        <TagManagerModal
          isOpen={isTagManagerOpen}
          onClose={() => setIsTagManagerOpen(false)}
          lang={lang}
          onSuccess={fetchPresets}
        />

        {/* View Modal */}
        <PresetDetailModal
          isOpen={!!selectedPreset}
          onClose={() => setSelectedPreset(null)}
          preset={selectedPreset}
          lang={lang}
          onSuccess={fetchPresets}
        />

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
