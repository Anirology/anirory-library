import os
import tempfile
import unittest

database_file = os.path.join(tempfile.gettempdir(), "anirory-api-tests.sqlite3")
os.environ["DATABASE_URL"] = f"sqlite:///{database_file}"

from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app


class BookApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
        if os.path.exists(database_file):
            os.remove(database_file)

    def test_complete_crud_and_query_flow(self):
        first = {"title": "Clean Architecture", "author": "Robert Martin", "price": "3200.00", "category": "Technology", "available": True}
        second = {"title": "Ocean Atlas", "author": "Maya Senanayake", "price": "1800.00", "category": "Science", "available": False}

        created = self.client.post("/books", json=first)
        self.assertEqual(created.status_code, 201)
        book_id = created.json()["id"]
        self.assertEqual(self.client.post("/books", json=second).status_code, 201)

        fetched = self.client.get(f"/books/{book_id}")
        self.assertEqual(fetched.status_code, 200)
        self.assertEqual(fetched.json()["title"], first["title"])

        listing = self.client.get("/books", params={"search": "Architecture", "category": "Technology", "available": True, "max_price": 4000, "sort": "title", "page": 1, "page_size": 10})
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.json()["total"], 1)

        replaced = self.client.put(f"/books/{book_id}", json={**first, "title": "Clean Architecture, Revised", "price": "3500.00"})
        self.assertEqual(replaced.status_code, 200)
        self.assertEqual(replaced.json()["title"], "Clean Architecture, Revised")

        patched = self.client.patch(f"/books/{book_id}", json={"available": False})
        self.assertEqual(patched.status_code, 200)
        self.assertFalse(patched.json()["available"])

        deleted = self.client.delete(f"/books/{book_id}")
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(self.client.get(f"/books/{book_id}").status_code, 404)

    def test_validation_and_missing_records(self):
        invalid = self.client.post("/books", json={"title": "x", "author": "y", "price": 0, "category": "z", "available": True})
        self.assertEqual(invalid.status_code, 422)
        self.assertEqual(self.client.patch("/books/999999", json={"available": True}).status_code, 404)
        self.assertEqual(self.client.delete("/books/999999").status_code, 404)


if __name__ == "__main__":
    unittest.main()
