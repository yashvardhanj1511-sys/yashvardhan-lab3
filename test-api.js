/**
 * Automated Verification Script for Lab 3 REST API
 * Tests all 25 scenarios covering:
 * - GET with search, sort, filter, pagination
 * - GET single existing, nonexistent, invalid ID
 * - POST valid book and all validation errors
 * - PUT valid book and validation errors
 * - DELETE valid book, nonexistent, invalid ID
 */

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log('   Starting Comprehensive Lab 3 REST API Test Suite  ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name} -> Error: ${err.message}`);
      failed++;
    }
  }

  // 1. GET /books
  await test('1. GET /books - Retrieve all books', async () => {
    const res = await fetch(`${BASE_URL}/books`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Response is not an array');
    if (data.length === 0) throw new Error('Expected books in response');
  });

  // 2. GET /books?search_q=harry
  await test('2. GET /books?search_q=harry - Partial title search', async () => {
    const res = await fetch(`${BASE_URL}/books?search_q=harry`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('No books matched');
    for (const b of data) {
      if (!b.title.toLowerCase().includes('harry')) {
        throw new Error(`Book title "${b.title}" does not contain "harry"`);
      }
    }
  });

  // 3. GET /books?order_by=title&order=ASC
  await test('3. GET /books?order_by=title&order=ASC - Sort title ASC', async () => {
    const res = await fetch(`${BASE_URL}/books?order_by=title&order=ASC`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    for (let i = 1; i < data.length; i++) {
      if (data[i - 1].title.localeCompare(data[i].title) > 0) {
        throw new Error(`Order violated: "${data[i - 1].title}" comes after "${data[i].title}"`);
      }
    }
  });

  // 4. GET /books?order_by=price&order=DESC
  await test('4. GET /books?order_by=price&order=DESC - Sort price DESC', async () => {
    const res = await fetch(`${BASE_URL}/books?order_by=price&order=DESC`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    for (let i = 1; i < data.length; i++) {
      if (data[i - 1].price < data[i].price) {
        throw new Error(`Price order violated: ${data[i - 1].price} < ${data[i].price}`);
      }
    }
  });

  // 5. GET /books?limit=3&offset=0
  await test('5. GET /books?limit=3&offset=0 - Pagination', async () => {
    const res = await fetch(`${BASE_URL}/books?limit=3&offset=0`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    if (data.length > 3) throw new Error(`Expected max 3 records, got ${data.length}`);
  });

  // 6. GET /books?min_price=500
  await test('6. GET /books?min_price=500 - Filter min_price', async () => {
    const res = await fetch(`${BASE_URL}/books?min_price=500`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    for (const b of data) {
      if (b.price < 500) throw new Error(`Book price ${b.price} is less than 500`);
    }
  });

  // 7. GET /books?max_price=300
  await test('7. GET /books?max_price=300 - Filter max_price', async () => {
    const res = await fetch(`${BASE_URL}/books?max_price=300`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    for (const b of data) {
      if (b.price > 300) throw new Error(`Book price ${b.price} is greater than 300`);
    }
  });

  // 8. GET /books?min_price=200&max_price=600
  await test('8. GET /books?min_price=200&max_price=600 - Price range', async () => {
    const res = await fetch(`${BASE_URL}/books?min_price=200&max_price=600`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    for (const b of data) {
      if (b.price < 200 || b.price > 600) {
        throw new Error(`Book price ${b.price} is out of bounds [200, 600]`);
      }
    }
  });

  // 9. Combined query
  await test('9. GET combined query (search, sort, limit, offset, price range)', async () => {
    const res = await fetch(`${BASE_URL}/books?search_q=harry&order_by=price&order=ASC&limit=5&offset=0&min_price=100&max_price=1000`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Expected array');
    for (const b of data) {
      if (!b.title.toLowerCase().includes('harry')) throw new Error('Missing keyword');
      if (b.price < 100 || b.price > 1000) throw new Error('Out of price range');
    }
  });

  // 10. GET /books/1
  await test('10. GET /books/1 - Retrieve existing book', async () => {
    const res = await fetch(`${BASE_URL}/books/1`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const book = await res.json();
    if (book.id !== 1) throw new Error(`Expected ID 1, got ${book.id}`);
  });

  // 11. GET /books/999 (404)
  await test('11. GET /books/999 - Nonexistent book returns 404', async () => {
    const res = await fetch(`${BASE_URL}/books/999`);
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    const body = await res.json();
    if (body.message !== 'Book not found') throw new Error(`Expected 'Book not found', got ${body.message}`);
  });

  // 12. GET /books/abc (400)
  await test('12. GET /books/abc - Invalid book ID returns 400', async () => {
    const res = await fetch(`${BASE_URL}/books/abc`);
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const body = await res.json();
    if (!body.message.includes('Invalid book ID')) throw new Error(`Unexpected message: ${body.message}`);
  });

  // 13. GET /books?order_by=salary (400)
  await test('13. GET /books?order_by=salary - Disallowed order_by returns 400', async () => {
    const res = await fetch(`${BASE_URL}/books?order_by=salary`);
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 14. POST /books - Valid book
  let createdBookId = null;
  await test('14. POST /books - Create valid book returns 201', async () => {
    const res = await fetch(`${BASE_URL}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Design Patterns',
        author: 'Erich Gamma et al.',
        price: 650,
        pages: 395,
      }),
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    const data = await res.json();
    if (data.message !== 'Book created successfully') throw new Error(`Unexpected message: ${data.message}`);
    if (!data.bookId) throw new Error('Missing created bookId');
    createdBookId = data.bookId;
  });

  // 15. POST /books - Missing title (400)
  await test('15. POST /books - Missing title returns 400', async () => {
    const res = await fetch(`${BASE_URL}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: 'Unknown Author',
        price: 300,
        pages: 200,
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const data = await res.json();
    if (!data.message.includes('Title is required')) throw new Error(`Unexpected message: ${data.message}`);
  });

  // 16. POST /books - Missing author (400)
  await test('16. POST /books - Missing author returns 400', async () => {
    const res = await fetch(`${BASE_URL}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Unknown Book',
        price: 300,
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const data = await res.json();
    if (!data.message.includes('Author is required')) throw new Error(`Unexpected message: ${data.message}`);
  });

  // 17. POST /books - Missing price (400)
  await test('17. POST /books - Missing price returns 400', async () => {
    const res = await fetch(`${BASE_URL}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Free Book',
        author: 'Generous Author',
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    const data = await res.json();
    if (!data.message.includes('Price is required')) throw new Error(`Unexpected message: ${data.message}`);
  });

  // 18. POST /books - Non-numeric price (400)
  await test('18. POST /books - Non-numeric price returns 400', async () => {
    const res = await fetch(`${BASE_URL}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Expensive Book',
        author: 'Elite Author',
        price: 'one thousand',
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 19. POST /books - Empty body (400)
  await test('19. POST /books - Empty body returns 400', async () => {
    const res = await fetch(`${BASE_URL}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 20. PUT /books/:id - Valid update (200)
  await test('20. PUT /books/1 - Update existing book returns 200', async () => {
    const res = await fetch(`${BASE_URL}/books/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: "Harry Potter and the Sorcerer's Stone (Special Edition)",
        author: 'J.K. Rowling',
        price: 599,
        pages: 350,
      }),
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    if (data.message !== 'Book updated successfully') throw new Error(`Unexpected message: ${data.message}`);
  });

  // 21. PUT /books/999 - Nonexistent book returns 404
  await test('21. PUT /books/999 - Nonexistent book returns 404', async () => {
    const res = await fetch(`${BASE_URL}/books/999`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Ghost Book',
        author: 'Nobody',
        price: 100,
        pages: 50,
      }),
    });
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    const data = await res.json();
    if (data.message !== 'Book not found') throw new Error(`Unexpected message: ${data.message}`);
  });

  // 22. PUT /books/1 - Invalid data returns 400
  await test('22. PUT /books/1 - Invalid data returns 400', async () => {
    const res = await fetch(`${BASE_URL}/books/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '',
        author: 'Author',
        price: -50,
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 23. DELETE /books/:id - Delete created book (200)
  await test(`23. DELETE /books/${createdBookId || 10} - Delete book returns 200`, async () => {
    const targetId = createdBookId || 10;
    const res = await fetch(`${BASE_URL}/books/${targetId}`, {
      method: 'DELETE',
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json();
    if (data.message !== 'Book deleted successfully') throw new Error(`Unexpected message: ${data.message}`);
  });

  // 24. DELETE /books/999 - Nonexistent book returns 404
  await test('24. DELETE /books/999 - Nonexistent book returns 404', async () => {
    const res = await fetch(`${BASE_URL}/books/999`, {
      method: 'DELETE',
    });
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    const data = await res.json();
    if (data.message !== 'Book not found') throw new Error(`Unexpected message: ${data.message}`);
  });

  // 25. DELETE /books/invalid-id - Invalid ID returns 400
  await test('25. DELETE /books/invalid-id - Invalid ID returns 400', async () => {
    const res = await fetch(`${BASE_URL}/books/invalid-id`, {
      method: 'DELETE',
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // Restore Book 1 to its original state for clean database presentation
  try {
    await fetch(`${BASE_URL}/books/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: "Harry Potter and the Sorcerer's Stone",
        author: 'J.K. Rowling',
        price: 499,
        pages: 309,
      }),
    });
  } catch (e) {
    // Ignore cleanup error
  }

  console.log('\n====================================================');
  console.log(`Test Execution Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
