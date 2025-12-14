import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Header } from './components/Header';
import { PresetCard } from './components/PresetCard';
import { AddPresetModal } from './components/AddPresetModal';
import { PresetDetailModal } from './components/PresetDetailModal';
import { translations } from './lib/translations';
import './styles/podui.css'; // Ensure PodUI styles are loaded

function App() {
  const [presets, setPresets] = useState([]);
  const [lang, setLang] = useState('zh');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false); // For Add Modal
  const [selectedPreset, setSelectedPreset] = useState(null); // For View Modal

  const t = translations[lang].app;

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/presets');
      setPresets(res.data);
      
      // Extract unique categories
      const cats = [...new Set(res.data.flatMap(p => p.categories || []).filter(Boolean))];
      setCategories(cats);
    } catch (err) {
      console.error("Failed to fetch presets:", err);
    }
  };

  const filteredPresets = presets.filter(preset => {
    const matchesSearch = (preset.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (preset.promptEn?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (preset.promptZh?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || (preset.categories && preset.categories.includes(selectedCategory));
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="podui-theme min-h-screen bg-base-dark text-neutral-200 font-sans selection:bg-purple-500/30">
      <div className="max-w-7xl mx-auto p-4 md:p-8 relative z-10">
        <Header 
          lang={lang} 
          setLang={setLang}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          onAddClick={() => setIsModalOpen(true)}
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

        {/* View Modal */}
        <PresetDetailModal
          isOpen={!!selectedPreset}
          onClose={() => setSelectedPreset(null)}
          preset={selectedPreset}
          lang={lang}
        />
      </div>
    </div>
  );
}

export default App;
