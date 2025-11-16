import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SearchInput } from './common/SearchInput';
import { Modal } from './common/Modal';
import { Pagination, PaginationControls } from './common/Pagination';

const API_URL = 'http://localhost:5000/api';

function Trips({ userRole = 'user' }) {
  const canModify = userRole === 'admin' || userRole === 'manager';
  const [trips, setTrips] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [sortColumn, setSortColumn] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    price: '',
    hotel_id: '',
    max_participants: ''
  });

  useEffect(() => {
    fetchTrips();
    fetchHotels();
  }, []);

  const fetchTrips = async () => {
    try {
      const response = await axios.get(`${API_URL}/trips`);
      setTrips(response.data);
    } catch (error) {
      console.error('Error fetching trips:', error);
      alert('Error loading trips');
    }
  };

  const fetchHotels = async () => {
    try {
      const response = await axios.get(`${API_URL}/hotels`);
      setHotels(response.data);
    } catch (error) {
      console.error('Error fetching hotels:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : 0,
        hotel_id: formData.hotel_id ? parseInt(formData.hotel_id) : null,
        max_participants: formData.max_participants ? parseInt(formData.max_participants) : null
      };
      if (editingTrip) {
        await axios.put(`${API_URL}/trips/${editingTrip.id}`, data);
      } else {
        await axios.post(`${API_URL}/trips`, data);
      }
      fetchTrips();
      resetForm();
    } catch (error) {
      console.error('Error saving trip:', error);
      alert('Error saving trip');
    }
  };

  const handleEdit = (trip) => {
    setEditingTrip(trip);
    setFormData({
      name: trip.name || '',
      description: trip.description || '',
      start_date: trip.start_date || '',
      end_date: trip.end_date || '',
      price: trip.price || '',
      hotel_id: trip.hotel_id || '',
      max_participants: trip.max_participants || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this trip?')) {
      try {
        await axios.delete(`${API_URL}/trips/${id}`);
        fetchTrips();
      } catch (error) {
        console.error('Error deleting trip:', error);
        alert('Error deleting trip');
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', start_date: '', end_date: '', price: '', hotel_id: '', max_participants: '' });
    setEditingTrip(null);
    setShowForm(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedTrips = () => {
    let filtered = trips;

    if (searchTerm) {
      filtered = filtered.filter(trip =>
        trip.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.hotel_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.hotel_location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (!sortColumn) return filtered;

    return [...filtered].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (sortColumn === 'id' || sortColumn === 'price' || sortColumn === 'max_participants') {
        aVal = aVal || 0;
        bVal = bVal || 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (sortColumn === 'start_date' || sortColumn === 'end_date') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (sortColumn === 'hotel_name') {
        aVal = a.hotel_name || '';
        bVal = b.hotel_name || '';
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

  const sortedTrips = getSortedTrips();
  const totalPages = Math.ceil(sortedTrips.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTrips = sortedTrips.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Downwinds</h1>
        {canModify && (
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => { resetForm(); setShowForm(true); }}
          >
            <span className="material-icons text-lg">add</span>
            <span>New Downwind</span>
          </button>
        )}
      </div>

      <SearchInput
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search downwinds..."
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        startIndex={startIndex}
        endIndex={endIndex}
        total={sortedTrips.length}
        itemsPerPage={itemsPerPage}
        itemName="downwinds"
      />

      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingTrip ? 'Edit Downwind' : 'New Downwind'}
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
            <div className="flex flex-col col-span-1 md:col-span-2 lg:col-span-3">
              <label className="mb-1 text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                className="input-base resize-none"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Start Date *</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
                className="input-base"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">End Date *</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
                className="input-base"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Price *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                className="input-base"
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Hotel</label>
              <select
                value={formData.hotel_id}
                onChange={(e) => setFormData({ ...formData, hotel_id: e.target.value })}
                className="input-base"
              >
                <option value="">Select a hotel</option>
                {hotels.map(hotel => (
                  <option key={hotel.id} value={hotel.id}>
                    {hotel.name} - {hotel.location}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-700">Max Participants</label>
              <input
                type="number"
                min="1"
                value={formData.max_participants}
                onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                className="input-base"
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
              <th className="table-header-cell" onClick={() => handleSort('description')}>
                <div className="flex items-center gap-1">
                  Description
                  {getSortIcon('description') && <span className="material-icons text-sm">{getSortIcon('description')}</span>}
                </div>
              </th>
              <th className="table-header-cell" onClick={() => handleSort('start_date')}>
                <div className="flex items-center gap-1">
                  Start Date
                  {getSortIcon('start_date') && <span className="material-icons text-sm">{getSortIcon('start_date')}</span>}
                </div>
              </th>
              <th className="table-header-cell" onClick={() => handleSort('end_date')}>
                <div className="flex items-center gap-1">
                  End Date
                  {getSortIcon('end_date') && <span className="material-icons text-sm">{getSortIcon('end_date')}</span>}
                </div>
              </th>
              <th className="table-header-cell" onClick={() => handleSort('price')}>
                <div className="flex items-center gap-1">
                  Price
                  {getSortIcon('price') && <span className="material-icons text-sm">{getSortIcon('price')}</span>}
                </div>
              </th>
              <th className="table-header-cell" onClick={() => handleSort('hotel_name')}>
                <div className="flex items-center gap-1">
                  Hotel
                  {getSortIcon('hotel_name') && <span className="material-icons text-sm">{getSortIcon('hotel_name')}</span>}
                </div>
              </th>
              <th className="table-header-cell" onClick={() => handleSort('max_participants')}>
                <div className="flex items-center gap-1">
                  Max Participants
                  {getSortIcon('max_participants') && <span className="material-icons text-sm">{getSortIcon('max_participants')}</span>}
                </div>
              </th>
              <th className="table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedTrips.length === 0 ? (
              <tr>
                <td colSpan="9" className="table-cell text-center py-10 text-gray-500">
                  No downwinds found
                </td>
              </tr>
            ) : (
              paginatedTrips.map(trip => (
                <tr key={trip.id} className="hover:bg-gray-50">
                  <td className="table-cell-secondary">{trip.id}</td>
                  <td className="table-cell-primary">{trip.name}</td>
                  <td className="table-cell-secondary">{trip.description || '—'}</td>
                  <td className="table-cell-secondary">{formatDate(trip.start_date)}</td>
                  <td className="table-cell-secondary">{formatDate(trip.end_date)}</td>
                  <td className="table-cell-secondary">{formatCurrency(trip.price)}</td>
                  <td className="table-cell-secondary">{trip.hotel_name ? `${trip.hotel_name} (${trip.hotel_location})` : '—'}</td>
                  <td className="table-cell-secondary">{trip.max_participants || '—'}</td>
                  <td className="table-cell">
                    {canModify ? (
                      <div className="flex gap-2">
                        <button
                          className="btn-icon"
                          onClick={() => handleEdit(trip)}
                          title="Edit"
                        >
                          <span className="material-icons text-lg">edit</span>
                        </button>
                        <button
                          className="btn-icon-danger"
                          onClick={() => handleDelete(trip.id)}
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

export default Trips;
