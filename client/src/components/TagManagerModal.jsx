import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { X, Search, Trash2, Edit2, Check, Merge, Settings, Pin, PinOff } from 'lucide-react';
import { translations } from '../lib/translations';
import { cn } from '../lib/utils';

export function TagManagerModal({ isOpen, onClose, lang, onSuccess }) {
  const [tags, setTags] = useState([]);
  const [pinnedTags, setPinnedTags] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [editingTag, setEditingTag] = useState(null); // { name, newName }
  const [mergeTarget, setMergeTarget] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  
  const t = translations[lang].tagManager;
  const categoryLabels = translations[lang].categories || {};

  const fetchTags = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/tags');
      setTags(res.data);
    } catch (err) {
      console.error('Failed to fetch tags', err);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/settings');
      setPinnedTags(res.data.pinnedTags || []);
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  }, []);

  useEffect(() => {
    let timeoutId;
    if (isOpen) {
      timeoutId = setTimeout(() => {
        fetchTags();
        fetchSettings();
        setSelectedTags(new Set());
        setEditingTag(null);
        setIsMerging(false);
        setIsCreating(false);
        setNewTagName('');
      }, 0);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isOpen, fetchTags, fetchSettings]);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await axios.post('http://localhost:3001/api/tags', { name: newTagName.trim() });
      await fetchTags();
      setIsCreating(false);
      setNewTagName('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to create tag', err);
    }
  };

  const handleTogglePin = async (tag) => {
    try {
      const res = await axios.post('http://localhost:3001/api/tags/pin', { tag });
      setPinnedTags(res.data.pinnedTags);
      if (onSuccess) onSuccess(); // Notify parent to refresh list order
    } catch (err) {
      console.error('Failed to toggle pin', err);
    }
  };

  const handleBatchUpdate = async (oldNames, newName) => {
    try {
      await axios.post('http://localhost:3001/api/tags/batch', {
        oldNames,
        newName // null for delete
      });
      await fetchTags();
      setSelectedTags(new Set());
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to update tags', err);
      alert('Operation failed');
    }
  };

  const handleDelete = (names) => {
    if (window.confirm(t.confirmDelete)) {
      handleBatchUpdate(names, null);
    }
  };

  const handleMerge = () => {
    if (!mergeTarget.trim()) return;
    handleBatchUpdate(Array.from(selectedTags), mergeTarget.trim());
    setIsMerging(false);
    setMergeTarget('');
  };

  const handleRename = (oldName, newName) => {
    if (!newName.trim() || oldName === newName) {
      setEditingTag(null);
      return;
    }
    handleBatchUpdate([oldName], newName.trim());
    setEditingTag(null);
  };

  const toggleSelect = (name) => {
    const newSet = new Set(selectedTags);
    if (newSet.has(name)) newSet.delete(name);
    else newSet.add(name);
    setSelectedTags(newSet);
  };

  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="pod-panel w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative bg-[#0a0a0a] border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Settings size={20} />
            </div>
            <h2 className="text-xl font-bold text-neutral-100">{t.title}</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 flex flex-col gap-4 bg-[#111] border-b border-white/5">
          <div className="flex gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-200 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>
            
            {/* Create Tag Button */}
            {!isCreating ? (
              <button 
                onClick={() => setIsCreating(true)}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium border border-white/10 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Check size={14} className="opacity-0 w-0" /> {/* Spacer */}
                {t.createTag || "New Tag"}
              </button>
            ) : (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                <input
                  type="text"
                  placeholder={t.newTagPlaceholder || "New tag..."}
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
                  className="bg-[#1A1A1A] border border-purple-500/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none w-32 md:w-48"
                  autoFocus
                />
                <button onClick={handleCreateTag} className="p-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white">
                  <Check size={16} />
                </button>
                <button onClick={() => setIsCreating(false)} className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-400">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Batch Actions */}
          {selectedTags.size > 0 && (
            <div className="flex items-center justify-between animate-in slide-in-from-top-2 duration-200 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
              <span className="text-sm font-medium text-purple-200">
                {selectedTags.size} {t.selected}
              </span>
              <div className="flex items-center gap-2">
                {isMerging ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      placeholder={t.mergePlaceholder}
                      value={mergeTarget}
                      onChange={e => setMergeTarget(e.target.value)}
                      className="bg-[#0a0a0a] border border-purple-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none w-32"
                      autoFocus
                    />
                    <button onClick={handleMerge} className="p-1 hover:text-white text-purple-300">
                      <Check size={16} />
                    </button>
                    <button onClick={() => setIsMerging(false)} className="p-1 hover:text-white text-neutral-400">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => setIsMerging(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors"
                    >
                      <Merge size={14} />
                      {t.merge}
                    </button>
                    <button 
                      onClick={() => handleDelete(Array.from(selectedTags))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/20 text-xs font-medium transition-colors"
                    >
                      <Trash2 size={14} />
                      {t.delete}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 pod-scrollbar-y">
          {filteredTags.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredTags.map(tag => (
                <div 
                  key={tag.name}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all duration-200 group",
                    selectedTags.has(tag.name) 
                      ? "bg-purple-500/10 border-purple-500/30" 
                      : "bg-[#161616] border-white/5 hover:border-white/10"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div 
                      className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors shrink-0",
                        selectedTags.has(tag.name)
                          ? "bg-purple-600 border-purple-600"
                          : "border-neutral-600 hover:border-neutral-400"
                      )}
                      onClick={() => toggleSelect(tag.name)}
                    >
                      {selectedTags.has(tag.name) && <Check size={12} className="text-white" />}
                    </div>

                    {editingTag?.name === tag.name ? (
                      <input
                        type="text"
                        defaultValue={tag.name}
                        className="bg-black border border-neutral-700 rounded px-2 py-0.5 text-sm text-white focus:outline-none w-full"
                        autoFocus
                        onBlur={(e) => handleRename(tag.name, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(tag.name, e.currentTarget.value);
                          if (e.key === 'Escape') setEditingTag(null);
                        }}
                      />
                    ) : (
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                           <span className={cn("text-sm font-medium truncate", pinnedTags.includes(tag.name) ? "text-purple-300" : "text-neutral-200")} title={tag.name}>
                             {categoryLabels[tag.name] || tag.name}
                           </span>
                           {pinnedTags.includes(tag.name) && <Pin size={10} className="text-purple-400 shrink-0" fill="currentColor" />}
                        </div>
                        <span className="text-[10px] text-neutral-500">
                          {tag.count} {t.usage}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleTogglePin(tag.name)}
                      className={cn(
                        "p-1.5 rounded-md hover:bg-white/10 transition-colors",
                        pinnedTags.includes(tag.name) ? "text-purple-400 opacity-100" : "text-neutral-400 hover:text-white"
                      )}
                      title={pinnedTags.includes(tag.name) ? "Unpin" : "Pin to top"}
                    >
                      {pinnedTags.includes(tag.name) ? <PinOff size={14} /> : <Pin size={14} />}
                    </button>
                    <button 
                      onClick={() => setEditingTag({ name: tag.name })}
                      className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/10"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete([tag.name])}
                      className="p-1.5 rounded-md text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-2">
              <Search size={32} className="opacity-20" />
              <p className="text-sm">{t.noTags}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
