const express = require('express');
const { initializeDatabase, getDB } = require('./db');

const app = express();

// Parse JSON request bodies
app.use(express.json());

// Handle malformed JSON body errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON payload format' });
  }
  next();
});

let db = null;

// ==========================================
// 0. GET / - Welcome & API Endpoints Overview
// ==========================================
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to Books REST API. Access the books collection at /books',
    endpoints: {
      getAllBooks: 'GET /books',
      getBookById: 'GET /books/:bookId',
      createBook: 'POST /books',
      updateBook: 'PUT /books/:bookId',
      deleteBook: 'DELETE /books/:bookId',
    },
  });
});

// Alias for singular /book
app.get('/book', (req, res) => {
  res.redirect('/books');
});

// ==========================================
// 1. GET /books/ - Search, Sort, Filter, Paginate
// ==========================================
app.get('/books', async (req, res) => {
  try {
    const {
      search_q = '',
      order_by = 'id',
      order = 'ASC',
      limit = '10',
      offset = '0',
      min_price,
      max_price,
    } = req.query;

    // Allowed columns for sorting (Strict Allowlist to prevent SQL injection)
    const allowedOrderBy = ['id', 'title', 'author', 'price', 'pages'];
    const safeOrderBy = order_by.toLowerCase();
    if (!allowedOrderBy.includes(safeOrderBy)) {
      return res.status(400).json({
        message: `Invalid order_by field. Allowed fields: ${allowedOrderBy.join(', ')}`,
      });
    }

    // Allowed sort directions (Strict Allowlist)
    const safeOrder = order.toUpperCase();
    if (safeOrder !== 'ASC' && safeOrder !== 'DESC') {
      return res.status(400).json({
        message: 'Invalid order direction. Allowed values: ASC, DESC',
      });
    }

    // Validate limit parameter
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
      return res.status(400).json({
        message: 'Invalid limit parameter. Must be a positive integer',
      });
    }

    // Validate offset parameter
    const parsedOffset = Number(offset);
    if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({
        message: 'Invalid offset parameter. Must be a non-negative integer',
      });
    }

    // Dynamic SQL conditions and parameter bindings
    const conditions = [];
    const params = [];

    // Search by partial title (case-insensitive in SQLite LIKE)
    if (search_q !== undefined && search_q.trim() !== '') {
      conditions.push('title LIKE ?');
      params.push(`%${search_q.trim()}%`);
    }

    // Validate and apply min_price filter
    let parsedMinPrice;
    if (min_price !== undefined) {
      parsedMinPrice = Number(min_price);
      if (isNaN(parsedMinPrice) || parsedMinPrice < 0) {
        return res.status(400).json({
          message: 'Invalid min_price parameter. Must be a valid non-negative number',
        });
      }
      conditions.push('price >= ?');
      params.push(parsedMinPrice);
    }

    // Validate and apply max_price filter
    let parsedMaxPrice;
    if (max_price !== undefined) {
      parsedMaxPrice = Number(max_price);
      if (isNaN(parsedMaxPrice) || parsedMaxPrice < 0) {
        return res.status(400).json({
          message: 'Invalid max_price parameter. Must be a valid non-negative number',
        });
      }
      conditions.push('price <= ?');
      params.push(parsedMaxPrice);
    }

    // Validate price range if both are provided
    if (parsedMinPrice !== undefined && parsedMaxPrice !== undefined) {
      if (parsedMinPrice > parsedMaxPrice) {
        return res.status(400).json({
          message: 'min_price cannot be greater than max_price',
        });
      }
    }

    // Construct the SQL query
    let query = 'SELECT * FROM book';
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY ${safeOrderBy} ${safeOrder}`;
    query += ' LIMIT ? OFFSET ?;';
    params.push(parsedLimit, parsedOffset);

    // Execute parameterized query
    const books = await db.all(query, params);
    return res.status(200).json(books);
  } catch (error) {
    console.error('Error fetching books:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ==========================================
// 2. GET /books/:bookId/ - Retrieve One Book
// ==========================================
app.get('/books/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const id = Number(bookId);

    // Validate book ID
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid book ID. Must be a positive integer' });
    }

    const book = await db.get('SELECT * FROM book WHERE id = ?;', [id]);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    return res.status(200).json(book);
  } catch (error) {
    console.error('Error fetching book by ID:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ==========================================
// 3. POST /books/ - Create a New Book
// ==========================================
app.post('/books', async (req, res) => {
  try {
    const { title, author, price, pages } = req.body || {};

    // Validate title
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ message: 'Title is required and must be a non-empty string' });
    }

    // Validate author
    if (!author || typeof author !== 'string' || author.trim() === '') {
      return res.status(400).json({ message: 'Author is required and must be a non-empty string' });
    }

    // Validate price
    if (
      price === undefined ||
      price === null ||
      typeof price === 'boolean' ||
      isNaN(Number(price)) ||
      Number(price) < 0
    ) {
      return res.status(400).json({ message: 'Price is required and must be a valid non-negative number' });
    }

    // Validate pages (optional, but if provided must be a positive integer)
    let parsedPages = null;
    if (pages !== undefined && pages !== null) {
      const pagesNum = Number(pages);
      if (!Number.isInteger(pagesNum) || pagesNum <= 0) {
        return res.status(400).json({ message: 'Pages must be a positive integer' });
      }
      parsedPages = pagesNum;
    }

    // Insert book into database using parameterized query
    const result = await db.run(
      'INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?);',
      [title.trim(), author.trim(), Number(price), parsedPages]
    );

    return res.status(201).json({
      message: 'Book created successfully',
      bookId: result.lastID,
    });
  } catch (error) {
    console.error('Error creating book:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ==========================================
// 4. PUT /books/:bookId/ - Update an Existing Book
// ==========================================
app.put('/books/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const id = Number(bookId);

    // Validate book ID
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid book ID. Must be a positive integer' });
    }

    // Check if book exists
    const existingBook = await db.get('SELECT * FROM book WHERE id = ?;', [id]);
    if (!existingBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const { title, author, price, pages } = req.body || {};

    // Validate title
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ message: 'Title is required and must be a non-empty string' });
    }

    // Validate author
    if (!author || typeof author !== 'string' || author.trim() === '') {
      return res.status(400).json({ message: 'Author is required and must be a non-empty string' });
    }

    // Validate price
    if (
      price === undefined ||
      price === null ||
      typeof price === 'boolean' ||
      isNaN(Number(price)) ||
      Number(price) < 0
    ) {
      return res.status(400).json({ message: 'Price is required and must be a valid non-negative number' });
    }

    // Validate pages (optional, but if provided must be a positive integer)
    let parsedPages = null;
    if (pages !== undefined && pages !== null) {
      const pagesNum = Number(pages);
      if (!Number.isInteger(pagesNum) || pagesNum <= 0) {
        return res.status(400).json({ message: 'Pages must be a positive integer' });
      }
      parsedPages = pagesNum;
    }

    // Update book details
    await db.run(
      'UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?;',
      [title.trim(), author.trim(), Number(price), parsedPages, id]
    );

    return res.status(200).json({ message: 'Book updated successfully' });
  } catch (error) {
    console.error('Error updating book:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// ==========================================
// 5. DELETE /books/:bookId/ - Delete a Book
// ==========================================
app.delete('/books/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    const id = Number(bookId);

    // Validate book ID
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid book ID. Must be a positive integer' });
    }

    // Check if book exists
    const existingBook = await db.get('SELECT * FROM book WHERE id = ?;', [id]);
    if (!existingBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    // Delete the book
    await db.run('DELETE FROM book WHERE id = ?;', [id]);

    return res.status(200).json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting book:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Catch-all 404 for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ==========================================
// Server Initialization
// ==========================================
const PORT = process.env.PORT || 3000;

async function initializeDBAndServer() {
  try {
    db = await initializeDatabase();
    console.log('Database connected successfully (books.db).');

    const server = app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}/`);
      console.log(`Access API at: http://localhost:${PORT}/books`);
    });

    return server;
  } catch (error) {
    console.error('Failed to initialize database and server:', error.message);
    process.exit(1);
  }
}

// Start server when executed directly
if (require.main === module) {
  initializeDBAndServer();
}

module.exports = { app, initializeDBAndServer };
