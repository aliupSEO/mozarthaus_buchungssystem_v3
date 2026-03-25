import { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { APP_ID } from '../lib/constants';
import { Users, Plus, Trash2, X, AlertCircle } from 'lucide-react';

interface PartnerType {
  id: string;
  name: string;
  createdAt: string;
}

export function PartnerTypes() {
  const [types, setTypes] = useState<PartnerType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Data
  const loadTypes = async () => {
    try {
      setIsLoading(true);
      const querySnapshot = await getDocs(collection(db, `apps/${APP_ID}/partner_types`));
      const loadedTypes: PartnerType[] = [];
      querySnapshot.forEach((document) => {
        loadedTypes.push(document.data() as PartnerType);
      });
      // Sort by name
      loadedTypes.sort((a, b) => a.name.localeCompare(b.name));
      setTypes(loadedTypes);
    } catch (err: any) {
      console.error('Error loading partner types:', err);
      setError('Fehler beim Laden der Partner Typen.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTypes();
  }, []);

  // Slug Generator
  const generateSlugId = (name: string) => {
    return 'partner_type_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
  };

  // Save specific logic from User
  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    
    setIsSubmitting(true);
    setError(null);
    try {
      const typeName = newTypeName.trim();
      const slugId = generateSlugId(typeName);
      
      const docRef = doc(db, `apps/${APP_ID}/partner_types`, slugId);
      await setDoc(docRef, {
        id: slugId,
        name: typeName,
        createdAt: new Date().toISOString()
      });
      
      // Reset & Reload
      setNewTypeName('');
      setIsModalOpen(false);
      await loadTypes();
      
    } catch (err: any) {
      console.error('Error saving:', err);
      setError('Fehler beim Speichern des Partner Typs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Möchten Sie den Typ "${name}" wirklich löschen?`)) return;
    
    try {
      await deleteDoc(doc(db, `apps/${APP_ID}/partner_types`, id));
      await loadTypes();
    } catch (err: any) {
      console.error('Error deleting:', err);
      alert('Fehler beim Löschen aufgetreten.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-heading text-gray-900 font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-brand-primary" />
            Partner Typen
          </h1>
          <p className="text-gray-500 mt-1">Verwalten Sie hier die globalen Typ-Kategorien für Ihre B2B-Partner.</p>
        </div>
        <button 
          onClick={() => {
            setNewTypeName('');
            setError(null);
            setIsModalOpen(true);
          }}
          className="px-5 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Neuer Typ
        </button>
      </div>

      {/* Main Table Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 font-medium">Lade Partner Typen...</div>
        ) : types.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-medium bg-gray-50">
            Noch keine Partner Typen angelegt. Klicken Sie auf "Neuer Typ", um zu beginnen.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 font-bold text-gray-900">Name (Label)</th>
                  <th className="px-6 py-4 font-bold text-gray-900">Generierte System ID (Slug)</th>
                  <th className="px-6 py-4 font-bold text-gray-900 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {types.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{t.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500 bg-gray-50/50">{t.id}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(t.id, t.name)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">Neuen Partner Typ anlegen</h3>
                <button 
                  onClick={() => !isSubmitting && setIsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
             </div>
             
             <form onSubmit={handleSaveType} className="p-6">
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3 text-red-700 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Bezeichnung (für UI & Dokumente)</label>
                    <input 
                      type="text" 
                      value={newTypeName}
                      onChange={e => setNewTypeName(e.target.value)}
                      placeholder="z.B. Hotel, Agentur, Reseller..."
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none"
                      disabled={isSubmitting}
                      autoFocus
                      required
                    />
                    {newTypeName && (
                       <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                         Generierte ID: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{generateSlugId(newTypeName)}</span>
                       </p>
                    )}
                  </div>
                </div>
                
                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newTypeName.trim()}
                    className="flex-1 px-4 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {isSubmitting ? 'Speichert...' : 'Typ Anlegen'}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PartnerTypes;
