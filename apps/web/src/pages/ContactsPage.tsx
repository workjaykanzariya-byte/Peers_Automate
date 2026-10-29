import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  Users,
  Search,
  Plus,
  Upload,
  Download,
  Tag,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Trash2,
  Filter,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  FileText,
} from 'lucide-react';

interface Contact {
  id: string;
  phone: string;
  countryCode?: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  leadStatus: string;
  optInStatus: string;
  tags: { tag: { id: string; name: string; color: string } }[];
  createdAt: string;
}

interface ImportJob {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  createdAt: string;
}

export const ContactsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);

  // New Contact Form
  const [newPhone, setNewPhone] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newCountryCode, setNewCountryCode] = useState('IN');

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; rows: any[]; totalRows: number } | null>(null);
  const [phoneColumn, setPhoneColumn] = useState('');
  const [nameColumn, setNameColumn] = useState('');
  const [emailColumn, setEmailColumn] = useState('');
  const [companyColumn, setCompanyColumn] = useState('');
  const [duplicatePolicy, setDuplicatePolicy] = useState<'SKIP' | 'OVERWRITE' | 'MERGE_TAGS'>('SKIP');
  const [importTag, setImportTag] = useState('CSV Import');

  // Contacts List Query
  const { data: contactsData, isLoading: isLoadingContacts } = useQuery<{
    data: Contact[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: ['contacts', search, selectedTag, page],
    queryFn: () =>
      api.get(
        `/contacts?page=${page}&limit=15&search=${encodeURIComponent(search)}${
          selectedTag ? `&tag=${encodeURIComponent(selectedTag)}` : ''
        }`,
      ),
  });

  // Import History Query
  const { data: importHistory = [] } = useQuery<ImportJob[]>({
    queryKey: ['import-history'],
    queryFn: () => api.get('/contacts/imports/history'),
  });

  // Create Contact Mutation
  const createContactMutation = useMutation({
    mutationFn: (data: any) => api.post('/contacts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setIsAddModalOpen(false);
      resetNewContactForm();
    },
    onError: (err: any) => alert(err.message || 'Failed to create contact'),
  });

  // Bulk Tag Mutation
  const bulkActionMutation = useMutation({
    mutationFn: (data: any) => api.post('/contacts/bulk', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setSelectedContacts([]);
      alert('Bulk action executed successfully');
    },
  });

  const resetNewContactForm = () => {
    setNewPhone('');
    setNewFirstName('');
    setNewLastName('');
    setNewEmail('');
    setNewCompany('');
  };

  // CSV Upload & Preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1, 6).map((line) => {
          const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
          const rowObj: Record<string, string> = {};
          headers.forEach((h, i) => {
            rowObj[h] = vals[i] || '';
          });
          return rowObj;
        });
        setCsvPreview({ headers, rows, totalRows: lines.length - 1 });

        // Auto-detect columns
        const lowerHeaders = headers.map((h) => h.toLowerCase());
        const phoneIdx = lowerHeaders.findIndex((h) => h.includes('phone') || h.includes('mobile') || h.includes('number'));
        if (phoneIdx !== -1) setPhoneColumn(headers[phoneIdx]);

        const nameIdx = lowerHeaders.findIndex((h) => h.includes('name') || h.includes('first'));
        if (nameIdx !== -1) setNameColumn(headers[nameIdx]);

        const emailIdx = lowerHeaders.findIndex((h) => h.includes('email') || h.includes('mail'));
        if (emailIdx !== -1) setEmailColumn(headers[emailIdx]);

        const compIdx = lowerHeaders.findIndex((h) => h.includes('company') || h.includes('org'));
        if (compIdx !== -1) setCompanyColumn(headers[compIdx]);

        setImportStep(2);
      }
    };
    reader.readAsText(file);
  };

  // Submit Async Import
  const startImportMutation = useMutation({
    mutationFn: async () => {
      if (!csvFile || !phoneColumn) return;
      const reader = new FileReader();
      const contentPromise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(csvFile);
      });
      const fileContent = await contentPromise;

      return api.post('/contacts/import', {
        fileName: csvFile.name,
        csvContent: fileContent,
        mapping: {
          phoneColumn,
          nameColumn: nameColumn || undefined,
          emailColumn: emailColumn || undefined,
          companyColumn: companyColumn || undefined,
        },
        duplicateStrategy: duplicatePolicy,
        tags: importTag ? [importTag] : [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['import-history'] });
      setIsImportModalOpen(false);
      setCsvFile(null);
      setCsvPreview(null);
      setImportStep(1);
      alert('Import queued successfully in background!');
    },
    onError: (err: any) => alert(err.message || 'Import failed to start'),
  });

  const toggleSelectAll = () => {
    if (selectedContacts.length === (contactsData?.data?.length || 0)) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contactsData?.data?.map((c) => c.id) || []);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Contact Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your audience, international WhatsApp phone records, tags, and asynchronous CSV imports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Import CSV
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone (+E.164), email, or company..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Bulk Action Controls */}
        {selectedContacts.length > 0 && (
          <div className="flex items-center gap-2 text-xs bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">{selectedContacts.length} selected</span>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
            <button
              onClick={() => {
                const tag = prompt('Enter tag name to add to selected contacts:');
                if (tag) {
                  bulkActionMutation.mutate({
                    contactIds: selectedContacts,
                    action: 'ADD_TAG',
                    tag,
                  });
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold border border-slate-200 dark:border-transparent text-xs"
            >
              Add Tag
            </button>
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${selectedContacts.length} contacts?`)) {
                  bulkActionMutation.mutate({
                    contactIds: selectedContacts,
                    action: 'DELETE',
                  });
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/30 text-rose-600 dark:text-rose-400 font-semibold border border-rose-200 dark:border-transparent text-xs"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Contacts Table */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50/90 dark:bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold">
              <tr>
                <th className="py-3.5 px-4 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                    {Array.isArray(contactsData?.data) && selectedContacts.length === contactsData.data.length && contactsData.data.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4 font-bold">Contact / Phone</th>
                <th className="py-3.5 px-4 font-bold">Company / Email</th>
                <th className="py-3.5 px-4 font-bold">Tags</th>
                <th className="py-3.5 px-4 font-bold">Lead Status</th>
                <th className="py-3.5 px-4 font-bold">Consent</th>
                <th className="py-3.5 px-4 font-bold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/60">
              {isLoadingContacts ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto mb-2" />
                    Loading contacts directory...
                  </td>
                </tr>
              ) : (!contactsData?.data || !Array.isArray(contactsData.data) || contactsData.data.length === 0) ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No contacts found matching your criteria.
                  </td>
                </tr>
              ) : (
                contactsData.data.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => toggleSelectOne(contact.id)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      >
                        {selectedContacts.includes(contact.id) ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {contact.firstName || contact.lastName
                          ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
                          : 'Unnamed'}
                      </div>
                      <div className="font-mono text-emerald-700 dark:text-emerald-400 text-[11px] flex items-center gap-1.5 font-semibold">
                        {contact.phone}
                        {contact.countryCode && (
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-sans border border-slate-200 dark:border-slate-700">
                            {contact.countryCode}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">{contact.companyName || '—'}</div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px]">{contact.email || '—'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags?.length > 0 ? (
                          contact.tags.map((t) => (
                            <span
                              key={t.tag.id}
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              {t.tag.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {contact.leadStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          contact.optInStatus === 'OPTED_IN'
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                            : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                        }`}
                      >
                        {contact.optInStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(contact.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {contactsData && contactsData.meta.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div>
              Showing page <span className="font-semibold text-slate-800 dark:text-slate-200">{contactsData.meta.page}</span> of{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{contactsData.meta.totalPages}</span> (
              {contactsData.meta.total} total contacts)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition border border-slate-200 dark:border-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= contactsData.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition border border-slate-200 dark:border-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CSV Import History Section */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Recent Async Import Jobs ({importHistory.length})
        </h3>

        {importHistory.length === 0 ? (
          <p className="text-xs text-slate-400">No background imports recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold">
                <tr>
                  <th className="py-2.5 px-3">File Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Processed</th>
                  <th className="py-2.5 px-3">Successful</th>
                  <th className="py-2.5 px-3">Failed</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/40">
                {importHistory.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{job.fileName}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        {job.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{job.processedRows} / {job.totalRows}</td>
                    <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold">{job.successRows}</td>
                    <td className="py-2.5 px-3 text-rose-600 dark:text-rose-400 font-bold">{job.failedRows}</td>
                    <td className="py-2.5 px-3 text-slate-500">{new Date(job.createdAt).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right">
                      {job.failedRows > 0 && (
                        <a
                          href={`/api/v1/contacts/imports/${job.id}/error-report`}
                          download
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30"
                        >
                          <Download className="w-3 h-3" />
                          Error Report
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Single Contact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Add New Contact
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                International numbers are validated and stored in E.164 format.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createContactMutation.mutate({
                  phone: newPhone,
                  firstName: newFirstName,
                  lastName: newLastName,
                  email: newEmail || undefined,
                  companyName: newCompany || undefined,
                  defaultCountry: newCountryCode,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number (E.164 or Local) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="IN"
                    value={newCountryCode}
                    onChange={(e) => setNewCountryCode(e.target.value.toUpperCase())}
                    className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 text-center uppercase"
                  />
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 43210 or 9876543210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">First Name</label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Company</label>
                <input
                  type="text"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createContactMutation.isPending}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                >
                  {createContactMutation.isPending ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-step CSV Import Wizard Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Async CSV Contact Import Wizard
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Step {importStep} of 3</p>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportStep(1);
                  setCsvFile(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Step 1: File Upload */}
            {importStep === 1 && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 rounded-2xl p-8 text-center transition bg-slate-50/50 dark:bg-slate-950/40">
                  <FileSpreadsheet className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Upload Contacts CSV</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
                    Supports large CSV files. Formulas are sanitized to prevent CSV Injection (OWASP DDE).
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm transition">
                    <Upload className="w-4 h-4" />
                    Browse File
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Step 2: Column Mapping */}
            {importStep === 2 && csvPreview && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-400">
                  Loaded {csvPreview.totalRows} rows from <span className="font-bold">{csvFile?.name}</span>.
                  Map your CSV column headers to DOOT contact fields below.
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number Column *
                    </label>
                    <select
                      value={phoneColumn}
                      onChange={(e) => setPhoneColumn(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Select column...</option>
                      {csvPreview.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Name Column
                    </label>
                    <select
                      value={nameColumn}
                      onChange={(e) => setNameColumn(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                    >
                      <option value="">(Optional) Select column...</option>
                      {csvPreview.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Email Column
                    </label>
                    <select
                      value={emailColumn}
                      onChange={(e) => setEmailColumn(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                    >
                      <option value="">(Optional) Select column...</option>
                      {csvPreview.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Company Column
                    </label>
                    <select
                      value={companyColumn}
                      onChange={(e) => setCompanyColumn(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                    >
                      <option value="">(Optional) Select column...</option>
                      {csvPreview.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setImportStep(1)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Back
                  </button>
                  <button
                    disabled={!phoneColumn}
                    onClick={() => setImportStep(3)}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition shadow-sm"
                  >
                    Next: Strategy & Tags
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Strategy & Review */}
            {importStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Duplicate Phone Number Strategy
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'SKIP', title: 'Skip Duplicates', desc: 'Preserve existing contact record unchanged' },
                      { id: 'OVERWRITE', title: 'Overwrite', desc: 'Replace contact fields with CSV data' },
                      { id: 'MERGE_TAGS', title: 'Merge Tags', desc: 'Keep record and append new tags' },
                    ].map((opt) => (
                      <div
                        key={opt.id}
                        onClick={() => setDuplicatePolicy(opt.id as any)}
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          duplicatePolicy === opt.id
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-white font-semibold'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-bold text-xs">{opt.title}</div>
                        <div className="text-[10px] mt-1 text-slate-500 dark:text-slate-500">{opt.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assign Tag to Imported Contacts
                  </label>
                  <input
                    type="text"
                    value={importTag}
                    onChange={(e) => setImportTag(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setImportStep(2)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => startImportMutation.mutate()}
                    disabled={startImportMutation.isPending}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
                  >
                    {startImportMutation.isPending ? 'Starting...' : 'Launch Background Import'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
