import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Table.css';

const API_URL = 'http://localhost:5000/api';

function Trips() {
  const [trips, setTrips] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
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

  return (
    <div>
      <div className="section-header">
        <h2>Trips</h2>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Trip
        </button>
      </div>

      {showForm && (
        <form className="form" onSubmit={handleSubmit}>
          <h3>{editingTrip ? 'Edit Trip' : 'New Trip'}</h3>
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
            <div className="form-group full-width">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>Start Date *</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>End Date *</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Price *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Hotel</label>
              <select
                value={formData.hotel_id}
                onChange={(e) => setFormData({ ...formData, hotel_id: e.target.value })}
              >
                <option value="">Select a hotel</option>
                {hotels.map(hotel => (
                  <option key={hotel.id} value={hotel.id}>
                    {hotel.name} - {hotel.location}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Max Participants</label>
              <input
                type="number"
                min="1"
                value={formData.max_participants}
                onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
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
              <th>Description</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Price</th>
              <th>Hotel</th>
              <th>Max Participants</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trips.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">No trips found</td>
              </tr>
            ) : (
              trips.map(trip => (
                <tr key={trip.id}>
                  <td>{trip.name}</td>
                  <td>{trip.description || '-'}</td>
                  <td>{formatDate(trip.start_date)}</td>
                  <td>{formatDate(trip.end_date)}</td>
                  <td>{formatCurrency(trip.price)}</td>
                  <td>{trip.hotel_name ? `${trip.hotel_name} (${trip.hotel_location})` : '-'}</td>
                  <td>{trip.max_participants || '-'}</td>
                  <td>
                    <button className="btn-edit" onClick={() => handleEdit(trip)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDelete(trip.id)}>Delete</button>
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

export default Trips;

