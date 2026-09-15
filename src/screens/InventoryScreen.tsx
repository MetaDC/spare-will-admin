import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Upload, Trash2, Package } from 'lucide-react';
import { useAdmin } from '../App';
import { SparePart } from '../types';
import { subscribeToInventory, addSparePart, batchAddSpareParts, deleteSparePart, updateSparePart } from '../services/adminService';
import * as XLSX from 'xlsx';

export default function InventoryScreen() {
  const { showToast } = useAdmin();
  const [parts, setParts] = useState<SparePart[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  
  const [skippedParts, setSkippedParts] = useState<Omit<SparePart, 'id' | 'createdAt'>[]>([]);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const emptyForm = {
    name: '', partNumber: '', brand: '', price: '', stock: '', category: '', compatibleVehicles: '',
    oemPartNumber: '', costPrice: '', subcategory: '', vehicleMake: '', vehicleModel: '', yearFrom: '',
    yearTo: '', position: '', partType: '', hsnCode: '', gstRate: '', unit: '', supplier: '',
    rackBin: '', reorderLevel: '', warranty: '', condition: '', description: '', imageUrl: '', status: ''
  };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    const unsub = subscribeToInventory(
      (data) => { setParts(data); setLoading(false); },
      (err) => { showToast('Error loading inventory', 'error'); setLoading(false); }
    );
    return () => unsub();
  }, [showToast]);

  const filtered = parts.filter(p => {
    const q = search.toLowerCase();
    return !q ||
      p.name.toLowerCase().includes(q) ||
      p.partNumber.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q));
  });

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.partNumber) {
      showToast('Name and Part Number are required', 'error');
      return;
    }

    const partData: any = { name: formData.name, partNumber: formData.partNumber };
    if (formData.brand) partData.brand = formData.brand;
    if (formData.price) partData.price = Number(formData.price);
    if (formData.stock) partData.stock = Number(formData.stock);
    if (formData.category) partData.category = formData.category;
    if (formData.compatibleVehicles) partData.compatibleVehicles = formData.compatibleVehicles;
    if (formData.oemPartNumber) partData.oemPartNumber = formData.oemPartNumber;
    if (formData.costPrice) partData.costPrice = Number(formData.costPrice);
    if (formData.subcategory) partData.subcategory = formData.subcategory;
    if (formData.vehicleMake) partData.vehicleMake = formData.vehicleMake;
    if (formData.vehicleModel) partData.vehicleModel = formData.vehicleModel;
    if (formData.yearFrom) partData.yearFrom = Number(formData.yearFrom);
    if (formData.yearTo) partData.yearTo = Number(formData.yearTo);
    if (formData.position) partData.position = formData.position;
    if (formData.partType) partData.partType = formData.partType;
    if (formData.hsnCode) partData.hsnCode = formData.hsnCode;
    if (formData.gstRate) partData.gstRate = Number(formData.gstRate);
    if (formData.unit) partData.unit = formData.unit;
    if (formData.supplier) partData.supplier = formData.supplier;
    if (formData.rackBin) partData.rackBin = formData.rackBin;
    if (formData.reorderLevel) partData.reorderLevel = Number(formData.reorderLevel);
    if (formData.warranty) partData.warranty = formData.warranty;
    if (formData.condition) partData.condition = formData.condition;
    if (formData.description) partData.description = formData.description;
    if (formData.imageUrl) partData.imageUrl = formData.imageUrl;
    if (formData.status) partData.status = formData.status;

    const isDuplicate = parts.some(p => p.partNumber.toLowerCase() === formData.partNumber.toLowerCase() && p.id !== editingPartId);
    if (isDuplicate) {
      if (!window.confirm(`A part with Part Number "${formData.partNumber}" already exists. Do you want to add this duplicate anyway?`)) {
        return;
      }
    }

    setIsAdding(true);
    try {
      if (editingPartId) {
        await updateSparePart(editingPartId, partData);
        showToast('Part updated successfully!', 'success');
      } else {
        await addSparePart(partData);
        showToast('Part added successfully!', 'success');
      }
      setShowAddModal(false);
      setFormData(emptyForm);
      setEditingPartId(null);
    } catch (err) {
      console.error(err);
      showToast(editingPartId ? 'Failed to update part' : 'Failed to add part', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditClick = (part: SparePart) => {
    setEditingPartId(part.id);
    setFormData({
      name: part.name || '',
      partNumber: part.partNumber || '',
      brand: part.brand || '',
      price: part.price !== undefined ? String(part.price) : '',
      stock: part.stock !== undefined ? String(part.stock) : '',
      category: part.category || '',
      compatibleVehicles: part.compatibleVehicles || '',
      oemPartNumber: part.oemPartNumber || '',
      costPrice: part.costPrice !== undefined ? String(part.costPrice) : '',
      subcategory: part.subcategory || '',
      vehicleMake: part.vehicleMake || '',
      vehicleModel: part.vehicleModel || '',
      yearFrom: part.yearFrom !== undefined ? String(part.yearFrom) : '',
      yearTo: part.yearTo !== undefined ? String(part.yearTo) : '',
      position: part.position || '',
      partType: part.partType || '',
      hsnCode: part.hsnCode || '',
      gstRate: part.gstRate !== undefined ? String(part.gstRate) : '',
      unit: part.unit || '',
      supplier: part.supplier || '',
      rackBin: part.rackBin || '',
      reorderLevel: part.reorderLevel !== undefined ? String(part.reorderLevel) : '',
      warranty: part.warranty || '',
      condition: part.condition || '',
      description: part.description || '',
      imageUrl: part.imageUrl || '',
      status: part.status || ''
    });
    setShowAddModal(true);
  };

  const handleEditDuplicate = (part: Omit<SparePart, 'id' | 'createdAt'>, index: number) => {
    setEditingPartId(null);
    setFormData({
      name: part.name || '',
      partNumber: part.partNumber || '',
      brand: part.brand || '',
      price: part.price !== undefined ? String(part.price) : '',
      stock: part.stock !== undefined ? String(part.stock) : '',
      category: part.category || '',
      compatibleVehicles: part.compatibleVehicles || '',
      oemPartNumber: part.oemPartNumber || '',
      costPrice: part.costPrice !== undefined ? String(part.costPrice) : '',
      subcategory: part.subcategory || '',
      vehicleMake: part.vehicleMake || '',
      vehicleModel: part.vehicleModel || '',
      yearFrom: part.yearFrom !== undefined ? String(part.yearFrom) : '',
      yearTo: part.yearTo !== undefined ? String(part.yearTo) : '',
      position: part.position || '',
      partType: part.partType || '',
      hsnCode: part.hsnCode || '',
      gstRate: part.gstRate !== undefined ? String(part.gstRate) : '',
      unit: part.unit || '',
      supplier: part.supplier || '',
      rackBin: part.rackBin || '',
      reorderLevel: part.reorderLevel !== undefined ? String(part.reorderLevel) : '',
      warranty: part.warranty || '',
      condition: part.condition || '',
      description: part.description || '',
      imageUrl: part.imageUrl || '',
      status: part.status || ''
    });
    setShowAddModal(true);
    setSkippedParts(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      setIsUploading(true);
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const newParts: Omit<SparePart, 'id' | 'createdAt'>[] = data.map((row: any) => {
          const p: any = {};
          p.name = row.name || row.Name || 'Unknown Part';
          p.partNumber = String(row.partNumber || row['Part Number'] || row.part_number || '');
          
          if (row.brand || row.Brand) p.brand = String(row.brand || row.Brand);
          if (row.price || row.Price) p.price = Number(row.price || row.Price);
          if (row.stock || row.Stock) p.stock = Number(row.stock || row.Stock);
          if (row.category || row.Category) p.category = String(row.category || row.Category);
          if (row.compatibleVehicles || row['Compatible Vehicles'] || row.vehicles) p.compatibleVehicles = String(row.compatibleVehicles || row['Compatible Vehicles'] || row.vehicles);
          if (row.oemPartNumber || row['OEM Part Number']) p.oemPartNumber = String(row.oemPartNumber || row['OEM Part Number']);
          if (row.costPrice || row['Cost Price']) p.costPrice = Number(row.costPrice || row['Cost Price']);
          if (row.subcategory || row.Subcategory) p.subcategory = String(row.subcategory || row.Subcategory);
          if (row.vehicleMake || row['Vehicle Make']) p.vehicleMake = String(row.vehicleMake || row['Vehicle Make']);
          if (row.vehicleModel || row['Vehicle Model']) p.vehicleModel = String(row.vehicleModel || row['Vehicle Model']);
          if (row.yearFrom || row['Year From']) p.yearFrom = Number(row.yearFrom || row['Year From']);
          if (row.yearTo || row['Year To']) p.yearTo = Number(row.yearTo || row['Year To']);
          if (row.position || row.Position) p.position = String(row.position || row.Position);
          if (row.partType || row['Part Type']) p.partType = String(row.partType || row['Part Type']);
          if (row.hsnCode || row['HSN Code']) p.hsnCode = String(row.hsnCode || row['HSN Code']);
          if (row.gstRate || row['GST Rate']) p.gstRate = Number(row.gstRate || row['GST Rate']);
          if (row.unit || row.Unit) p.unit = String(row.unit || row.Unit);
          if (row.supplier || row.Supplier) p.supplier = String(row.supplier || row.Supplier);
          if (row.rackBin || row['Rack/Bin'] || row['Rack / Bin']) p.rackBin = String(row.rackBin || row['Rack/Bin'] || row['Rack / Bin']);
          if (row.reorderLevel || row['Reorder Level']) p.reorderLevel = Number(row.reorderLevel || row['Reorder Level']);
          if (row.warranty || row.Warranty) p.warranty = String(row.warranty || row.Warranty);
          if (row.condition || row.Condition) p.condition = String(row.condition || row.Condition);
          if (row.description || row.Description) p.description = String(row.description || row.Description);
          if (row.imageUrl || row['Image URL']) p.imageUrl = String(row.imageUrl || row['Image URL']);
          if (row.status || row.Status) p.status = String(row.status || row.Status);
          
          return p;
        }).filter(p => p.name && p.partNumber && p.partNumber !== 'undefined');

        if (newParts.length === 0) {
          showToast('No valid parts found in the file. Check column names.', 'error');
          return;
        }

        const validParts: Omit<SparePart, 'id' | 'createdAt'>[] = [];
        const duplicates: Omit<SparePart, 'id' | 'createdAt'>[] = [];
        
        newParts.forEach(p => {
          if (parts.some(existing => existing.partNumber.toLowerCase() === p.partNumber.toLowerCase())) {
            duplicates.push(p);
          } else {
            validParts.push(p);
          }
        });

        if (validParts.length > 0) {
          await batchAddSpareParts(validParts);
        }
        
        if (duplicates.length > 0) {
          setSkippedParts(duplicates);
          showToast(`Imported ${validParts.length} parts. Skipped ${duplicates.length} duplicates.`, 'info');
        } else {
          showToast(`Successfully imported ${validParts.length} parts!`, 'success');
        }
      } catch (err) {
        console.error(err);
        showToast('Error reading Excel file', 'error');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    setDeletingId(id);
    try {
      await deleteSparePart(id);
      showToast('Part deleted', 'info');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete part', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="px-5 pt-5 pb-24 max-w-6xl mx-auto bg-[var(--bg)]">
      {/* Header */}
      <div className="flex lg:hidden items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Spare Will" className="h-6 w-auto" />
          <span className="font-bold text-[var(--dark)] text-lg tracking-tight">Spare Will</span>
        </div>

      </div>

      {/* Title */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--dark)] tracking-tight">Inventory</h1>
          <p className="text-[#64748b] text-[13px] mt-0.5">Manage spare parts catalog.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditingPartId(null); setFormData(emptyForm); setShowAddModal(true); }} className="w-10 h-10 flex items-center justify-center bg-[var(--orange)] text-white rounded-full shadow-md hover:bg-[var(--orange-dark)] transition-colors tap-scale">
            <Plus className="w-5 h-5" />
          </button>
          <button onClick={() => setShowImportModal(true)} disabled={isUploading} className="w-10 h-10 flex items-center justify-center bg-white text-[var(--dark)] border border-[var(--border)] rounded-full shadow-sm hover:bg-gray-50 transition-colors tap-scale disabled:opacity-70">
            {isUploading ? <div className="w-4 h-4 border-2 border-[var(--dark)] border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4.5 h-4.5" />}
          </button>
          <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, part number, brand..."
          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[var(--border)] bg-white text-[13px] text-[var(--dark)] focus:outline-none focus:ring-2 focus:ring-[var(--orange)] focus:border-transparent transition-all shadow-sm"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[var(--border)] py-16 text-center shadow-sm">
          <Package className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-semibold text-[var(--dark)] text-sm">{search ? 'No matching parts found' : 'No spare parts in inventory'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(part => (
            <div key={part.id} onClick={() => handleEditClick(part)} className="bg-white rounded-3xl border border-[var(--border)] p-4 shadow-sm flex items-center gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors">
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-bold text-[14px] text-[var(--dark)] truncate pr-2">{part.name}</h3>
                  <span className="font-bold text-green-600 text-[14px] shrink-0">
                    {part.price !== undefined ? `₹${part.price}` : 'Price N/A'}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-[11px] text-[#64748b]">
                  <span className="font-medium bg-gray-100 px-2 py-0.5 rounded-md">{part.partNumber}</span>
                  <span className="truncate">{part.brand}</span>
                  <span className={`font-semibold ml-auto ${(part.stock || 0) > 5 ? 'text-blue-600' : 'text-red-500'}`}>
                    {part.stock !== undefined ? `${part.stock} in stock` : 'Stock N/A'}
                  </span>
                </div>
              </div>
              
              <button 
                onClick={(e) => { e.stopPropagation(); handleDelete(part.id, part.name); }} 
                disabled={deletingId === part.id}
                className="w-8 h-8 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0 tap-scale disabled:opacity-50"
              >
                {deletingId === part.id ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white w-full max-w-sm m-auto rounded-3xl p-6 shadow-2xl animate-fade-in flex flex-col max-h-full">
            <h2 className="text-xl font-bold text-[var(--dark)] mb-5 shrink-0">{editingPartId ? 'Edit Spare Part' : 'Add Spare Part'}</h2>
            <form onSubmit={handleManualAdd} className="flex flex-col flex-1 min-h-0">
              <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-2 pb-2">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Part Name *</label>
                  <input required value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="Front Brake Pads" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Part # *</label>
                  <input required value={formData.partNumber} onChange={e => setFormData(p => ({...p, partNumber: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="OEM-123" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">OEM Part #</label>
                  <input value={formData.oemPartNumber} onChange={e => setFormData(p => ({...p, oemPartNumber: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="12345-67890" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Brand</label>
                  <input value={formData.brand} onChange={e => setFormData(p => ({...p, brand: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="Bosch" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Price (₹)</label>
                  <input type="number" min="0" value={formData.price} onChange={e => setFormData(p => ({...p, price: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="2500" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Cost Price (₹)</label>
                  <input type="number" min="0" value={formData.costPrice} onChange={e => setFormData(p => ({...p, costPrice: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="1800" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Stock</label>
                  <input type="number" min="0" value={formData.stock} onChange={e => setFormData(p => ({...p, stock: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="10" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Category</label>
                  <input value={formData.category} onChange={e => setFormData(p => ({...p, category: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="Brakes" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Subcategory</label>
                  <input value={formData.subcategory} onChange={e => setFormData(p => ({...p, subcategory: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="Pads" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Compatible Vehicles</label>
                  <input value={formData.compatibleVehicles} onChange={e => setFormData(p => ({...p, compatibleVehicles: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="Toyota Corolla 2018-2022" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Vehicle Make</label>
                  <input value={formData.vehicleMake} onChange={e => setFormData(p => ({...p, vehicleMake: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="Toyota" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Vehicle Model</label>
                  <input value={formData.vehicleModel} onChange={e => setFormData(p => ({...p, vehicleModel: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="Corolla" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Year From</label>
                  <input type="number" value={formData.yearFrom} onChange={e => setFormData(p => ({...p, yearFrom: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="2018" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Year To</label>
                  <input type="number" value={formData.yearTo} onChange={e => setFormData(p => ({...p, yearTo: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="2022" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Position</label>
                  <input value={formData.position} onChange={e => setFormData(p => ({...p, position: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="Front" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Part Type</label>
                  <input value={formData.partType} onChange={e => setFormData(p => ({...p, partType: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="Consumable" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">HSN Code</label>
                  <input value={formData.hsnCode} onChange={e => setFormData(p => ({...p, hsnCode: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="8708" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">GST Rate (%)</label>
                  <input type="number" value={formData.gstRate} onChange={e => setFormData(p => ({...p, gstRate: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="28" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Unit</label>
                  <input value={formData.unit} onChange={e => setFormData(p => ({...p, unit: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="Set" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Supplier</label>
                  <input value={formData.supplier} onChange={e => setFormData(p => ({...p, supplier: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="ABC Autoparts" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Rack/Bin</label>
                  <input value={formData.rackBin} onChange={e => setFormData(p => ({...p, rackBin: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="A1-05" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Reorder Level</label>
                  <input type="number" value={formData.reorderLevel} onChange={e => setFormData(p => ({...p, reorderLevel: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="5" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Warranty</label>
                  <input value={formData.warranty} onChange={e => setFormData(p => ({...p, warranty: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="6 Months" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Condition</label>
                  <input value={formData.condition} onChange={e => setFormData(p => ({...p, condition: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="New" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Description</label>
                  <textarea rows={2} value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)] resize-none" placeholder="High performance brake pads..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Image URL</label>
                  <input value={formData.imageUrl} onChange={e => setFormData(p => ({...p, imageUrl: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="https://example.com/image.jpg" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[#64748b] mb-1 uppercase tracking-wide">Status</label>
                  <input value={formData.status} onChange={e => setFormData(p => ({...p, status: e.target.value}))} className="w-full px-3 py-2.5 bg-gray-50 border border-[var(--border)] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[var(--orange)]" placeholder="Active" />
                </div>
              </div>

              <div className="pt-4 flex gap-3 shrink-0 border-t border-gray-100 mt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-[#64748b] font-bold text-[13px] hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={isAdding} className="flex-1 flex items-center justify-center py-3 bg-[var(--orange)] hover:bg-[var(--orange-dark)] text-white font-bold text-[13px] rounded-xl transition-colors shadow-sm disabled:opacity-70">
                  {isAdding ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (editingPartId ? 'Update Part' : 'Save Part')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Import Instructions Modal */}
      {showImportModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />
          <div className="relative bg-white w-full max-w-md m-auto rounded-3xl p-6 shadow-2xl animate-fade-in flex flex-col max-h-full">
            <h2 className="text-xl font-bold text-[var(--dark)] mb-3 shrink-0">Import Data</h2>
            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto text-[13px] text-[#64748b] space-y-3 pr-2">
              <p>Upload an Excel (.xlsx, .xls) or CSV file with the following column headers:</p>
              
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <h3 className="font-bold text-[var(--dark)] mb-1">Required Columns:</h3>
                <p>Name, Part Number</p>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <h3 className="font-bold text-[var(--dark)] mb-1">Optional Columns (Examples):</h3>
                <p>Brand, Price, Stock, Category, OEM Part Number, Vehicle Make, Vehicle Model, Year From, Year To, Condition, Warranty, Description, Image URL, etc.</p>
              </div>
              <p className="italic text-[11px] mt-2">Note: Any extra columns will be ignored. Empty fields will be skipped.</p>
            </div>
            <div className="pt-4 flex gap-3 shrink-0 border-t border-gray-100 mt-2">
              <button type="button" onClick={() => setShowImportModal(false)} className="flex-1 py-3 text-[#64748b] font-bold text-[13px] hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
              <button type="button" onClick={() => { setShowImportModal(false); fileInputRef.current?.click(); }} className="flex-1 py-3 bg-[var(--orange)] hover:bg-[var(--orange-dark)] text-white font-bold text-[13px] rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" /> Select File
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Skipped Duplicates Modal */}
      {skippedParts.length > 0 && createPortal(
        <div className="fixed inset-0 z-[9999] flex p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSkippedParts([])} />
          <div className="relative bg-white w-full max-w-lg m-auto rounded-3xl p-6 shadow-2xl animate-fade-in flex flex-col max-h-full">
            <h2 className="text-xl font-bold text-[var(--dark)] mb-1 shrink-0">Skipped Duplicates</h2>
            <p className="text-[#64748b] text-[13px] mb-4 shrink-0">The following parts already exist in your inventory. You can edit them to bypass and add anyway.</p>
            
            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto space-y-2 pr-2">
              {skippedParts.map((part, index) => (
                <div key={index} className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-[13px] text-[var(--dark)] truncate">{part.name}</p>
                    <p className="text-[11px] text-[#64748b] truncate">PN: {part.partNumber}</p>
                  </div>
                  <button onClick={() => handleEditDuplicate(part, index)} className="shrink-0 px-3 py-1.5 bg-white border border-[var(--border)] text-[var(--dark)] font-bold text-[11px] rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                    Edit & Add
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-4 mt-2 shrink-0 border-t border-gray-100">
              <button type="button" onClick={() => setSkippedParts([])} className="w-full py-3 bg-[var(--orange)] hover:bg-[var(--orange-dark)] text-white font-bold text-[13px] rounded-xl transition-colors shadow-sm">
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
