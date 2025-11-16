const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
// Use PostgreSQL adapter if DATABASE_URL is set (production), otherwise use SQLite (local)
const { initDatabase } = process.env.DATABASE_URL ? require('./database-pg') : require('./database');

// Configure session store - use PostgreSQL in production, MemoryStore in development
let sessionStore;
if (process.env.DATABASE_URL) {
  // Use PostgreSQL session store in production
  try {
    const pgSession = require('connect-pg-simple')(session);
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : {
        rejectUnauthorized: false
      }
    });
    
    // Test the pool connection
    pool.query('SELECT NOW()')
      .then(() => {
        console.log('Session store PostgreSQL pool connected successfully');
      })
      .catch(err => {
        console.error('Session store PostgreSQL connection error:', err.message);
      });
    
    sessionStore = new pgSession({
      pool: pool,
      tableName: 'user_sessions' // Optional: customize table name
    });
    
    // Ensure session table exists with correct schema for connect-pg-simple
    // Note: connect-pg-simple should create this automatically, but we'll ensure it exists
    pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        sid VARCHAR(255) NOT NULL PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      )
    `).then(() => {
      console.log('Session table verified/created');
      // Create index on expire column for better performance
      return pool.query(`
        CREATE INDEX IF NOT EXISTS IDX_user_sessions_expire ON user_sessions (expire)
      `);
    }).then(() => {
      console.log('Session table index created');
    }).catch(err => {
      console.error('Error setting up session table:', err.message);
      console.error('Error details:', err);
    });
    
    console.log('Using PostgreSQL session store');
  } catch (err) {
    console.error('Error initializing PostgreSQL session store:', err.message);
    console.error('Falling back to MemoryStore (not recommended for production)');
    sessionStore = undefined; // Fallback to MemoryStore
  }
} else {
  // Use MemoryStore in development (local)
  sessionStore = undefined; // undefined = MemoryStore (default)
  console.log('Using MemoryStore for sessions (development only)');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - required for Render and other reverse proxies
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'kitesurfing-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: sessionStore, // Use PostgreSQL store in production, MemoryStore in development
  name: 'sessionId', // Explicit session cookie name
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Required for cross-origin in production
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    // Don't set domain - let browser handle it
    // path: '/' is default
  }
};

app.use(session(sessionConfig));

// Initialize database
const db = initDatabase();

// Authentication middleware
const requireAuth = (req, res, next) => {
  // Debug logging
  console.log('Auth check - Session exists:', !!req.session, 'Session ID:', req.session?.id, 'UserId:', req.session?.userId, 'Username:', req.session?.username);
  console.log('Request headers - cookie:', req.headers.cookie ? 'Present' : 'Missing');
  
  if (req.session && req.session.userId) {
    next();
  } else {
    console.log('401 Unauthorized - No valid session. Session object:', req.session);
    res.status(401).json({ error: 'Unauthorized. Please login.' });
  }
};

// Role-based middleware
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      res.status(401).json({ error: 'Unauthorized. Please login.' });
      return;
    }

    const userRole = req.session.role || 'user';
    if (allowedRoles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden. Insufficient permissions.' });
    }
  };
};

// Login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    bcrypt.compare(password, user.password, (err, match) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (match) {
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role || 'user';
        
        console.log('Setting session - UserId:', user.id, 'Username:', user.username, 'Role:', user.role);
        console.log('Session ID before save:', req.sessionID);
        
        // Save session explicitly
        req.session.save((err) => {
          if (err) {
            console.error('Error saving session:', err);
            console.error('Session error details:', err.message, err.stack);
            res.status(500).json({ error: 'Error saving session: ' + err.message });
            return;
          }
          console.log('Session saved successfully - Session ID:', req.sessionID);
          console.log('Session cookie will be sent with response');
          console.log('Response headers - Set-Cookie:', res.getHeader('Set-Cookie'));
          res.json({ message: 'Login successful', username: user.username, role: user.role || 'user' });
        });
      } else {
        res.status(401).json({ error: 'Invalid username or password' });
      }
    });
  });
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Error logging out' });
    } else {
      res.json({ message: 'Logout successful' });
    }
  });
});

// Signup endpoint
app.post('/api/signup', (req, res) => {
  const { username, password, role } = req.body;
  
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  if (username.length < 3) {
    res.status(400).json({ error: 'Username must be at least 3 characters long' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long' });
    return;
  }

  // Check if username already exists
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, existingUser) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (existingUser) {
      res.status(400).json({ error: 'Username already exists' });
      return;
    }

    // Hash password and create user (default role is 'user', admin can create manager/user but not admin)
    let userRole = 'user';
    if (role && req.session && req.session.role === 'admin') {
      // Only allow creating manager or user roles, never admin
      if (role === 'manager' || role === 'user') {
        userRole = role;
      }
    }
    
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hash, userRole], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        res.json({ message: 'Account created successfully', username, role: userRole });
      });
    });
  });
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
  // Debug: log session info (enable in production for debugging)
  console.log('Auth status check - Session exists:', !!req.session, 'Session ID:', req.session?.id, 'UserId:', req.session?.userId, 'Username:', req.session?.username);
  console.log('Request headers - cookie:', req.headers.cookie ? 'Present' : 'Missing');
  
  if (req.session && req.session.userId) {
    res.json({ 
      authenticated: true, 
      username: req.session.username,
      role: req.session.role || 'user'
    });
  } else {
    console.log('No valid session found - user not authenticated');
    res.json({ authenticated: false });
  }
});

// Routes for Users (Admin only)
app.get('/api/users', requireAuth, requireRole('admin'), (req, res) => {
  db.all('SELECT id, username, role, created_at FROM users ORDER BY username', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  db.get('SELECT id, username, role, created_at FROM users WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(row);
  });
});

app.put('/api/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  const { username, role } = req.body;
  
  if (!username || !role) {
    res.status(400).json({ error: 'Username and role are required' });
    return;
  }

  if (!['admin', 'manager', 'user'].includes(role)) {
    res.status(400).json({ error: 'Invalid role. Must be admin, manager, or user' });
    return;
  }

  // Prevent changing role to admin (only the default admin user can be admin)
  if (role === 'admin') {
    res.status(400).json({ error: 'Cannot change role to admin. Only the default admin user can have admin role.' });
    return;
  }

  // Get current user to check if they're changing from admin
  db.get('SELECT role, username FROM users WHERE id = ?', [req.params.id], (err, currentUser) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (!currentUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Prevent changing the default admin user's role
    if (currentUser.username === 'admin' && role !== 'admin') {
      res.status(400).json({ error: 'Cannot change the default admin user\'s role.' });
      return;
    }

    // Prevent removing the last admin
    if (currentUser.role === 'admin' && role !== 'admin') {
      db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin'], (err, result) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        if (result.count <= 1) {
          res.status(400).json({ error: 'Cannot change role. At least one admin user is required.' });
          return;
        }
        
        db.run('UPDATE users SET username = ?, role = ? WHERE id = ?', [username, role, req.params.id], function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({ id: req.params.id, username, role });
        });
      });
    } else {
      db.run('UPDATE users SET username = ?, role = ? WHERE id = ?', [username, role, req.params.id], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ id: req.params.id, username, role });
      });
    }
  });
});

app.delete('/api/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  // Prevent deleting yourself
  if (parseInt(req.params.id) === req.session.userId) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  // Prevent deleting the last admin
  db.get('SELECT role FROM users WHERE id = ?', [req.params.id], (err, user) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (user && user.role === 'admin') {
      db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin'], (err, result) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        if (result.count <= 1) {
          res.status(400).json({ error: 'Cannot delete the last admin user' });
          return;
        }
        
        db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({ message: 'User deleted successfully' });
        });
      });
    } else {
      db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ message: 'User deleted successfully' });
      });
    }
  });
});

// Routes for Clients
app.get('/api/clients', requireAuth, (req, res) => {
  db.all('SELECT * FROM clients ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/clients/:id', requireAuth, (req, res) => {
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

app.post('/api/clients', requireAuth, requireRole('admin', 'manager'), (req, res) => {
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

app.put('/api/clients/:id', requireAuth, requireRole('admin', 'manager'), (req, res) => {
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

app.delete('/api/clients/:id', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  db.run('DELETE FROM clients WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Client deleted successfully' });
  });
});

// Routes for Hotels
app.get('/api/hotels', requireAuth, (req, res) => {
  db.all('SELECT * FROM hotels ORDER BY id', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/hotels/:id', requireAuth, (req, res) => {
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

app.post('/api/hotels', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  const { name, location, address, phone, email, website, pix, notes } = req.body;
  db.run(
    'INSERT INTO hotels (name, location, address, phone, email, website, pix, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, location, address, phone, email, website, pix, notes],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, name, location, address, phone, email, website, pix, notes });
    }
  );
});

app.put('/api/hotels/:id', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  const { name, location, address, phone, email, website, pix, notes } = req.body;
  db.run(
    'UPDATE hotels SET name = ?, location = ?, address = ?, phone = ?, email = ?, website = ?, pix = ?, notes = ? WHERE id = ?',
    [name, location, address, phone, email, website, pix, notes, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: req.params.id, name, location, address, phone, email, website, pix, notes });
    }
  );
});

app.delete('/api/hotels/:id', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  db.run('DELETE FROM hotels WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Hotel deleted successfully' });
  });
});

// Routes for Trips
app.get('/api/trips', requireAuth, (req, res) => {
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

app.get('/api/trips/:id', requireAuth, (req, res) => {
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

app.post('/api/trips', requireAuth, requireRole('admin', 'manager'), (req, res) => {
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

app.put('/api/trips/:id', requireAuth, requireRole('admin', 'manager'), (req, res) => {
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

app.delete('/api/trips/:id', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  db.run('DELETE FROM trips WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Trip deleted successfully' });
  });
});

// Routes for Bookings
app.get('/api/bookings', requireAuth, (req, res) => {
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

app.get('/api/bookings/:id', requireAuth, (req, res) => {
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

app.post('/api/bookings', requireAuth, (req, res) => {
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

app.put('/api/bookings/:id', requireAuth, requireRole('admin', 'manager'), (req, res) => {
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

app.delete('/api/bookings/:id', requireAuth, requireRole('admin', 'manager'), (req, res) => {
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

