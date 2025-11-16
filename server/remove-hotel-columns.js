const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'kitesurfing.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
db.serialize(() => {
  console.log('Removing rating and capacity columns from hotels table...');
  
  // Step 1: Create new table without rating and capacity
  db.run(`
    CREATE TABLE IF NOT EXISTS hotels_new (
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
  `, (err) => {
    if (err) {
      console.error('Error creating new table:', err.message);
      db.close();
      process.exit(1);
    }
    console.log('Created new hotels table structure');
    
    // Step 2: Copy data from old table to new table (excluding rating and capacity)
    db.run(`
      INSERT INTO hotels_new (id, name, location, address, phone, email, website, pix, notes, created_at)
      SELECT id, name, location, address, phone, email, website, pix, notes, created_at
      FROM hotels
    `, (err) => {
      if (err) {
        console.error('Error copying data:', err.message);
        db.close();
        process.exit(1);
      }
      console.log('Copied data to new table');
      
      // Step 3: Drop old table
      db.run('DROP TABLE hotels', (err) => {
        if (err) {
          console.error('Error dropping old table:', err.message);
          db.close();
          process.exit(1);
        }
        console.log('Dropped old hotels table');
        
        // Step 4: Rename new table to hotels
        db.run('ALTER TABLE hotels_new RENAME TO hotels', (err) => {
          if (err) {
            console.error('Error renaming table:', err.message);
            db.close();
            process.exit(1);
          }
          console.log('Renamed new table to hotels');
          console.log('\n=== Migration completed successfully! ===');
          console.log('Rating and capacity columns have been removed from hotels table');
          db.close((err) => {
            if (err) {
              console.error('Error closing database:', err.message);
            } else {
              console.log('Database connection closed');
            }
          });
        });
      });
    });
  });
});

