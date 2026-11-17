"""
database.py - SQLite database setup and inspection history management.

We use SQLite because it's simple, requires no server, and is perfect
for a local project like this.
"""

import os
import sqlite3
from datetime import datetime

from app.storage import STORAGE_DIR

DB_PATH = os.path.join(STORAGE_DIR, "visionguard.db")


def get_connection():
    """Create and return a SQLite database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # This lets us access columns by name
    return conn


def init_database():
    """
    Create the inspections table if it doesn't already exist.
    This is called once when the server starts.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS inspections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_name TEXT NOT NULL,
            prediction TEXT NOT NULL,
            confidence REAL NOT NULL,
            decision TEXT NOT NULL,
            rejection_signal INTEGER NOT NULL,
            image_path TEXT,
            inspected_at TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()
    print("Database initialized successfully.")


def save_inspection(product_name, prediction, confidence, decision, rejection_signal, image_path=None):
    """
    Save one inspection result to the database.

    Args:
        product_name: Name of the product (e.g. "Casting Product")
        prediction: "GOOD" or "DEFECTIVE"
        confidence: Float, e.g. 94.5
        decision: "ACCEPT" or "REJECT"
        rejection_signal: True if rejected, False if accepted
        image_path: Optional path to the saved image

    Returns:
        The ID of the newly created record.
    """
    conn = get_connection()
    cursor = conn.cursor()

    inspected_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        INSERT INTO inspections 
        (product_name, prediction, confidence, decision, rejection_signal, image_path, inspected_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (product_name, prediction, confidence, decision, int(rejection_signal), image_path, inspected_at))

    conn.commit()
    inspection_id = cursor.lastrowid
    conn.close()

    return inspection_id


def get_all_inspections():
    """
    Retrieve all inspection records, newest first.

    Returns:
        List of inspection records as dictionaries.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM inspections ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()

    # Convert sqlite3.Row objects to plain dictionaries
    return [dict(row) for row in rows]


def get_stats():
    """
    Calculate and return overall inspection statistics.

    Returns:
        Dictionary with total, accepted, rejected counts and percentages.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total FROM inspections")
    total = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) as accepted FROM inspections WHERE decision = 'ACCEPT'")
    accepted = cursor.fetchone()["accepted"]

    rejected = total - accepted

    conn.close()

    # Avoid division by zero
    acceptance_rate = round((accepted / total) * 100, 1) if total > 0 else 0
    rejection_rate = round((rejected / total) * 100, 1) if total > 0 else 0

    return {
        "total": total,
        "accepted": accepted,
        "rejected": rejected,
        "acceptance_rate": acceptance_rate,
        "rejection_rate": rejection_rate
    }


def clear_all_inspections():
    """Delete all inspection records from the database."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM inspections")
    conn.commit()
    conn.close()
