import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SearchInput } from './common/SearchInput';
import { Modal } from './common/Modal';
import { Pagination, PaginationControls } from './common/Pagination';

const API_URL = 'http://localhost:5000/api';

function Clients({ userRole = 'user' }) {
  const canModify = userRole === 'admin' || userRole === 'manager';
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [sortColumn, setSortColumn] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    nationality: '',
    notes: '',
    cpf: '',
    birth_date: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API_URL}/clients`);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      alert('Error loading clients');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await axios.put(`${API_URL}/clients/${editingClient.id}`, formData);
      } else {
        await axios.post(`${API_URL}/clients`, formData);
      }
      fetchClients();
      resetForm();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Error saving client');
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      nationality: client.nationality || '',
      notes: client.notes || '',
      cpf: client.cpf || '',
      birth_date: client.birth_date || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await axios.delete(`${API_URL}/clients/${id}`);
        fetchClients();
      } catch (error) {
        console.error('Error deleting client:', error);
        alert('Error deleting client');
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', nationality: '', notes: '', cpf: '', birth_date: '' });
    setEditingClient(null);
    setShowForm(false);
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedClients = () => {
    let filtered = clients;

    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.nationality?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (!sortColumn) return filtered;

    return [...filtered].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (sortColumn === 'id') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (aVal === '' || aVal === null) aVal = '';
      if (bVal === '' || bVal === null) bVal = '';

      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getSortIcon = (column) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward';
  };

  const sortedClients = getSortedClients();
  const totalPages = Math.ceil(sortedClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClients = sortedClients.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Clients</h1>
        {canModify && (
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => { resetForm(); setShowForm(true); }}
          >
            <span className="material-icons text-lg">add</span>
            <span>New Client</span>
          </button>
        )}
      </div>

      <SearchInput
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search clients..."
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        startIndex={startIndex}
        endIndex={endIndex}
        total={sortedClients.length}
        itemsPerPage={itemsPerPage}
        itemName="clients"
      />

      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingClient ? 'Edit Client' : 'New Client'}
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="input-base"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-base"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-base"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Nationality</label>
              <input
                type="text"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                className="input-base"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">CPF</label>
              <input
                type="text"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                className="input-base"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Birth Date</label>
              <input
                type="text"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                placeholder="YYYY-MM-DD"
                className="input-base"
              />
            </div>
            <div className="flex flex-col col-span-1 md:col-span-2 lg:col-span-3">
              <label className="mb-1 text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="3"
                className="input-base resize-none"
              />
            </div>
          </div>
          {canModify && (
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save
              </button>
            </div>
          )}
        </form>
      </Modal>

      <div className="table-container -mx-4 md:mx-0">
        <table className="w-full min-w-[800px]">
          <thead className="table-header">
            <tr>
              <th className="table-header-cell" onClick={() => handleSort('id')}>
                <div className="flex items-center gap-1">
                  ID
                  {getSortIcon('id') && <span className="material-icons text-sm">{getSortIcon('id')}</span>}
                </div>
              </th>
              <th className="table-header-cell" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">
                  Name
                  {getSortIcon('name') && <span className="material-icons text-sm">{getSortIcon('name')}</span>}
                </div>
              </th>
              <th className="table-header-cell" onClick={() => handleSort('nationality')}>
                <div className="flex items-center gap-1">
                  Nationality
                  {getSortIcon('nationality') && <span className="material-icons text-sm">{getSortIcon('nationality')}</span>}
                </div>
              </th>
              <th className="table-header-cell" onClick={() => handleSort('email')}>
                <div className="flex items-center gap-1">
                  Email
                  {getSortIcon('email') && <span className="material-icons text-sm">{getSortIcon('email')}</span>}
                </div>
              </th>
              <th className="table-header-cell" onClick={() => handleSort('phone')}>
                <div className="flex items-center gap-1">
                  Phone
                  {getSortIcon('phone') && <span className="material-icons text-sm">{getSortIcon('phone')}</span>}
                </div>
              </th>
              <th className="table-header-cell">CPF</th>
              <th className="table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedClients.length === 0 ? (
              <tr>
                <td colSpan="7" className="table-cell text-center py-10 text-gray-500">
                  No clients found
                </td>
              </tr>
            ) : (
              paginatedClients.map(client => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="table-cell-secondary">{client.id}</td>
                  <td className="table-cell-primary">{client.name}</td>
                  <td className="table-cell-secondary">
                    {client.nationality ? (
                      <span className="flex items-center gap-1">
                        <span className="material-icons text-sm text-gray-400">place</span>
                        {client.nationality}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="table-cell-secondary">
                    {client.email ? (
                      <span className="flex items-center gap-1">
                        <span className="material-icons text-sm text-gray-400">email</span>
                        {client.email}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className="material-icons text-sm text-gray-400">email</span>
                      </span>
                    )}
                  </td>
                  <td className="table-cell-secondary">
                    {client.phone ? (
                      <span className="flex items-center gap-1">
                        <span className="material-icons text-sm text-gray-400">phone</span>
                        {client.phone}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="table-cell-secondary">{client.cpf || '—'}</td>
                  <td className="table-cell">
                    {canModify ? (
                      <div className="flex gap-2">
                        <button
                          className="btn-icon"
                          onClick={() => handleEdit(client)}
                          title="Edit"
                        >
                          <span className="material-icons text-lg">edit</span>
                        </button>
                        <button
                          className="btn-icon-danger"
                          onClick={() => handleDelete(client.id)}
                          title="Delete"
                        >
                          <span className="material-icons text-lg">delete</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400">View only</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}

export default Clients;
