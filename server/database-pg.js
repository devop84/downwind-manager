// PostgreSQL database adapter for production (Render)
// Falls back to SQLite if DATABASE_URL is not set (local development)

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

let db;
let dbType = 'sqlite'; // 'sqlite' or 'postgres'

// Check if we should use PostgreSQL
if (process.env.DATABASE_URL) {
  // Use PostgreSQL
  const { Pool } = require('pg');
  dbType = 'postgres';
  
  console.log('DATABASE_URL detected, using PostgreSQL');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });
  
  // Test connection
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('PostgreSQL connection error:', err.message);
    } else {
      console.log('PostgreSQL connected successfully');
    }
  });

  // Create a database adapter that mimics SQLite API
  db = {
    all: (query, params, callback) => {
      pool.query(query, params || [])
        .then(result => callback(null, result.rows))
        .catch(err => callback(err));
    },
    get: (query, params, callback) => {
      pool.query(query, params || [])
        .then(result => callback(null, result.rows[0] || null))
        .catch(err => callback(err));
    },
    run: (query, params, callback) => {
      // For INSERT statements, add RETURNING id to get the last inserted ID
      let modifiedQuery = query;
      if (query.trim().toUpperCase().startsWith('INSERT')) {
        // Check if RETURNING is already in the query
        if (!query.toUpperCase().includes('RETURNING')) {
          modifiedQuery = query.replace(/;?\s*$/, '') + ' RETURNING id';
        }
      }
      
      pool.query(modifiedQuery, params || [])
        .then(result => {
          // Create a mock statement object like SQLite does
          const statement = {
            lastID: result.rows[0]?.id || null,
            changes: result.rowCount || 0
          };
          // SQLite callback signature: callback(err) where 'this' is the statement
          if (callback) {
            callback.call(statement, null);
          }
        })
        .catch(err => {
          if (callback) {
            callback.call({ lastID: null, changes: 0 }, err);
          }
        });
    },
    serialize: (callback) => {
      // PostgreSQL doesn't need serialize, just run the callback
      if (callback) callback();
    },
    close: (callback) => {
      pool.end()
        .then(() => {
          if (callback) callback(null);
        })
        .catch(err => {
          if (callback) callback(err);
        });
    }
  };
  
  console.log('Using PostgreSQL database');
} else {
  // Use SQLite (local development)
  const DB_PATH = path.join(__dirname, 'kitesurfing.db');
  db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to SQLite database');
    }
  });
}

function initDatabase() {
  // Convert SQLite syntax to PostgreSQL where needed
  const createUsersTable = dbType === 'postgres' ? `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  ` : `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createClientsTable = dbType === 'postgres' ? `
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      nationality TEXT,
      notes TEXT,
      cpf TEXT,
      birth_date TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  ` : `
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      nationality TEXT,
      notes TEXT,
      cpf TEXT,
      birth_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createHotelsTable = dbType === 'postgres' ? `
    CREATE TABLE IF NOT EXISTS hotels (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      pix TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  ` : `
    CREATE TABLE IF NOT EXISTS hotels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      pix TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createTripsTable = dbType === 'postgres' ? `
    CREATE TABLE IF NOT EXISTS trips (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      price REAL NOT NULL,
      hotel_id INTEGER,
      max_participants INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  ` : `
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      price REAL NOT NULL,
      hotel_id INTEGER,
      max_participants INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hotel_id) REFERENCES hotels(id)
    )
  `;

  const createBookingsTable = dbType === 'postgres' ? `
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL,
      trip_id INTEGER NOT NULL,
      booking_date DATE NOT NULL,
      status TEXT DEFAULT 'pending',
      participants INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (trip_id) REFERENCES trips(id)
    )
  ` : `
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      trip_id INTEGER NOT NULL,
      booking_date DATE NOT NULL,
      status TEXT DEFAULT 'pending',
      participants INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (trip_id) REFERENCES trips(id)
    )
  `;

  // Create tables
  db.serialize(() => {
    // Users table
    db.run(createUsersTable);

    // Add role column if it doesn't exist (for existing databases)
    if (dbType === 'postgres') {
      db.run(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`, (err) => {
        // Ignore error if column already exists
      });
    } else {
      db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, (err) => {
        // Ignore error if column already exists
      });
    }

    // Clients table
    db.run(createClientsTable);

    // Add new columns to clients if they don't exist
    if (dbType === 'postgres') {
      db.run(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS nationality TEXT`, (err) => {});
      db.run(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT`, (err) => {});
      db.run(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS cpf TEXT`, (err) => {});
      db.run(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS birth_date TEXT`, (err) => {});
    } else {
      db.run(`ALTER TABLE clients ADD COLUMN nationality TEXT`, (err) => {});
      db.run(`ALTER TABLE clients ADD COLUMN notes TEXT`, (err) => {});
      db.run(`ALTER TABLE clients ADD COLUMN cpf TEXT`, (err) => {});
      db.run(`ALTER TABLE clients ADD COLUMN birth_date TEXT`, (err) => {});
    }

    // Hotels table
    db.run(createHotelsTable);
    
    // Add new columns to hotels if they don't exist
    if (dbType === 'postgres') {
      db.run(`ALTER TABLE hotels ADD COLUMN IF NOT EXISTS website TEXT`, (err) => {});
      db.run(`ALTER TABLE hotels ADD COLUMN IF NOT EXISTS pix TEXT`, (err) => {});
      db.run(`ALTER TABLE hotels ADD COLUMN IF NOT EXISTS notes TEXT`, (err) => {});
    } else {
      db.run(`ALTER TABLE hotels ADD COLUMN website TEXT`, (err) => {});
      db.run(`ALTER TABLE hotels ADD COLUMN pix TEXT`, (err) => {});
      db.run(`ALTER TABLE hotels ADD COLUMN notes TEXT`, (err) => {});
    }

    // Trips table
    db.run(createTripsTable);

    // Bookings table
    db.run(createBookingsTable);

    // Create default admin account (username: admin, password: password)
    db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
      if (err) {
        console.error('Error checking admin user:', err.message);
      } else if (!row) {
        // Hash the password 'password'
        bcrypt.hash('password', 10, (err, hash) => {
          if (err) {
            console.error('Error hashing password:', err.message);
          } else {
            db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hash, 'admin'], (err) => {
              if (err) {
                console.error('Error creating admin user:', err.message);
              } else {
                console.log('Default admin account created (username: admin, password: password, role: admin)');
              }
            });
          }
        });
      } else if (row.role !== 'admin') {
        // Update existing admin user to have admin role
        db.run('UPDATE users SET role = ? WHERE username = ?', ['admin', 'admin'], (err) => {
          if (err) {
            console.error('Error updating admin role:', err.message);
          } else {
            console.log('Admin user role updated to admin');
          }
        });
      }
    });
  });

  return db;
}

module.exports = { initDatabase };

