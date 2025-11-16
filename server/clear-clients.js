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

db.run('DELETE FROM clients', function(err) {
  if (err) {
    console.error('Error clearing clients:', err.message);
    db.close();
    process.exit(1);
  } else {
    console.log(`Successfully deleted ${this.changes} client(s) from the database`);
    
    // Optionally reset the auto-increment counter
    db.run("DELETE FROM sqlite_sequence WHERE name='clients'", (err) => {
      if (err && !err.message.includes('no such table')) {
        console.error('Error resetting sequence:', err.message);
      }
      
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database connection closed');
        }
        process.exit(0);
      });
    });
  }
});

