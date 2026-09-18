import unittest
from datetime import date, datetime, timedelta

from tests import test_books  # Configure the isolated test database before importing the app.
from fastapi.testclient import TestClient
from sqlalchemy import select
from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import AuthSession, User
from app.timeutils import utcnow


class AuthorizationTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        self.client = TestClient(app)
        with SessionLocal() as db:
            for role in ("admin", "librarian", "user"):
                db.add(User(email=f"{role}@example.com", name=role, role=role, password_hash=hash_password("secure-password-123")))
            db.commit()

    def tearDown(self):
        self.client.close()
        Base.metadata.drop_all(engine)

    def sign_in(self, role="admin"):
        response = self.client.post("/auth/login", json={"email": f"{role}@example.com", "password": "secure-password-123"})
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("password_hash", response.json()["user"])
        self.client.headers["Authorization"] = f"Bearer {response.json()['access_token']}"
        return response.json()

    def test_authentication_logout_and_expiry(self):
        with TestClient(app) as started:
            self.assertEqual(started.get("/health").status_code, 200)
        for route in ("/books", "/members", "/loans", "/dashboard", "/users", "/auth/me"):
            self.assertEqual(self.client.get(route).status_code, 401)
        result = self.sign_in()
        self.assertEqual(self.client.get("/auth/me").status_code, 200)
        with SessionLocal() as db:
            session = db.scalar(select(AuthSession))
            self.assertNotEqual(session.token_hash, result["access_token"])
            session.expires_at = utcnow() - timedelta(seconds=1)
            db.commit()
        self.assertEqual(self.client.get("/auth/me").status_code, 401)
        self.sign_in()
        self.assertEqual(self.client.post("/auth/logout").status_code, 204)
        self.assertEqual(self.client.get("/books").status_code, 401)

    def test_roles_and_user_management(self):
        user = self.sign_in("user")
        self.assertEqual(self.client.get("/books").status_code, 200)
        for route in ("/members", "/members/1", "/loans"):
            self.assertEqual(self.client.get(route).status_code, 403)
        for method, route in (("put", "/books/1"), ("patch", "/books/1"),
                              ("delete", "/books/1"), ("put", "/members/1"),
                              ("delete", "/members/1"), ("post", "/loans/1/return"),
                              ("patch", "/users/1")):
            self.assertEqual(self.client.request(method, route, json={}).status_code, 403)
        for route in ("/books", "/members", "/loans", "/users"):
            self.assertEqual(self.client.post(route, json={}).status_code, 403)
        self.assertEqual(self.client.get("/users").status_code, 403)
        self.sign_in("librarian")
        self.assertEqual(self.client.get("/users").status_code, 403)
        self.assertEqual(self.client.post("/users", json={}).status_code, 403)
        self.assertEqual(self.client.patch("/users/1", json={}).status_code, 403)
        self.sign_in()
        self.assertEqual(self.client.patch(f"/users/{user['user']['id']}", json={"role": "librarian"}).status_code, 200)
        self.assertEqual(self.client.get("/auth/me", headers={"Authorization": f"Bearer {user['access_token']}"}).status_code, 401)
        payload = {"email": "new@example.com", "name": "New Staff", "password": "new-password-123", "role": "librarian"}
        created = self.client.post("/users", json=payload)
        self.assertEqual(created.status_code, 201)
        self.assertEqual(self.client.post("/users", json=payload).status_code, 409)
        self.assertEqual(self.client.patch(f"/users/{created.json()['id']}", json={"active": False}).status_code, 200)
        me = self.client.get("/auth/me").json()
        self.assertEqual(self.client.patch(f"/users/{me['id']}", json={"role": "user"}).status_code, 409)
        self.assertEqual(self.client.post("/auth/login", json={"email": payload["email"], "password": payload["password"]}).status_code, 401)

    def test_only_three_roles_and_default_user(self):
        self.sign_in()
        payload = {"email": "default@example.com", "name": "Default User", "password": "secure-password-123"}
        response = self.client.post("/users", json=payload)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["role"], "user")
        for role in ("viewer", "owner", "Admin"):
            self.assertEqual(self.client.post("/users", json={**payload, "role": role}).status_code, 422)
            self.assertEqual(self.client.patch(f"/users/{response.json()['id']}", json={"role": role}).status_code, 422)
        self.assertEqual(self.client.get("/auth/me", headers={"Authorization": "Bearer forged"}).status_code, 401)

    def test_login_throttle_and_password_revocation(self):
        for _ in range(5):
            self.assertEqual(self.client.post("/auth/login", json={"email": "user@example.com", "password": "wrong"}).status_code, 401)
        self.assertEqual(self.client.post("/auth/login", json={"email": "user@example.com", "password": "secure-password-123"}).status_code, 429)
        self.sign_in()
        self.assertEqual(self.client.post("/auth/password", json={"current_password": "wrong", "new_password": "replacement-password"}).status_code, 400)
        self.assertEqual(self.client.post("/auth/password", json={"current_password": "secure-password-123", "new_password": "replacement-password"}).status_code, 204)
        self.assertEqual(self.client.get("/auth/me").status_code, 401)
        self.assertEqual(self.client.post("/auth/login", json={"email": "admin@example.com", "password": "replacement-password"}).status_code, 200)

    def test_persistent_member_and_circulation_workflow(self):
        self.sign_in("librarian")
        member_payload = {"name": "Library Member", "email": "member@example.com", "type": "Student"}
        member = self.client.post("/members", json=member_payload)
        self.assertEqual(member.status_code, 201)
        self.assertEqual(self.client.post("/members", json=member_payload).status_code, 409)
        book = self.client.post("/books", json={"title": "Loan Book", "author": "Test Author", "price": "10.00", "category": "Science"}).json()
        payload = {"book_id": book["id"], "member_id": member.json()["id"], "due_date": (date.today() + timedelta(days=14)).isoformat()}
        loan = self.client.post("/loans", json=payload)
        self.assertEqual(loan.status_code, 201)
        self.assertEqual(self.client.post("/loans", json=payload).status_code, 409)
        self.assertEqual(self.client.patch(f"/books/{book['id']}", json={"available": True}).status_code, 409)
        self.assertEqual(self.client.delete(f"/books/{book['id']}").status_code, 409)
        self.assertEqual(self.client.get("/members").json()[0]["loans"], 1)
        self.assertEqual(self.client.get("/dashboard").json()["active_loans"], 1)
        self.assertEqual(self.client.post(f"/loans/{loan.json()['id']}/return").status_code, 200)
        self.assertEqual(self.client.post(f"/loans/{loan.json()['id']}/return").status_code, 409)
        self.assertTrue(self.client.get(f"/books/{book['id']}").json()["available"])
        self.assertEqual(self.client.get("/loans").json(), [])
        self.assertEqual(len(self.client.get("/loans", params={"active": False}).json()), 1)
        self.assertEqual(self.client.delete(f"/members/{member.json()['id']}").status_code, 409)

    def test_member_lifecycle_and_invalid_checkout(self):
        self.sign_in()
        payload = {"name": "New Member", "email": "new.member@example.com", "type": "Adult"}
        member = self.client.post("/members", json=payload).json()
        self.assertEqual(self.client.put(f"/members/{member['id']}", json={**payload, "active": False}).status_code, 200)
        book = self.client.post("/books", json={"title": "Available Book", "author": "Test Author", "price": "10.00", "category": "Science"}).json()
        loan = {"book_id": book["id"], "member_id": member["id"], "due_date": date.today().isoformat()}
        self.assertEqual(self.client.post("/loans", json=loan).status_code, 409)
        self.assertEqual(self.client.post("/loans", json={**loan, "member_id": 99999}).status_code, 404)
        self.assertEqual(self.client.post("/loans", json={**loan, "due_date": (date.today() - timedelta(days=1)).isoformat()}).status_code, 422)
        self.assertEqual(self.client.delete(f"/members/{member['id']}").status_code, 204)
        self.assertEqual(self.client.get(f"/members/{member['id']}").status_code, 404)
