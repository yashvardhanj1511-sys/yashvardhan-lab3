const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const DB_PATH = path.join(__dirname, 'books.db');

let db = null;

/**
 * Initializes the SQLite database connection, creates the book table
 * if it doesn't already exist, and seeds 10 sample records if the table is empty.
 * Existing records are preserved.
 */
async function initializeDatabase() {
  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  // Create table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS book (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price INTEGER,
      pages INTEGER
    );
  `);

  // Check if records already exist
  const countResult = await db.get('SELECT COUNT(*) AS count FROM book;');
  if (countResult && countResult.count === 0) {
    const sampleBooks = [
      { title: "Harry Potter and the Sorcerer's Stone", author: "J.K. Rowling", price: 499, pages: 309 },
      { title: "Harry Potter and the Chamber of Secrets", author: "J.K. Rowling", price: 550, pages: 341 },
      { title: "The Hobbit", author: "J.R.R. Tolkien", price: 399, pages: 310 },
      { title: "The Fellowship of the Ring", author: "J.R.R. Tolkien", price: 799, pages: 423 },
      { title: "1984", author: "George Orwell", price: 299, pages: 328 },
      { title: "Animal Farm", author: "George Orwell", price: 199, pages: 112 },
      { title: "To Kill a Mockingbird", author: "Harper Lee", price: 349, pages: 281 },
      { title: "The Great Gatsby", author: "F. Scott Fitzgerald", price: 249, pages: 180 },
      { title: "Clean Code", author: "Robert C. Martin", price: 850, pages: 464 },
      { title: "The Pragmatic Programmer", author: "David Thomas & Andrew Hunt", price: 950, pages: 352 },
    ];

    for (const book of sampleBooks) {
      await db.run(
        'INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?);',
        [book.title, book.author, book.price, book.pages]
      );
    }
    console.log(`Successfully seeded ${sampleBooks.length} sample books.`);
  } else {
    console.log(`Database already contains ${countResult.count} books. Preserving existing records.`);
  }

  return db;
}

/**
 * Returns the active database instance.
 */
function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Please call initializeDatabase() first.');
  }
  return db;
}

module.exports = {
  initializeDatabase,
  getDB,
  DB_PATH,
};
