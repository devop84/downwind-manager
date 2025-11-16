import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Table.css';

const API_URL = 'http://localhost:5000/api';

function Hotels() {
  const [hotels, setHotels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    address: '',
    phone: '',
    email: '',
    rating: '',
    capacity: ''
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
      const data = {
        ...formData,
        rating: formData.rating ? parseInt(formData.rating) : null,
        capacity: formData.capacity ? parseInt(formData.capacity) : null
      };
      if (editingHotel) {
        await axios.put(`${API_URL}/hotels/${editingHotel.id}`, data);
      } else {
        await axios.post(`${API_URL}/hotels`, data);
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
      rating: hotel.rating || '',
      capacity: hotel.capacity || ''
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
    setFormData({ name: '', location: '', address: '', phone: '', email: '', rating: '', capacity: '' });
    setEditingHotel(null);
    setShowForm(false);
  };

  return (
    <div>
      <div className="section-header">
        <h2>Hotels</h2>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Hotel
        </button>
      </div>

      {showForm && (
        <form className="form" onSubmit={handleSubmit}>
          <h3>{editingHotel ? 'Edit Hotel' : 'New Hotel'}</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Location *</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Rating (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Capacity</label>
              <input
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">Save</button>
            <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Address</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Rating</th>
              <th>Capacity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {hotels.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">No hotels found</td>
              </tr>
            ) : (
              hotels.map(hotel => (
                <tr key={hotel.id}>
                  <td>{hotel.name}</td>
                  <td>{hotel.location}</td>
                  <td>{hotel.address || '-'}</td>
                  <td>{hotel.phone || '-'}</td>
                  <td>{hotel.email || '-'}</td>
                  <td>{hotel.rating ? '⭐'.repeat(hotel.rating) : '-'}</td>
                  <td>{hotel.capacity || '-'}</td>
                  <td>
                    <button className="btn-edit" onClick={() => handleEdit(hotel)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDelete(hotel.id)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Hotels;

