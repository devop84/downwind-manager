import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Table.css';

const API_URL = 'http://localhost:5000/api';

function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [clients, setClients] = useState([]);
  const [trips, setTrips] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    trip_id: '',
    booking_date: '',
    status: 'pending',
    participants: '1'
  });

  useEffect(() => {
    fetchBookings();
    fetchClients();
    fetchTrips();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_URL}/bookings`);
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      alert('Error loading bookings');
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API_URL}/clients`);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchTrips = async () => {
    try {
      const response = await axios.get(`${API_URL}/trips`);
      setTrips(response.data);
    } catch (error) {
      console.error('Error fetching trips:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        client_id: parseInt(formData.client_id),
        trip_id: parseInt(formData.trip_id),
        participants: parseInt(formData.participants)
      };
      if (editingBooking) {
        await axios.put(`${API_URL}/bookings/${editingBooking.id}`, data);
      } else {
        await axios.post(`${API_URL}/bookings`, data);
      }
      fetchBookings();
      resetForm();
    } catch (error) {
      console.error('Error saving booking:', error);
      alert('Error saving booking');
    }
  };

  const handleEdit = (booking) => {
    setEditingBooking(booking);
    setFormData({
      client_id: booking.client_id || '',
      trip_id: booking.trip_id || '',
      booking_date: booking.booking_date || '',
      status: booking.status || 'pending',
      participants: booking.participants || '1'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
        await axios.delete(`${API_URL}/bookings/${id}`);
        fetchBookings();
      } catch (error) {
        console.error('Error deleting booking:', error);
        alert('Error deleting booking');
      }
    }
  };

  const resetForm = () => {
    setFormData({ client_id: '', trip_id: '', booking_date: '', status: 'pending', participants: '1' });
    setEditingBooking(null);
    setShowForm(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      pending: '#ffa500',
      confirmed: '#28a745',
      cancelled: '#dc3545',
      completed: '#17a2b8'
    };
    return (
      <span className="status-badge" style={{ backgroundColor: statusColors[status] || '#6c757d' }}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div className="section-header">
        <h2>Bookings</h2>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          + Add Booking
        </button>
      </div>

      {showForm && (
        <form className="form" onSubmit={handleSubmit}>
          <h3>{editingBooking ? 'Edit Booking' : 'New Booking'}</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Client *</label>
              <select
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                required
              >
                <option value="">Select a client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.email ? `(${client.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Trip *</label>
              <select
                value={formData.trip_id}
                onChange={(e) => setFormData({ ...formData, trip_id: e.target.value })}
                required
              >
                <option value="">Select a trip</option>
                {trips.map(trip => (
                  <option key={trip.id} value={trip.id}>
                    {trip.name} - {formatDate(trip.start_date)} to {formatDate(trip.end_date)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Booking Date *</label>
              <input
                type="date"
                value={formData.booking_date}
                onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Status *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                required
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="form-group">
              <label>Participants</label>
              <input
                type="number"
                min="1"
                value={formData.participants}
                onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
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
              <th>Client</th>
              <th>Trip</th>
              <th>Booking Date</th>
              <th>Status</th>
              <th>Participants</th>
              <th>Trip Dates</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">No bookings found</td>
              </tr>
            ) : (
              bookings.map(booking => (
                <tr key={booking.id}>
                  <td>{booking.client_name || '-'}</td>
                  <td>{booking.trip_name || '-'}</td>
                  <td>{formatDate(booking.booking_date)}</td>
                  <td>{getStatusBadge(booking.status)}</td>
                  <td>{booking.participants || 1}</td>
                  <td>
                    {booking.start_date && booking.end_date 
                      ? `${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}`
                      : '-'
                    }
                  </td>
                  <td>{booking.price ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(booking.price) : '-'}</td>
                  <td>
                    <button className="btn-edit" onClick={() => handleEdit(booking)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDelete(booking.id)}>Delete</button>
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

export default Bookings;

