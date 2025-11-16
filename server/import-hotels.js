const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');

const DB_PATH = path.join(__dirname, 'kitesurfing.db');
// Try multiple possible CSV paths
const CSV_PATHS = [
  path.join(__dirname, '..', 'hotel.csv'),
  'C:\\Users\\valen\\OneDrive\\Área de Trabalho\\hotel.csv',
  path.join('C:', 'Users', 'valen', 'OneDrive', 'Área de Trabalho', 'hotel.csv')
];

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

async function ensureHotelsTableColumns() {
  return new Promise((resolve, reject) => {
    console.log('Checking/adding required columns...');
    db.serialize(() => {
      // Add website column
      db.run(`ALTER TABLE hotels ADD COLUMN website TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding website column:', err.message);
        }
      });
      // Add pix column
      db.run(`ALTER TABLE hotels ADD COLUMN pix TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding pix column:', err.message);
        }
      });
      // Add notes column
      db.run(`ALTER TABLE hotels ADD COLUMN notes TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding notes column:', err.message);
        }
      });
      // Make location optional (remove NOT NULL constraint by recreating if needed)
      // SQLite doesn't support ALTER COLUMN, so we'll handle empty locations
      resolve();
    });
  });
}

async function clearHotelsTable() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('DELETE FROM hotels', function(err) {
        if (err) {
          console.error('Error clearing hotels:', err.message);
          return reject(err);
        }
        console.log('Cleared existing hotels');
        db.run("DELETE FROM sqlite_sequence WHERE name='hotels'", (err) => {
          if (err && !err.message.includes('no such table')) {
            console.error('Error resetting sequence:', err.message);
          }
          console.log('Reset hotel ID sequence');
          resolve();
        });
      });
    });
  });
}

// Find CSV file
let CSV_FILE_PATH = null;
for (const csvPath of CSV_PATHS) {
  if (fs.existsSync(csvPath)) {
    CSV_FILE_PATH = csvPath;
    console.log(`Found CSV file at: ${CSV_FILE_PATH}`);
    break;
  }
}

if (!CSV_FILE_PATH) {
  console.error(`CSV file not found. Tried paths:`);
  CSV_PATHS.forEach(p => console.error(`  - ${p}`));
  console.log('Please ensure hotel.csv is accessible');
  process.exit(1);
}

// Update the parser to use the found path
async function importHotelsWithPath() {
  await ensureHotelsTableColumns();
  await clearHotelsTable();

  let records = [];
  let importedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let maxId = 0;

  const parser = fs.createReadStream(CSV_FILE_PATH).pipe(
    parse({
      delimiter: ';',
      columns: true, // Use first row as column names
      skip_empty_lines: true,
      trim: true,
      on_record: (record, { lines }) => {
        // Handle BOM in column names - remove BOM character if present
        const idKey = Object.keys(record).find(key => key.includes('id_hotel')) || 'id_hotel';
        const idValue = record[idKey] || record['﻿id_hotel'] || record.id_hotel;
        
        // Map CSV columns to database columns
        const mappedRecord = {
          id: parseInt(idValue),
          name: record.nome_reduzido || record['nome_reduzido'],
          location: '', // CSV doesn't have location, set to empty
          address: '', // CSV doesn't have address, set to empty
          phone: record.telefone1,
          email: record.email,
          website: record.website,
          pix: record.pix,
          notes: record.obs,
          rating: null, // CSV doesn't have rating
          capacity: null // CSV doesn't have capacity
        };

        // Basic validation
        if (!mappedRecord.id || !mappedRecord.name) {
          console.warn(`Skipping line ${lines}: missing ID or Name - ${JSON.stringify(record)}`);
          skippedCount++;
          return null; // Skip this record
        }

        // Update maxId for auto-increment reset
        if (mappedRecord.id > maxId) {
          maxId = mappedRecord.id;
        }

        return mappedRecord;
      },
    })
  );

  parser.on('readable', function() {
    let record;
    while ((record = parser.read()) !== null) {
      records.push(record);
      if (records.length % 50 === 0) {
        console.log(`Processed ${records.length} records...`);
      }
    }
  });

  parser.on('error', function(err) {
    console.error('CSV parsing error:', err.message);
    errorCount++;
  });

  parser.on('end', async function() {
    db.serialize(() => {
      db.exec('BEGIN TRANSACTION;');
      const stmt = db.prepare(
        `INSERT INTO hotels (id, name, location, address, phone, email, website, pix, notes, rating, capacity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      records.forEach((record) => {
        stmt.run(
          [
            record.id,
            record.name,
            record.location,
            record.address,
            record.phone,
            record.email,
            record.website,
            record.pix,
            record.notes,
            record.rating,
            record.capacity
          ],
          function(err) {
            if (err) {
              console.error(`Error inserting hotel ID ${record.id}:`, err.message);
              errorCount++;
            } else {
              importedCount++;
            }
          }
        );
      });

      stmt.finalize();

      db.exec('COMMIT;', (err) => {
        if (err) {
          console.error('Transaction commit error:', err.message);
          errorCount++;
        } else {
          console.log('\n=== Import completed! ===');
          console.log(`- Imported: ${importedCount} hotels`);
          console.log(`- Skipped: ${skippedCount} records`);
          console.log(`- Errors: ${errorCount} records`);

          // Reset auto-increment sequence to continue from maxId + 1
          db.run(`UPDATE sqlite_sequence SET seq = ? WHERE name = 'hotels'`, [maxId], (err) => {
            if (err) {
              console.error('Error setting auto-increment sequence:', err.message);
            } else {
              console.log(`- Next auto-increment ID set to: ${maxId + 1}`);
            }
            db.close((err) => {
              if (err) {
                console.error('Error closing database:', err.message);
              } else {
                console.log('Database connection closed');
              }
            });
          });
        }
      });
    });
  });
}

importHotelsWithPath();

