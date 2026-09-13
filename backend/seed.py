"""Idempotently add the 350-book Anirory starter catalog."""
from decimal import Decimal

from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import Book

INITIAL = [
    ("Clean Code", "Robert C. Martin", "Technology"),
    ("The Pragmatic Programmer", "Andrew Hunt", "Technology"),
    ("Design Patterns", "Erich Gamma", "Technology"),
    ("Zero to One", "Peter Thiel", "Business"),
    ("Atomic Habits", "James Clear", "Self Development"),
]

TITLE_PREFIXES = [
    "The Cartographer's", "A Brief History of", "Beyond the", "Letters from", "Under the",
    "The Last", "An Atlas of", "Notes on", "The Quiet", "Searching for", "A Theory of",
    "The Hidden", "Chronicles of", "Learning", "Inside", "The Art of", "When We Found",
    "Principles of", "The Complete", "Conversations on", "A Field Guide to", "Rethinking",
    "The Language of", "Stories from", "The Future of",
]
TITLE_SUBJECTS = [
    "Amber Coast", "Ancient Algorithms", "Blue Orchard", "Borrowed Light", "City of Rain",
    "Cloud Forest", "Common Ground", "Creative Work", "Digital Society", "Distant Stars",
    "Emerald Sea", "Everyday Economics", "Forgotten Gardens", "Human Memory", "Island Kitchens",
    "Living Systems", "Modern Leadership", "Moonlit Roads", "Open Knowledge", "Patient Mind",
    "Public Spaces", "Quantum World", "River Country", "Sacred Geometry", "Silent Archive",
    "Small Decisions", "Social Change", "Solar Age", "Southern Skies", "Sustainable Cities",
    "Thinking Machines", "Unwritten Rules", "Urban Wildlife", "Wild Medicine", "Winter Library",
]
AUTHORS = [
    "Maya Senanayake", "Julian Mercer", "Nadia Rahman", "Elias Hart", "Clara Whitmore",
    "Rohan Perera", "Amara Okafor", "Theo Bennett", "Leila Haddad", "Samira Cole",
    "Dinesh Fernando", "Iris Laurent", "Marcus Chen", "Elena Rossi", "Noah Williams",
    "Priya Kapoor", "Owen Sinclair", "Aisha Grant", "Gabriel Silva", "Hana Mori",
    "Devika Nair", "Jonas Weber", "Fatima Noor", "Leo Anders", "Sofia Marin",
    "Kiran Jayasuriya", "Mila Kovacs", "Adam Brooks", "Nora Ibrahim", "Felix Turner",
    "Anika Bose", "Tariq Mahmood", "Rose Campbell", "Mateo Ruiz", "Yuki Tanaka",
    "Sanjay Iyer", "Isabel Flores", "Malik Johnson", "Freya Lind", "Arun Das",
    "Zara Quinn", "Daniel Park", "Meera Wijesinghe", "Louis Bernard", "Amina Yusuf",
    "Henry Clarke", "Lina Costa", "Caleb Morgan", "Rina Sato", "Nimal de Silva",
]
CATEGORIES = [
    "Fiction", "History", "Science", "Technology", "Business", "Arts", "Biography",
    "Philosophy", "Social Sciences", "Travel", "Health", "Education", "Environment",
    "Psychology", "Reference",
]


def build_catalog():
    catalog = []
    for title, author, category in INITIAL:
        catalog.append((title, author, category, Decimal("2490.00"), True))

    pairs = [(prefix, subject) for subject in TITLE_SUBJECTS for prefix in TITLE_PREFIXES]
    for index, (prefix, subject) in enumerate(pairs[:345]):
        title = f"{prefix} {subject}"
        author = AUTHORS[(index * 7 + index // 11) % len(AUTHORS)]
        category = CATEGORIES[(index * 5 + index // 9) % len(CATEGORIES)]
        price = Decimal(850 + ((index * 137) % 7150)) + Decimal((index % 4) * 25)
        available = index % 5 != 0
        catalog.append((title, author, category, price.quantize(Decimal("0.01")), available))
    assert len(catalog) == 350
    assert len({(item[0], item[1]) for item in catalog}) == 350
    return catalog


def seed():
    Base.metadata.create_all(bind=engine)
    catalog = build_catalog()
    inserted = 0
    with SessionLocal() as db:
        existing = set(db.execute(select(Book.title, Book.author)).all())
        for title, author, category, price, available in catalog:
            if (title, author) not in existing:
                db.add(Book(title=title, author=author, category=category, price=price, available=available))
                inserted += 1
        db.commit()
    print(f"Anirory seed complete: {inserted} inserted, {350 - inserted} already present.")


if __name__ == "__main__":
    seed()

