'use client';
import { useCallback, useEffect, useState } from 'react';

interface Option {
  id: string;
  type: string;
  value: string;
  label: string;
  ordre: number;
  actif: boolean;
}

const OPTION_TYPES = ['quartier', 'axe', 'pole', 'categorie_activite', 'statut_besoin', 'urgence'];

export default function OptionsAdminPage() {
  const [options, setOptions] = useState<Option[]>([]);
  const [selectedType, setSelectedType] = useState('quartier');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: 'quartier', value: '', label: '' });
  const [editId, setEditId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/options?type=${selectedType}`);
      const data = await res.json();
      if (data.success) setOptions(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    loadData();
  }, [selectedType, loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editId ? `/api/v1/options/${editId}` : '/api/v1/options';
    const method = editId ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, ...(editId ? {} : { type: form.type, value: form.value, label: form.label }) }),
    });
    
    if (res.ok) {
      setForm({ type: selectedType, value: '', label: '' });
      setEditId(null);
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette option ?')) return;
    await fetch(`/api/v1/options/${id}`, { method: 'DELETE' });
    loadData();
  };

  const handleEdit = (opt: Option) => {
    setEditId(opt.id);
    setForm({ type: opt.type, value: opt.value, label: opt.label });
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Gestion des Options</h1>
      <p className="text-gray-600 mb-6">Quartiers, axes, pôles, catégories, statuts et urgences</p>

      {/* Type selector */}
      <div className="mb-6">
        <label className="block text-sm font-bold text-gray-700 mb-2">Type d&apos;option</label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-xl"
        >
          {OPTION_TYPES.map(t => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow border border-gray-100 mb-6">
        <h3 className="text-lg font-black mb-4">{editId ? 'Modifier' : 'Nouvelle'} option ({selectedType})</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valeur</label>
            <input
              type="text"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-brand-green text-white font-bold rounded-xl hover:bg-green-700 transition-colors"
            >
              {editId ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </div>
      </form>

      {/* List */}
      <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-4 text-sm font-bold text-gray-700">Label</th>
              <th className="text-left p-4 text-sm font-bold text-gray-700">Valeur</th>
              <th className="text-left p-4 text-sm font-bold text-gray-700">Ordre</th>
              <th className="p-4 text-sm font-bold text-gray-700">Actif</th>
              <th className="p-4 text-sm font-bold text-gray-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {options.map((opt) => (
              <tr key={opt.id} className="border-t">
                <td className="p-4">{opt.label}</td>
                <td className="p-4 text-gray-500">{opt.value}</td>
                <td className="p-4">{opt.ordre}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    opt.actif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {opt.actif ? 'Oui' : 'Non'}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button
                    onClick={() => handleEdit(opt)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(opt.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
