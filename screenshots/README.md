# Screenshots Directory

Store your Lab 3 Postman testing screenshots in this directory.

Suggested screenshots:
1. `01-get-all-books.png` - GET /books/ showing all books
2. `02-search-title.png` - GET /books/?search_q=harry
3. `03-sort-by-price-desc.png` - GET /books/?order_by=price&order=DESC
4. `04-pagination.png` - GET /books/?limit=3&offset=0
5. `05-price-filtering.png` - GET /books/?min_price=200&max_price=800
6. `06-combined-query.png` - GET /books/?search_q=harry&order_by=price&order=ASC&limit=5&offset=0&min_price=100&max_price=1000
7. `07-get-book-by-id.png` - GET /books/1
8. `08-post-create-book.png` - POST /books/ with 201 Created
9. `09-post-validation-error.png` - POST /books/ missing title with 400 Bad Request
10. `10-put-update-book.png` - PUT /books/1 with 200 OK
11. `11-delete-book.png` - DELETE /books/:id with 200 OK
12. `12-error-404-not-found.png` - GET /books/999 with 404 Not Found
