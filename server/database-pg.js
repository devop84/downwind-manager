// PostgreSQL database adapter for production (Render)
// Falls back to SQLite if DATABASE_URL is not set (local development)

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

let db;
let dbType = 'sqlite'; // 'sqlite' or 'postgres'

// Check if we should use PostgreSQL
let pool;
if (process.env.DATABASE_URL) {
  // Use PostgreSQL
  try {
    const { Pool } = require('pg');
    if (!Pool) {
      console.error('ERROR: pg.Pool is not available. Make sure pg package is installed.');
      throw new Error('pg.Pool is not available');
    }
    dbType = 'postgres';
    
    console.log('DATABASE_URL detected, using PostgreSQL');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (hidden for security)' : 'Not set');
    
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : {
        rejectUnauthorized: false
      }
    });
    
    console.log('PostgreSQL pool created. Pool type:', typeof pool, 'Has query method:', typeof pool.query === 'function');
    
    // Test connection
    pool.query('SELECT NOW()')
      .then(() => {
        console.log('PostgreSQL connected successfully');
      })
      .catch(err => {
        console.error('PostgreSQL connection error:', err.message);
      });
  } catch (err) {
    console.error('ERROR initializing PostgreSQL:', err.message);
    console.error('Stack:', err.stack);
    pool = null;
  }

  // Helper function to convert SQLite ? parameters to PostgreSQL $1, $2, ... format
  const convertQuery = (query, params) => {
    if (!params || params.length === 0) {
      return { query, params: [] };
    }
    
    // Count the number of ? placeholders
    const placeholders = query.match(/\?/g);
    if (!placeholders) {
      return { query, params };
    }
    
    // Replace ? with $1, $2, $3, etc.
    let paramIndex = 1;
    const convertedQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
    
    return { query: convertedQuery, params };
  };

  // Create a database adapter that mimics SQLite API
  db = {
    all: (query, params, callback) => {
      if (!pool) {
        callback(new Error('Database pool not initialized'));
        return;
      }
      if (typeof pool.query !== 'function') {
        callback(new Error('Database pool.query is not a function'));
        return;
      }
      try {
        const { query: convertedQuery, params: convertedParams } = convertQuery(query, params || []);
        const queryPromise = pool.query(convertedQuery, convertedParams);
        if (queryPromise && typeof queryPromise.then === 'function') {
          queryPromise
            .then(result => callback(null, result.rows))
            .catch(err => callback(err));
        } else {
          callback(new Error('Database query did not return a Promise'));
        }
      } catch (err) {
        callback(err);
      }
    },
    get: (query, params, callback) => {
      if (!pool) {
        callback(new Error('Database pool not initialized'));
        return;
      }
      if (typeof pool.query !== 'function') {
        callback(new Error('Database pool.query is not a function'));
        return;
      }
      try {
        const { query: convertedQuery, params: convertedParams } = convertQuery(query, params || []);
        const queryPromise = pool.query(convertedQuery, convertedParams);
        if (queryPromise && typeof queryPromise.then === 'function') {
          queryPromise
            .then(result => callback(null, result.rows[0] || null))
            .catch(err => callback(err));
        } else {
          callback(new Error('Database query did not return a Promise'));
        }
      } catch (err) {
        callback(err);
      }
    },
    run: (query, params, callback) => {
      if (!pool) {
        const error = new Error('Database pool not initialized');
        console.error('Database pool not initialized when trying to run query:', query);
        if (callback) {
          callback.call({ lastID: null, changes: 0 }, error);
        }
        return;
      }
      
      // Ensure pool.query is a function
      if (typeof pool.query !== 'function') {
        const error = new Error('Database pool.query is not a function');
        console.error('Database pool.query is not a function. Pool type:', typeof pool, 'Pool:', pool);
        if (callback) {
          callback.call({ lastID: null, changes: 0 }, error);
        }
        return;
      }
      
      // Convert SQLite ? parameters to PostgreSQL $1, $2, ... format
      let { query: modifiedQuery, params: convertedParams } = convertQuery(query, params || []);
      
      // For INSERT statements, add RETURNING id to get the last inserted ID
      if (modifiedQuery.trim().toUpperCase().startsWith('INSERT')) {
        // Check if RETURNING is already in the query
        if (!modifiedQuery.toUpperCase().includes('RETURNING')) {
          modifiedQuery = modifiedQuery.replace(/;?\s*$/, '') + ' RETURNING id';
        }
      }
      
      try {
        // pool.query always returns a Promise
        const queryPromise = pool.query(modifiedQuery, convertedParams);
        
        if (!queryPromise || typeof queryPromise.then !== 'function') {
          const error = new Error('pool.query did not return a Promise');
          console.error('pool.query did not return a Promise. Returned:', typeof queryPromise, queryPromise);
          if (callback) {
            callback.call({ lastID: null, changes: 0 }, error);
          }
          return;
        }
        
        queryPromise
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
            console.error('Database query error:', err.message, 'Query:', modifiedQuery);
            if (callback) {
              callback.call({ lastID: null, changes: 0 }, err);
            }
          });
      } catch (err) {
        console.error('Error executing database query:', err.message, 'Query:', modifiedQuery);
        if (callback) {
          callback.call({ lastID: null, changes: 0 }, err);
        }
      }
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

