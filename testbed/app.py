"""
Sample Vulnerable Web Application for VASUKI Security Validation
Contains intentional CWE scenarios for automated testing and verification:
  - CWE-89: SQL Injection in authentication
  - CWE-22: Path Traversal in document retrieval
  - CWE-639: Broken Access Control (IDOR)
"""
import os
import sqlite3
import secrets
from flask import Flask, request, jsonify, session

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET") or secrets.token_hex(32)
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def init_db():
    conn = sqlite3.connect(":memory:")
    c = conn.cursor()
    c.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, tenant_id INTEGER)")
    c.execute("INSERT INTO users VALUES (1, 'admin', 'admin123', 1)")
    c.execute("INSERT INTO users VALUES (2, 'alice', 'alice_secret', 2)")
    conn.commit()
    return conn


db = init_db()


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "")
    password = data.get("password", "")

    # VULNERABILITY 1: SQL Injection via string formatting
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    cursor = db.cursor()
    cursor.execute(query)
    user = cursor.fetchone()

    if user:
        session["user_id"] = user[0]
        session["tenant_id"] = user[3]
        return jsonify({"status": "success", "user_id": user[0], "username": user[1]}), 200
    return jsonify({"status": "failed", "message": "Invalid credentials"}), 401


@app.route("/api/documents", methods=["GET"])
@app.route("/api/documents/<path:filename>", methods=["GET"])
def get_document(filename=None):
    # VULNERABILITY 2: Path Traversal
    target = filename or request.args.get("file", "")
    file_path = os.path.join(UPLOAD_DIR, target)
    if target and os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            return jsonify({"content": f.read()}), 200
    return jsonify({"error": "File not found"}), 404


@app.route("/api/profile/<int:user_id>", methods=["GET"])
def get_profile(user_id):
    # VULNERABILITY 3: Broken Access Control (IDOR)
    cursor = db.cursor()
    cursor.execute("SELECT id, username FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    if user:
        return jsonify({"id": user[0], "username": user[1]}), 200
    return jsonify({"error": "Not found"}), 404


if __name__ == "__main__":
    app.run(port=5000)
