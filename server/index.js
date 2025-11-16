const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize database
const db = initDatabase();

// Routes for Clients
app.get('/api/clients', (req, res) => {
  db.all('SELECT * FROM clients ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/clients/:id', (req, res) => {
  db.get('SELECT * FROM clients WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    res.json(row);
  });
});

app.post('/api/clients', (req, res) => {
  const { name, email, phone, address } = req.body;
  db.run(
    'INSERT INTO clients (name, email, phone, address) VALUES (?, ?, ?, ?)',
    [name, email, phone, address],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, name, email, phone, address });
    }
  );
});

app.put('/api/clients/:id', (req, res) => {
  const { name, email, phone, address } = req.body;
  db.run(
    'UPDATE clients SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?',
    [name, email, phone, address, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: req.params.id, name, email, phone, address });
    }
  );
});

app.delete('/api/clients/:id', (req, res) => {
  db.run('DELETE FROM clients WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Client deleted successfully' });
  });
});

// Routes for Hotels
app.get('/api/hotels', (req, res) => {
  db.all('SELECT * FROM hotels ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/hotels/:id', (req, res) => {
  db.get('SELECT * FROM hotels WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Hotel not found' });
      return;
    }
    res.json(row);
  });
});

app.post('/api/hotels', (req, res) => {
  const { name, location, address, phone, email, rating, capacity } = req.body;
  db.run(
    'INSERT INTO hotels (name, location, address, phone, email, rating, capacity) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, location, address, phone, email, rating, capacity],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, name, location, address, phone, email, rating, capacity });
    }
  );
});

app.put('/api/hotels/:id', (req, res) => {
  const { name, location, address, phone, email, rating, capacity } = req.body;
  db.run(
    'UPDATE hotels SET name = ?, location = ?, address = ?, phone = ?, email = ?, rating = ?, capacity = ? WHERE id = ?',
    [name, location, address, phone, email, rating, capacity, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: req.params.id, name, location, address, phone, email, rating, capacity });
    }
  );
});

app.delete('/api/hotels/:id', (req, res) => {
  db.run('DELETE FROM hotels WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Hotel deleted successfully' });
  });
});

// Routes for Trips
app.get('/api/trips', (req, res) => {
  db.all(`
    SELECT t.*, h.name as hotel_name, h.location as hotel_location
    FROM trips t
    LEFT JOIN hotels h ON t.hotel_id = h.id
    ORDER BY t.start_date
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/trips/:id', (req, res) => {
  db.get(`
    SELECT t.*, h.name as hotel_name, h.location as hotel_location
    FROM trips t
    LEFT JOIN hotels h ON t.hotel_id = h.id
    WHERE t.id = ?
  `, [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    res.json(row);
  });
});

app.post('/api/trips', (req, res) => {
  const { name, description, start_date, end_date, price, hotel_id, max_participants } = req.body;
  db.run(
    'INSERT INTO trips (name, description, start_date, end_date, price, hotel_id, max_participants) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, description, start_date, end_date, price, hotel_id, max_participants],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, name, description, start_date, end_date, price, hotel_id, max_participants });
    }
  );
});

app.put('/api/trips/:id', (req, res) => {
  const { name, description, start_date, end_date, price, hotel_id, max_participants } = req.body;
  db.run(
    'UPDATE trips SET name = ?, description = ?, start_date = ?, end_date = ?, price = ?, hotel_id = ?, max_participants = ? WHERE id = ?',
    [name, description, start_date, end_date, price, hotel_id, max_participants, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: req.params.id, name, description, start_date, end_date, price, hotel_id, max_participants });
    }
  );
});

app.delete('/api/trips/:id', (req, res) => {
  db.run('DELETE FROM trips WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Trip deleted successfully' });
  });
});

// Routes for Bookings
app.get('/api/bookings', (req, res) => {
  db.all(`
    SELECT b.*, 
           c.name as client_name, c.email as client_email,
           t.name as trip_name, t.start_date, t.end_date, t.price
    FROM bookings b
    LEFT JOIN clients c ON b.client_id = c.id
    LEFT JOIN trips t ON b.trip_id = t.id
    ORDER BY b.booking_date DESC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/bookings/:id', (req, res) => {
  db.get(`
    SELECT b.*, 
           c.name as client_name, c.email as client_email,
           t.name as trip_name, t.start_date, t.end_date, t.price
    FROM bookings b
    LEFT JOIN clients c ON b.client_id = c.id
    LEFT JOIN trips t ON b.trip_id = t.id
    WHERE b.id = ?
  `, [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    res.json(row);
  });
});

app.post('/api/bookings', (req, res) => {
  const { client_id, trip_id, booking_date, status, participants } = req.body;
  db.run(
    'INSERT INTO bookings (client_id, trip_id, booking_date, status, participants) VALUES (?, ?, ?, ?, ?)',
    [client_id, trip_id, booking_date, status, participants],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, client_id, trip_id, booking_date, status, participants });
    }
  );
});

app.put('/api/bookings/:id', (req, res) => {
  const { client_id, trip_id, booking_date, status, participants } = req.body;
  db.run(
    'UPDATE bookings SET client_id = ?, trip_id = ?, booking_date = ?, status = ?, participants = ? WHERE id = ?',
    [client_id, trip_id, booking_date, status, participants, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: req.params.id, client_id, trip_id, booking_date, status, participants });
    }
  );
});

app.delete('/api/bookings/:id', (req, res) => {
  db.run('DELETE FROM bookings WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Booking deleted successfully' });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

