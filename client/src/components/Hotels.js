import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SearchInput } from './common/SearchInput';
import { Modal } from './common/Modal';
import { Pagination, PaginationControls } from './common/Pagination';

const API_URL = 'http://localhost:5000/api';

function Hotels({ userRole = 'user' }) {
  const canModify = userRole === 'admin' || userRole === 'manager';
  const [hotels, setHotels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [sortColumn, setSortColumn] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    pix: '',
    notes: ''
  });

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      const response = await axios.get(`${API_URL}/hotels`);
      setHotels(response.data);
    } catch (error) {
      console.error('Error fetching hotels:', error);
      alert('Error loading hotels');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingHotel) {
        await axios.put(`${API_URL}/hotels/${editingHotel.id}`, formData);
      } else {
        await axios.post(`${API_URL}/hotels`, formData);
      }
      fetchHotels();
      resetForm();
    } catch (error) {
      console.error('Error saving hotel:', error);
      alert('Error saving hotel');
    }
  };

  const handleEdit = (hotel) => {
    setEditingHotel(hotel);
    setFormData({
      name: hotel.name || '',
      location: hotel.location || '',
      address: hotel.address || '',
      phone: hotel.phone || '',
      email: hotel.email || '',
      website: hotel.website || '',
      pix: hotel.pix || '',
      notes: hotel.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this hotel?')) {
      try {
        await axios.delete(`${API_URL}/hotels/${id}`);
        fetchHotels();
      } catch (error) {
        console.error('Error deleting hotel:', error);
        alert('Error deleting hotel');
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', location: '', address: '', phone: '', email: '', website: '', pix: '', notes: '' });
    setEditingHotel(null);
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

  const getSortedHotels = () => {
    let filtered = hotels;

    if (searchTerm) {
      filtered = filtered.filter(hotel =>
        hotel.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hotel.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hotel.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hotel.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hotel.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hotel.website?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hotel.pix?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hotel.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (!sortColumn) return filtered;

    return [...filtered].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (sortColumn === 'id') {
        aVal = aVal || 0;
        bVal = bVal || 0;
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

  const sortedHotels = getSortedHotels();
  const totalPages = Math.ceil(sortedHotels.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHotels = sortedHotels.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Hotels</h1>
        {canModify && (
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => { resetForm(); setShowForm(true); }}
          >
            <span className="material-icons text-lg">add</span>
            <span>New Hotel</span>
          </button>
        )}
      </div>

      <SearchInput
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search hotels..."
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        startIndex={startIndex}
        endIndex={endIndex}
        total={sortedHotels.length}
        itemsPerPage={itemsPerPage}
        itemName="hotels"
      />

      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingHotel ? 'Edit Hotel' : 'New Hotel'}
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
              <label className="mb-1 text-sm font-medium text-gray-700">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="input-base"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
              <label className="mb-1 text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-base"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="input-base"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">PIX</label>
              <input
                type="text"
                value={formData.pix}
                onChange={(e) => setFormData({ ...formData, pix: e.target.value })}
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
        <table className="w-full min-w-[1000px]">
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
              <th className="table-header-cell" onClick={() => handleSort('location')}>
                <div className="flex items-center gap-1">
                  Location
                  {getSortIcon('location') && <span className="material-icons text-sm">{getSortIcon('location')}</span>}
                </div>
              </th>
              <th className="table-header-cell" onClick={() => handleSort('address')}>
                <div className="flex items-center gap-1">
                  Address
                  {getSortIcon('address') && <span className="material-icons text-sm">{getSortIcon('address')}</span>}
                </div>
              </th>
              <th className="table-header-cell" onClick={() => handleSort('phone')}>
                <div className="flex items-center gap-1">
                  Phone
                  {getSortIcon('phone') && <span className="material-icons text-sm">{getSortIcon('phone')}</span>}
                </div>
              </th>
              <th className="table-header-cell" onClick={() => handleSort('email')}>
                <div className="flex items-center gap-1">
                  Email
                  {getSortIcon('email') && <span className="material-icons text-sm">{getSortIcon('email')}</span>}
                </div>
              </th>
              <th className="table-header-cell" onClick={() => handleSort('website')}>
                <div className="flex items-center gap-1">
                  Website
                  {getSortIcon('website') && <span className="material-icons text-sm">{getSortIcon('website')}</span>}
                </div>
              </th>
              <th className="table-header-cell">PIX</th>
              <th className="table-header-cell">Notes</th>
              <th className="table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedHotels.length === 0 ? (
              <tr>
                <td colSpan="10" className="table-cell text-center py-10 text-gray-500">
                  No hotels found
                </td>
              </tr>
            ) : (
              paginatedHotels.map(hotel => (
                <tr key={hotel.id} className="hover:bg-gray-50">
                  <td className="table-cell-secondary">{hotel.id}</td>
                  <td className="table-cell-primary">{hotel.name}</td>
                  <td className="table-cell-secondary">{hotel.location || '—'}</td>
                  <td className="table-cell-secondary">{hotel.address || '—'}</td>
                  <td className="table-cell-secondary">{hotel.phone || '—'}</td>
                  <td className="table-cell-secondary">{hotel.email || '—'}</td>
                  <td className="table-cell-secondary">
                    {hotel.website ? (
                      <a href={hotel.website.startsWith('http') ? hotel.website : `https://${hotel.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {hotel.website}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="table-cell-secondary">{hotel.pix || '—'}</td>
                  <td className="table-cell-secondary">{hotel.notes ? (hotel.notes.length > 50 ? `${hotel.notes.substring(0, 50)}...` : hotel.notes) : '—'}</td>
                  <td className="table-cell">
                    {canModify ? (
                      <div className="flex gap-2">
                        <button
                          className="btn-icon"
                          onClick={() => handleEdit(hotel)}
                          title="Edit"
                        >
                          <span className="material-icons text-lg">edit</span>
                        </button>
                        <button
                          className="btn-icon-danger"
                          onClick={() => handleDelete(hotel.id)}
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

export default Hotels;
