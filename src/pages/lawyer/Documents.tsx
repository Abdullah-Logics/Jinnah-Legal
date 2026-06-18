import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Search, Download, Share2, Trash2, Upload } from 'lucide-react';

export default function LawyerDocuments() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Document Drafting</h1>
          <p className="text-slate-500">AI-powered document creation and management</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition">
          <Plus size={20} />
          <span>New Document</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center hover:border-emerald-400 transition-colors cursor-pointer">
          <Upload size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-lg font-medium text-slate-700 mb-1">Drop files here or click to upload</p>
          <p className="text-sm text-slate-400">Supports PDF, DOCX, and TXT files</p>
          <button className="mt-4 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition">
            Upload Documents
          </button>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-100 text-sm font-medium text-slate-500">
          <div className="col-span-5">Name</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-1">Size</div>
          <div className="col-span-2">Actions</div>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="text-center py-16 text-slate-400">
            <FileText size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium text-slate-500">No documents uploaded yet</p>
            <p className="text-sm text-slate-400 mt-1">Upload your first document to get started.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
