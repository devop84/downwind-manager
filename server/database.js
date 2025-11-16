const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const DB_PATH = path.join(__dirname, 'kitesurfing.db');

function initDatabase() {
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to SQLite database');
    }
  });

  // Create tables
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add role column if it doesn't exist (for existing databases)
    db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, (err) => {
      // Ignore error if column already exists
    });

    // Clients table
    db.run(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Hotels table
    db.run(`
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
    `);
    
    // Add new columns if they don't exist (for existing databases)
    db.run(`ALTER TABLE hotels ADD COLUMN website TEXT`, (err) => {
      // Ignore error if column already exists
    });
    db.run(`ALTER TABLE hotels ADD COLUMN pix TEXT`, (err) => {
      // Ignore error if column already exists
    });
    db.run(`ALTER TABLE hotels ADD COLUMN notes TEXT`, (err) => {
      // Ignore error if column already exists
    });

    // Trips table
    db.run(`
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
    `);

    // Bookings table
    db.run(`
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
    `);

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

