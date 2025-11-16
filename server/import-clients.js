const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'kitesurfing.db');
const CSV_PATH = path.join('c:', 'Users', 'valen', 'OneDrive', 'Área de Trabalho', 'cliente.csv');

// Open database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

db.serialize(() => {
  // First, ensure all required columns exist
  console.log('Checking/adding required columns...');
  db.run(`ALTER TABLE clients ADD COLUMN nationality TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.log('Note: nationality column already exists or error:', err.message);
    }
  });
  db.run(`ALTER TABLE clients ADD COLUMN notes TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.log('Note: notes column already exists or error:', err.message);
    }
  });
  db.run(`ALTER TABLE clients ADD COLUMN cpf TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.log('Note: cpf column already exists or error:', err.message);
    }
  });
  db.run(`ALTER TABLE clients ADD COLUMN birth_date TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.log('Note: birth_date column already exists or error:', err.message);
    }
  });

  // Clear existing clients and reset auto-increment
  db.run('DELETE FROM clients', (err) => {
    if (err) {
      console.error('Error clearing existing clients:', err.message);
      db.close();
      process.exit(1);
    }
    console.log('Cleared existing clients');
    
    db.run("DELETE FROM sqlite_sequence WHERE name='clients'", (err) => {
      if (err && !err.message.includes('no such table')) {
        console.error('Error resetting client ID sequence:', err.message);
      }
      console.log('Reset client ID sequence');

      // Read CSV file
      fs.readFile(CSV_PATH, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading CSV file:', err.message);
          console.error('Trying alternative path...');
          // Try project root
          const altPath = path.join(__dirname, '..', 'cliente.csv');
          fs.readFile(altPath, 'utf8', (err2, data2) => {
            if (err2) {
              console.error('Error reading CSV from alternative path:', err2.message);
              db.close();
              process.exit(1);
            }
            processCSV(data2);
          });
          return;
        }
        processCSV(data);
      });
    });
  });
});

function processCSV(data) {
  const lines = data.split('\n').filter(line => line.trim() !== '');
  const headers = lines[0].split(';').map(h => h.trim());
  
  // Map CSV columns to database columns
  // CSV: idCliente;nomeCliente;telCelular;email;nacionalidade;obs;cpf;data nasc
  // DB:  id;name;phone;email;nationality;notes;cpf;birth_date
  
  const records = lines.slice(1);
  let importedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  db.run('BEGIN TRANSACTION;');

  const stmt = db.prepare(`INSERT INTO clients (id, name, phone, email, nationality, notes, cpf, birth_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

  records.forEach((record, index) => {
    const values = record.split(';').map(v => v.trim());
    
    if (values.length >= 8) {
      const id = parseInt(values[0].trim());
      const name = values[1] || '';
      const phone = values[2] || '';
      const email = values[3] || '';
      const nationality = values[4] || '';
      const notes = values[5] || '';
      const cpf = values[6] || '';
      const birth_date = values[7] || '';

      // Skip if ID is invalid or name is empty
      if (isNaN(id) || !name) {
        console.warn(`Skipping line ${index + 2}: invalid ID or empty name - "${record}"`);
        skippedCount++;
        return;
      }

      stmt.run(id, name, phone, email, nationality, notes, cpf, birth_date, function(err) {
        if (err) {
          console.error(`Error inserting client record ${id} (${name}):`, err.message);
          errorCount++;
        } else {
          importedCount++;
        }
      });
    } else {
      console.warn(`Skipping line ${index + 2}: insufficient columns (${values.length} found, expected 8) - "${record}"`);
      skippedCount++;
    }

    if ((index + 1) % 50 === 0) {
      console.log(`Processed ${index + 1} records...`);
    }
  });

  stmt.finalize((err) => {
    if (err) {
      console.error('Error finalizing statement:', err.message);
      db.run('ROLLBACK;');
      db.close();
      process.exit(1);
    }

    db.run('COMMIT;', (err) => {
      if (err) {
        console.error('Error committing transaction:', err.message);
        db.close();
        process.exit(1);
      }
      
      console.log('\n=== Import completed! ===');
      console.log(`- Imported: ${importedCount} clients`);
      console.log(`- Skipped: ${skippedCount} records`);
      console.log(`- Errors: ${errorCount} records`);
      
      // Update the sqlite_sequence to set the next ID correctly
      db.get("SELECT MAX(id) as maxId FROM clients", (err, row) => {
        if (err) {
          console.error('Error getting max ID:', err.message);
        } else if (row && row.maxId) {
          db.run("INSERT OR REPLACE INTO sqlite_sequence (name, seq) VALUES ('clients', ?)", [row.maxId], (err) => {
            if (err) {
              console.log('Note: Could not update sequence (this is usually fine):', err.message);
            } else {
              console.log(`- Next auto-increment ID set to: ${row.maxId + 1}`);
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
        } else {
          db.close((err) => {
            if (err) {
              console.error('Error closing database:', err.message);
            } else {
              console.log('Database connection closed');
            }
            process.exit(0);
          });
        }
      });
    });
  });
}

