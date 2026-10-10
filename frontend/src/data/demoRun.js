// Bundled demo data for zero-crash fallback and offline walkthroughs
export const DEMO_REPORT = {
  "scan_id": "d3c0261f-e9fa-434e-b50f-3349ad7181e9",
  "repo_url": "https://github.com/dhanrajgupta2736/vasuki-security-lab",
  "branch": "main",
  "status": "completed",
  "server_time": "2026-10-10T00:53:58.195388+00:00",
  "agents": {
    "scanner": "done",
    "patcher": "done",
    "reviewer": "done",
    "tester": "done",
    "deployer": "done"
  },
  "vulnerabilities": [
    {
      "id": "python-dynamic-sql:app.py:41",
      "rule_id": "python-dynamic-sql",
      "file": "app.py",
      "line_start": 41,
      "line_end": 41,
      "severity": "CRITICAL",
      "category": "sql-injection",
      "cwe_id": "CWE-89",
      "cve_id": null,
      "message": "A dynamically formatted SQL string reaches the database execution call.",
      "source": "native-ast",
      "code_snippet": "cursor.execute(query)"
    },
    {
      "id": "flask-path-boundary:app.py:58",
      "rule_id": "flask-path-boundary",
      "file": "app.py",
      "line_start": 58,
      "line_end": 58,
      "severity": "HIGH",
      "category": "path-traversal",
      "cwe_id": "CWE-22",
      "cve_id": null,
      "message": "A request handler opens a joined path without checking the resolved directory boundary.",
      "source": "native-ast",
      "code_snippet": "open(file_path, \"r\", encoding=\"utf-8\")"
    },
    {
      "id": "flask-object-authorization:app.py:67",
      "rule_id": "flask-object-authorization",
      "file": "app.py",
      "line_start": 67,
      "line_end": 67,
      "severity": "HIGH",
      "category": "broken-access-control",
      "cwe_id": "CWE-639",
      "cve_id": null,
      "message": "A user object is fetched using a route ID without a session ownership check.",
      "source": "native-ast",
      "code_snippet": "cursor.execute(\"SELECT id, username FROM users WHERE id = ?\", (user_id,))"
    }
  ],
  "patches": [
    {
      "vulnerability_id": "python-dynamic-sql:app.py:41",
      "file": "app.py",
      "category": "sql-injection",
      "cve_id": null,
      "cwe_id": "CWE-89",
      "severity": "CRITICAL",
      "diff": "--- a/app.py\n+++ b/app.py\n@@ -36,9 +36,9 @@\n     password = data.get(\"password\", \"\")\n \n     # VULNERABILITY 1: SQL Injection via string formatting\n-    query = f\"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'\"\n+    query = 'SELECT * FROM users WHERE username = ? AND password = ?'\n     cursor = db.cursor()\n-    cursor.execute(query)\n+    cursor.execute(query, (username, password,))\n     user = cursor.fetchone()\n \n     if user:\n",
      "applied": true,
      "model_used": "native-ast-repair",
      "rationale": "A dynamically formatted SQL string reaches the database execution call.",
      "final_diff": "diff --git a/app.py b/app.py\nindex a7d91e3..d164880 100644\n--- a/app.py\n+++ b/app.py\n@@ -36,9 +36,9 @@ def login():\n     password = data.get(\"password\", \"\")\n \n     # VULNERABILITY 1: SQL Injection via string formatting\n-    query = f\"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'\"\n+    query = 'SELECT * FROM users WHERE username = ? AND password = ?'\n     cursor = db.cursor()\n-    cursor.execute(query)\n+    cursor.execute(query, (username, password,))\n     user = cursor.fetchone()\n \n     if user:\n@@ -54,6 +54,14 @@ def get_document(filename=None):\n     # VULNERABILITY 2: Path Traversal\n     target = filename or request.args.get(\"file\", \"\")\n     file_path = os.path.join(UPLOAD_DIR, target)\n+\n+    # Fix: Check if the resolved path is within the UPLOAD_DIR boundary\n+    base_dir_realpath = os.path.realpath(UPLOAD_DIR)\n+    requested_file_realpath = os.path.realpath(file_path)\n+\n+    if not os.path.commonpath([base_dir_realpath, requested_file_realpath]) == base_dir_realpath:\n+        return jsonify({\"error\": \"Access denied\"}), 403\n+\n     if target and os.path.exists(file_path):\n         with open(file_path, \"r\", encoding=\"utf-8\") as f:\n             return jsonify({\"content\": f.read()}), 200\n@@ -63,6 +71,12 @@ def get_document(filename=None):\n @app.route(\"/api/profile/<int:user_id>\", methods=[\"GET\"])\n def get_profile(user_id):\n     # VULNERABILITY 3: Broken Access Control (IDOR)\n+    if \"user_id\" not in session:\n+        return jsonify({\"error\": \"Unauthorized\"}), 401\n+\n+    if session[\"user_id\"] != user_id:\n+        return jsonify({\"error\": \"Forbidden\"}), 403\n+\n     cursor = db.cursor()\n     cursor.execute(\"SELECT id, username FROM users WHERE id = ?\", (user_id,))\n     user = cursor.fetchone()"
    },
    {
      "vulnerability_id": "flask-path-boundary:app.py:58",
      "file": "app.py",
      "category": "path-traversal",
      "cve_id": null,
      "cwe_id": "CWE-22",
      "severity": "HIGH",
      "diff": "--- a/app.py\n+++ b/app.py\n@@ -54,6 +54,14 @@\n     # VULNERABILITY 2: Path Traversal\n     target = filename or request.args.get(\"file\", \"\")\n     file_path = os.path.join(UPLOAD_DIR, target)\n+\n+    # Fix: Check if the resolved path is within the UPLOAD_DIR boundary\n+    base_dir_realpath = os.path.realpath(UPLOAD_DIR)\n+    requested_file_realpath = os.path.realpath(file_path)\n+\n+    if not os.path.commonpath([base_dir_realpath, requested_file_realpath]) == base_dir_realpath:\n+        return jsonify({\"error\": \"Access denied\"}), 403\n+\n     if target and os.path.exists(file_path):\n         with open(file_path, \"r\", encoding=\"utf-8\") as f:\n             return jsonify({\"content\": f.read()}), 200\n",
      "applied": true,
      "model_used": "oci/google.gemini-2.5-flash",
      "rationale": "A request handler opens a joined path without checking the resolved directory boundary.",
      "final_diff": "diff --git a/app.py b/app.py\nindex a7d91e3..d164880 100644\n--- a/app.py\n+++ b/app.py\n@@ -36,9 +36,9 @@ def login():\n     password = data.get(\"password\", \"\")\n \n     # VULNERABILITY 1: SQL Injection via string formatting\n-    query = f\"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'\"\n+    query = 'SELECT * FROM users WHERE username = ? AND password = ?'\n     cursor = db.cursor()\n-    cursor.execute(query)\n+    cursor.execute(query, (username, password,))\n     user = cursor.fetchone()\n \n     if user:\n@@ -54,6 +54,14 @@ def get_document(filename=None):\n     # VULNERABILITY 2: Path Traversal\n     target = filename or request.args.get(\"file\", \"\")\n     file_path = os.path.join(UPLOAD_DIR, target)\n+\n+    # Fix: Check if the resolved path is within the UPLOAD_DIR boundary\n+    base_dir_realpath = os.path.realpath(UPLOAD_DIR)\n+    requested_file_realpath = os.path.realpath(file_path)\n+\n+    if not os.path.commonpath([base_dir_realpath, requested_file_realpath]) == base_dir_realpath:\n+        return jsonify({\"error\": \"Access denied\"}), 403\n+\n     if target and os.path.exists(file_path):\n         with open(file_path, \"r\", encoding=\"utf-8\") as f:\n             return jsonify({\"content\": f.read()}), 200\n@@ -63,6 +71,12 @@ def get_document(filename=None):\n @app.route(\"/api/profile/<int:user_id>\", methods=[\"GET\"])\n def get_profile(user_id):\n     # VULNERABILITY 3: Broken Access Control (IDOR)\n+    if \"user_id\" not in session:\n+        return jsonify({\"error\": \"Unauthorized\"}), 401\n+\n+    if session[\"user_id\"] != user_id:\n+        return jsonify({\"error\": \"Forbidden\"}), 403\n+\n     cursor = db.cursor()\n     cursor.execute(\"SELECT id, username FROM users WHERE id = ?\", (user_id,))\n     user = cursor.fetchone()"
    },
    {
      "vulnerability_id": "flask-object-authorization:app.py:67",
      "file": "app.py",
      "category": "broken-access-control",
      "cve_id": null,
      "cwe_id": "CWE-639",
      "severity": "HIGH",
      "diff": "--- a/app.py\n+++ b/app.py\n@@ -71,6 +71,12 @@\n @app.route(\"/api/profile/<int:user_id>\", methods=[\"GET\"])\n def get_profile(user_id):\n     # VULNERABILITY 3: Broken Access Control (IDOR)\n+    if \"user_id\" not in session:\n+        return jsonify({\"error\": \"Unauthorized\"}), 401\n+\n+    if session[\"user_id\"] != user_id:\n+        return jsonify({\"error\": \"Forbidden\"}), 403\n+\n     cursor = db.cursor()\n     cursor.execute(\"SELECT id, username FROM users WHERE id = ?\", (user_id,))\n     user = cursor.fetchone()\n",
      "applied": true,
      "model_used": "oci/google.gemini-2.5-flash",
      "rationale": "A user object is fetched using a route ID without a session ownership check.",
      "final_diff": "diff --git a/app.py b/app.py\nindex a7d91e3..d164880 100644\n--- a/app.py\n+++ b/app.py\n@@ -36,9 +36,9 @@ def login():\n     password = data.get(\"password\", \"\")\n \n     # VULNERABILITY 1: SQL Injection via string formatting\n-    query = f\"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'\"\n+    query = 'SELECT * FROM users WHERE username = ? AND password = ?'\n     cursor = db.cursor()\n-    cursor.execute(query)\n+    cursor.execute(query, (username, password,))\n     user = cursor.fetchone()\n \n     if user:\n@@ -54,6 +54,14 @@ def get_document(filename=None):\n     # VULNERABILITY 2: Path Traversal\n     target = filename or request.args.get(\"file\", \"\")\n     file_path = os.path.join(UPLOAD_DIR, target)\n+\n+    # Fix: Check if the resolved path is within the UPLOAD_DIR boundary\n+    base_dir_realpath = os.path.realpath(UPLOAD_DIR)\n+    requested_file_realpath = os.path.realpath(file_path)\n+\n+    if not os.path.commonpath([base_dir_realpath, requested_file_realpath]) == base_dir_realpath:\n+        return jsonify({\"error\": \"Access denied\"}), 403\n+\n     if target and os.path.exists(file_path):\n         with open(file_path, \"r\", encoding=\"utf-8\") as f:\n             return jsonify({\"content\": f.read()}), 200\n@@ -63,6 +71,12 @@ def get_document(filename=None):\n @app.route(\"/api/profile/<int:user_id>\", methods=[\"GET\"])\n def get_profile(user_id):\n     # VULNERABILITY 3: Broken Access Control (IDOR)\n+    if \"user_id\" not in session:\n+        return jsonify({\"error\": \"Unauthorized\"}), 401\n+\n+    if session[\"user_id\"] != user_id:\n+        return jsonify({\"error\": \"Forbidden\"}), 403\n+\n     cursor = db.cursor()\n     cursor.execute(\"SELECT id, username FROM users WHERE id = ?\", (user_id,))\n     user = cursor.fetchone()"
    }
  ],
  "review_notes": {
    "individual_reviews": [
      {
        "patch_id": "python-dynamic-sql:app.py:41",
        "file": "app.py",
        "patch_fixes_vuln": true,
        "introduces_new_vulns": false,
        "confidence_score": 100,
        "recommendation": "approve",
        "logic_break_risk": "pending-test-verification",
        "reasoning": "Target rule no longer matches; syntax passes. Runtime proof is required.",
        "semgrep_result": "Re-scan passed"
      },
      {
        "patch_id": "flask-path-boundary:app.py:58",
        "file": "app.py",
        "patch_fixes_vuln": true,
        "introduces_new_vulns": false,
        "confidence_score": 100,
        "recommendation": "approve",
        "logic_break_risk": "pending-test-verification",
        "reasoning": "Target rule no longer matches; syntax passes. Runtime proof is required.",
        "semgrep_result": "Re-scan passed"
      },
      {
        "patch_id": "flask-object-authorization:app.py:67",
        "file": "app.py",
        "patch_fixes_vuln": true,
        "introduces_new_vulns": false,
        "confidence_score": 100,
        "recommendation": "approve",
        "logic_break_risk": "pending-test-verification",
        "reasoning": "Target rule no longer matches; syntax passes. Runtime proof is required.",
        "semgrep_result": "Re-scan passed"
      }
    ],
    "summary": {
      "approved": 3,
      "rejected": 0,
      "total_reviewed": 3
    },
    "remaining_findings": [],
    "new_findings": [],
    "syntax_errors": [],
    "all_findings_resolved": true
  },
  "test_results": {
    "source": "github",
    "project_path": "",
    "publish_pr": true,
    "rounds": [
      {
        "iteration": 1,
        "review_passed": true,
        "remaining_findings": 0,
        "tests_passed": true,
        "passed": 11,
        "failed": 0,
        "errors": 0,
        "regressions": [],
        "build_passed": true
      }
    ],
    "base_sha": "d0fbbf666eaf20f63206b8607024ffac2cf81b76",
    "branch": "main",
    "dependency_audit": {
      "status": "passed",
      "scope": "explicitly declared pinned requirements"
    },
    "scanner": "native-ast",
    "original_tests": {
      "passed": 6,
      "failed": 5,
      "errors": 0,
      "skipped": 0,
      "total": 11,
      "cases": [
        {
          "id": "tests.test_app::test_login_valid",
          "name": "test_login_valid",
          "status": "passed",
          "duration": 0.012,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_login_invalid",
          "name": "test_login_invalid",
          "status": "passed",
          "duration": 0.002,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_profile_lookup",
          "name": "test_profile_lookup",
          "status": "passed",
          "duration": 0.003,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_nonexistent_profile",
          "name": "test_nonexistent_profile",
          "status": "passed",
          "duration": 0.003,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_sqli_auth_bypass_blocked",
          "name": "test_sqli_auth_bypass_blocked",
          "status": "failed",
          "duration": 0.002,
          "security": true,
          "message": "AssertionError: SECURITY REGRESSION: SQL injection authentication bypass succeeded!\nassert 200 == 401\n +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code"
        },
        {
          "id": "tests.test_app::test_path_traversal_exploit_blocked",
          "name": "test_path_traversal_exploit_blocked",
          "status": "failed",
          "duration": 0.002,
          "security": true,
          "message": "AssertionError: SECURITY REGRESSION: Path traversal escaped root directory and read source file!\nassert 200 in (400, 403, 404)\n +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code"
        },
        {
          "id": "tests.test_app::test_idor_anonymous_access_blocked",
          "name": "test_idor_anonymous_access_blocked",
          "status": "failed",
          "duration": 0.003,
          "security": true,
          "message": "assert 200 == 401\n +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code"
        },
        {
          "id": "tests.test_app::test_idor_cross_user_access_blocked",
          "name": "test_idor_cross_user_access_blocked",
          "status": "failed",
          "duration": 0.003,
          "security": true,
          "message": "assert 200 == 403\n +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code"
        },
        {
          "id": "tests.test_app::test_owner_profile_access_preserved",
          "name": "test_owner_profile_access_preserved",
          "status": "passed",
          "duration": 0.003,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_path_traversal_absolute_path_blocked",
          "name": "test_path_traversal_absolute_path_blocked",
          "status": "failed",
          "duration": 0.002,
          "security": true,
          "message": "assert 200 in (400, 403, 404)\n +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code"
        },
        {
          "id": "tests.test_app::test_document_read_preserved",
          "name": "test_document_read_preserved",
          "status": "passed",
          "duration": 0.002,
          "security": false,
          "message": ""
        }
      ],
      "sandbox": {
        "container_id": "8ed1a0fe0ede43bb180428dd3b708acec6844701b9109237333a445d70adf365",
        "user": "1000:1000",
        "network_connections": [
          "none"
        ],
        "memory_bytes": 536870912,
        "nano_cpus": 500000000,
        "pids_limit": 128,
        "cap_drop": [
          "ALL"
        ],
        "security_options": [
          "no-new-privileges:true"
        ],
        "host_mounts": []
      },
      "build": {
        "kind": "python-source-compile",
        "command": [
          "python",
          "-I",
          "/tmp/vasuki-controller.py",
          "compile",
          "/tmp/repo"
        ],
        "exit_code": 0,
        "success": true,
        "output": "Syntax build passed for 1 Python source files\n",
        "duration_seconds": 0.5
      },
      "test_inputs": {
        "unchanged": true,
        "changed_test_inputs": []
      },
      "test_manifest": {
        "files": {
          "tests/test_app.py": "9fa6474f401b12bb74cf07ebc575b78c00143759711fba53be75250372e3ba10"
        },
        "configuration": {}
      },
      "success": false,
      "has_tests": true,
      "label": "baseline",
      "runner": "docker",
      "exit_code": 1,
      "output": "....FFFF.F.                                                              [100%]\n=================================== FAILURES ===================================\n________________________ test_sqli_auth_bypass_blocked _________________________\ntests/test_app.py:53: in test_sqli_auth_bypass_blocked\n    assert res.status_code == 401, \"SECURITY REGRESSION: SQL injection authentication bypass succeeded!\"\nE   AssertionError: SECURITY REGRESSION: SQL injection authentication bypass succeeded!\nE   assert 200 == 401\nE    +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code\n_____________________ test_path_traversal_exploit_blocked ______________________\ntests/test_app.py:63: in test_path_traversal_exploit_blocked\n    assert res.status_code in (400, 403, 404), \"SECURITY REGRESSION: Path traversal escaped root directory and read source file!\"\nE   AssertionError: SECURITY REGRESSION: Path traversal escaped root directory and read source file!\nE   assert 200 in (400, 403, 404)\nE    +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code\n______________________ test_idor_anonymous_access_blocked ______________________\ntests/test_app.py:68: in test_idor_anonymous_access_blocked\n    assert res.status_code == 401\nE   assert 200 == 401\nE    +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code\n_____________________ test_idor_cross_user_access_blocked ______________________\ntests/test_app.py:74: in test_idor_cross_user_access_blocked\n    assert res.status_code == 403\nE   assert 200 == 403\nE    +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code\n__________________ test_path_traversal_absolute_path_blocked ___________________\ntests/test_app.py:87: in test_path_traversal_absolute_path_blocked\n    assert res.status_code in (400, 403, 404)\nE   assert 200 in (400, 403, 404)\nE    +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code\n=========================== short test summary info ============================\nFAILED tests/test_app.py::test_sqli_auth_bypass_blocked - AssertionError: SEC...\nFAILED tests/test_app.py::test_path_traversal_exploit_blocked - AssertionErro...\nFAILED tests/test_app.py::test_idor_anonymous_access_blocked - assert 200 == 401\nFAILED tests/test_app.py::test_idor_cross_user_access_blocked - assert 200 ==...\nFAILED tests/test_app.py::test_path_traversal_absolute_path_blocked - assert ...\n5 failed, 6 passed in 0.81s\n",
      "duration_seconds": 8.14
    },
    "patch_branch": "codex/vasuki-patch-d3c0261f",
    "test_inputs_unchanged": true,
    "changed_test_inputs": [],
    "patched_tests": {
      "passed": 11,
      "failed": 0,
      "errors": 0,
      "skipped": 0,
      "total": 11,
      "cases": [
        {
          "id": "tests.test_app::test_login_valid",
          "name": "test_login_valid",
          "status": "passed",
          "duration": 0.012,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_login_invalid",
          "name": "test_login_invalid",
          "status": "passed",
          "duration": 0.002,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_profile_lookup",
          "name": "test_profile_lookup",
          "status": "passed",
          "duration": 0.011,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_nonexistent_profile",
          "name": "test_nonexistent_profile",
          "status": "passed",
          "duration": 0.084,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_sqli_auth_bypass_blocked",
          "name": "test_sqli_auth_bypass_blocked",
          "status": "passed",
          "duration": 0.002,
          "security": true,
          "message": ""
        },
        {
          "id": "tests.test_app::test_path_traversal_exploit_blocked",
          "name": "test_path_traversal_exploit_blocked",
          "status": "passed",
          "duration": 0.005,
          "security": true,
          "message": ""
        },
        {
          "id": "tests.test_app::test_idor_anonymous_access_blocked",
          "name": "test_idor_anonymous_access_blocked",
          "status": "passed",
          "duration": 0.001,
          "security": true,
          "message": ""
        },
        {
          "id": "tests.test_app::test_idor_cross_user_access_blocked",
          "name": "test_idor_cross_user_access_blocked",
          "status": "passed",
          "duration": 0.002,
          "security": true,
          "message": ""
        },
        {
          "id": "tests.test_app::test_owner_profile_access_preserved",
          "name": "test_owner_profile_access_preserved",
          "status": "passed",
          "duration": 0.002,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_path_traversal_absolute_path_blocked",
          "name": "test_path_traversal_absolute_path_blocked",
          "status": "passed",
          "duration": 0.001,
          "security": true,
          "message": ""
        },
        {
          "id": "tests.test_app::test_document_read_preserved",
          "name": "test_document_read_preserved",
          "status": "passed",
          "duration": 0.003,
          "security": false,
          "message": ""
        }
      ],
      "sandbox": {
        "container_id": "b2ec18aabefb19b825f7890640e05a0e5620c99f1d53b40f8184fe9fc6ec03da",
        "user": "1000:1000",
        "network_connections": [
          "none"
        ],
        "memory_bytes": 536870912,
        "nano_cpus": 500000000,
        "pids_limit": 128,
        "cap_drop": [
          "ALL"
        ],
        "security_options": [
          "no-new-privileges:true"
        ],
        "host_mounts": []
      },
      "build": {
        "kind": "python-source-compile",
        "command": [
          "python",
          "-I",
          "/tmp/vasuki-controller.py",
          "compile",
          "/tmp/repo"
        ],
        "exit_code": 0,
        "success": true,
        "output": "Syntax build passed for 1 Python source files\n",
        "duration_seconds": 0.61
      },
      "test_inputs": {
        "unchanged": true,
        "changed_test_inputs": []
      },
      "test_manifest": {
        "files": {
          "tests/test_app.py": "9fa6474f401b12bb74cf07ebc575b78c00143759711fba53be75250372e3ba10"
        },
        "configuration": {}
      },
      "success": true,
      "has_tests": true,
      "label": "patched",
      "runner": "docker",
      "exit_code": 0,
      "output": "...........                                                              [100%]\n11 passed in 0.88s\n",
      "duration_seconds": 7.07
    },
    "regression_free": true,
    "regressions": [],
    "missing_tests": [],
    "fixed_tests": [
      "tests.test_app::test_sqli_auth_bypass_blocked",
      "tests.test_app::test_path_traversal_exploit_blocked",
      "tests.test_app::test_idor_anonymous_access_blocked",
      "tests.test_app::test_idor_cross_user_access_blocked",
      "tests.test_app::test_path_traversal_absolute_path_blocked"
    ],
    "duplicate_test_ids": [],
    "newly_skipped_tests": [],
    "security_tests_passed": true,
    "security_tests_count": 5,
    "has_tests": true,
    "patches_applied": 3,
    "changed_lines": 18,
    "verification_score": 100,
    "delivery": {
      "status": "done",
      "branch": "codex/vasuki-patch-d3c0261f"
    },
    "patch_sha": "4d15a4a1a9d0ca58defe7a3b0f53a0874e1850a7",
    "pr_description": "## Security issue and fix\n- CWE-89: `app.py` \u2014 A dynamically formatted SQL string reaches the database execution call.\n- CWE-22: `app.py` \u2014 A request handler opens a joined path without checking the resolved directory boundary.\n- CWE-639: `app.py` \u2014 A user object is fetched using a route ID without a session ownership check.\n\nTargeted change rationale:\n- A dynamically formatted SQL string reaches the database execution call.\n- A request handler opens a joined path without checking the resolved directory boundary.\n- A user object is fetched using a route ID without a session ownership check.\n\nSource checks used the same rules before and after patching. Inspect the file\ndiffs for the specific implementation changes.\n\n## Executed test evidence\n| Metric | Before | After |\n|---|---:|---:|\n| Passed | 6 | 11 |\n| Failed | 5 | 0 |\n| Errors | 0 | 0 |\n| Collected tests | 11 | 11 |\n\n- Runner: `docker`\n- Repair cycles executed: 1\n- Project build: `python-source-compile` \u2014 passed\n- Test code and configuration unchanged: True\n- Build-time and test-time input fingerprints unchanged: True\n- Security tests passed: 5\n- Previously passing tests retained: True\n- Missing tests: 0\n- Final source findings: 0\n- Model / repair engine: `native-ast-repair, oci/google.gemini-2.5-flash`\n- Validation score: 100/100 (executed checks; not a probability)\n- Changed source lines: 18\n- Base commit: `d0fbbf666eaf20f63206b8607024ffac2cf81b76`\n- Validated patch commit: `4d15a4a1a9d0ca58defe7a3b0f53a0874e1850a7`\n- Scan ID: `d3c0261f-e9fa-434e-b50f-3349ad7181e9`\n\nTests that failed on the vulnerable baseline and now pass:\n- `tests.test_app::test_sqli_auth_bypass_blocked`\n- `tests.test_app::test_path_traversal_exploit_blocked`\n- `tests.test_app::test_idor_anonymous_access_blocked`\n- `tests.test_app::test_idor_cross_user_access_blocked`\n- `tests.test_app::test_path_traversal_absolute_path_blocked`\n\nGenerated by VASUKI. This draft PR includes automated evidence for human review.\n",
    "pr_url": "https://github.com/dhanrajgupta2736/vasuki-security-lab/pull/6",
    "verification_checks": {
      "source_rescan_clear": true,
      "patched_suite_passed": true,
      "baseline_coverage_preserved": true,
      "security_exploits_blocked": true,
      "diff_within_limit": true,
      "project_builds_passed": true,
      "test_inputs_unchanged": true
    },
    "verification_version": 2,
    "elapsed_seconds": 67.73,
    "outcome": "Verified patches published in a real GitHub draft PR"
  },
  "confidence_score": 100.0,
  "blast_radius": [
    "app.py"
  ],
  "pr_url": "https://github.com/dhanrajgupta2736/vasuki-security-lab/pull/6",
  "pr_number": 6,
  "error_message": "",
  "created_at": "2026-10-10T00:52:23.871852",
  "completed_at": "2026-10-10T00:53:31.629381"
};

export const DEMO_EVENTS = [
  {
    "agent": "orchestrator",
    "message": "Queued for the next available pipeline runner",
    "data": {
      "status": "pending"
    },
    "level": "info",
    "event_id": "1af6ee8b-8d0d-489b-8a01-40c01c389b16",
    "timestamp": "2026-10-10T00:52:23.896010+00:00"
  },
  {
    "agent": "orchestrator",
    "message": "RECON: cloning and analyzing repository",
    "data": {
      "status": "scanning",
      "active_agent": "scanner",
      "progress": 8,
      "phase": "scanner",
      "iteration": 0
    },
    "level": "info",
    "event_id": "a0a29ed9-172c-4622-91fe-8d002eecf5de",
    "timestamp": "2026-10-10T00:52:23.986674+00:00"
  },
  {
    "agent": "scanner",
    "message": "Cloning dhanrajgupta2736/vasuki-security-lab at main",
    "data": {},
    "level": "info",
    "event_id": "8efe4ad3-67e0-47b5-b9a2-b4a505268ea9",
    "timestamp": "2026-10-10T00:52:24.694215+00:00"
  },
  {
    "agent": "scanner",
    "message": "Native AST analysis found 3 security findings",
    "data": {
      "count": 3
    },
    "level": "info",
    "event_id": "caf259e4-0291-4fe6-b9cf-20aac7b05923",
    "timestamp": "2026-10-10T00:52:26.201479+00:00"
  },
  {
    "agent": "scanner",
    "message": "Dependency advisory audit completed",
    "data": {
      "declared_packages": 2,
      "findings": 0,
      "scope": "explicitly declared pinned requirements"
    },
    "level": "info",
    "event_id": "281b24a6-3fd7-4fbb-a7ac-63e0ecb44397",
    "timestamp": "2026-10-10T00:52:29.922273+00:00"
  },
  {
    "agent": "scanner",
    "message": "RECON complete: 3 findings at commit d0fbbf66",
    "data": {},
    "level": "info",
    "event_id": "5c9a7407-9a41-40b9-a0d4-5a3fb0459426",
    "timestamp": "2026-10-10T00:52:29.995923+00:00"
  },
  {
    "agent": "orchestrator",
    "message": "PROOF: building the vulnerable baseline and recording unchanged tests",
    "data": {
      "status": "testing",
      "active_agent": "tester",
      "progress": 18,
      "phase": "baseline",
      "iteration": 0
    },
    "level": "info",
    "event_id": "0017560d-e9a7-42b9-a594-af766da06ce0",
    "timestamp": "2026-10-10T00:52:30.020058+00:00"
  },
  {
    "agent": "tester",
    "message": "Running baseline test suite",
    "data": {
      "label": "baseline"
    },
    "level": "info",
    "event_id": "aed554dd-e30b-47e3-baf7-7ee7c3377eda",
    "timestamp": "2026-10-10T00:52:30.037220+00:00"
  },
  {
    "agent": "tester",
    "message": "baseline: 6 passed, 5 failed, 0 errors",
    "data": {
      "passed": 6,
      "failed": 5,
      "errors": 0,
      "skipped": 0,
      "total": 11,
      "cases": [
        {
          "id": "tests.test_app::test_login_valid",
          "name": "test_login_valid",
          "status": "passed",
          "duration": 0.012,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_login_invalid",
          "name": "test_login_invalid",
          "status": "passed",
          "duration": 0.002,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_profile_lookup",
          "name": "test_profile_lookup",
          "status": "passed",
          "duration": 0.003,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_nonexistent_profile",
          "name": "test_nonexistent_profile",
          "status": "passed",
          "duration": 0.003,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_sqli_auth_bypass_blocked",
          "name": "test_sqli_auth_bypass_blocked",
          "status": "failed",
          "duration": 0.002,
          "security": true,
          "message": "AssertionError: SECURITY REGRESSION: SQL injection authentication bypass succeeded!\nassert 200 == 401\n +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code"
        },
        {
          "id": "tests.test_app::test_path_traversal_exploit_blocked",
          "name": "test_path_traversal_exploit_blocked",
          "status": "failed",
          "duration": 0.002,
          "security": true,
          "message": "AssertionError: SECURITY REGRESSION: Path traversal escaped root directory and read source file!\nassert 200 in (400, 403, 404)\n +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code"
        },
        {
          "id": "tests.test_app::test_idor_anonymous_access_blocked",
          "name": "test_idor_anonymous_access_blocked",
          "status": "failed",
          "duration": 0.003,
          "security": true,
          "message": "assert 200 == 401\n +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code"
        },
        {
          "id": "tests.test_app::test_idor_cross_user_access_blocked",
          "name": "test_idor_cross_user_access_blocked",
          "status": "failed",
          "duration": 0.003,
          "security": true,
          "message": "assert 200 == 403\n +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code"
        },
        {
          "id": "tests.test_app::test_owner_profile_access_preserved",
          "name": "test_owner_profile_access_preserved",
          "status": "passed",
          "duration": 0.003,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_path_traversal_absolute_path_blocked",
          "name": "test_path_traversal_absolute_path_blocked",
          "status": "failed",
          "duration": 0.002,
          "security": true,
          "message": "assert 200 in (400, 403, 404)\n +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code"
        },
        {
          "id": "tests.test_app::test_document_read_preserved",
          "name": "test_document_read_preserved",
          "status": "passed",
          "duration": 0.002,
          "security": false,
          "message": ""
        }
      ],
      "sandbox": {
        "container_id": "8ed1a0fe0ede43bb180428dd3b708acec6844701b9109237333a445d70adf365",
        "user": "1000:1000",
        "network_connections": [
          "none"
        ],
        "memory_bytes": 536870912,
        "nano_cpus": 500000000,
        "pids_limit": 128,
        "cap_drop": [
          "ALL"
        ],
        "security_options": [
          "no-new-privileges:true"
        ],
        "host_mounts": []
      },
      "build": {
        "kind": "python-source-compile",
        "command": [
          "python",
          "-I",
          "/tmp/vasuki-controller.py",
          "compile",
          "/tmp/repo"
        ],
        "exit_code": 0,
        "success": true,
        "output": "Syntax build passed for 1 Python source files\n",
        "duration_seconds": 0.5
      },
      "test_inputs": {
        "unchanged": true,
        "changed_test_inputs": []
      },
      "test_manifest": {
        "files": {
          "tests/test_app.py": "9fa6474f401b12bb74cf07ebc575b78c00143759711fba53be75250372e3ba10"
        },
        "configuration": {}
      },
      "success": false,
      "has_tests": true,
      "label": "baseline",
      "runner": "docker",
      "exit_code": 1,
      "output": "....FFFF.F.                                                              [100%]\n=================================== FAILURES ===================================\n________________________ test_sqli_auth_bypass_blocked _________________________\ntests/test_app.py:53: in test_sqli_auth_bypass_blocked\n    assert res.status_code == 401, \"SECURITY REGRESSION: SQL injection authentication bypass succeeded!\"\nE   AssertionError: SECURITY REGRESSION: SQL injection authentication bypass succeeded!\nE   assert 200 == 401\nE    +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code\n_____________________ test_path_traversal_exploit_blocked ______________________\ntests/test_app.py:63: in test_path_traversal_exploit_blocked\n    assert res.status_code in (400, 403, 404), \"SECURITY REGRESSION: Path traversal escaped root directory and read source file!\"\nE   AssertionError: SECURITY REGRESSION: Path traversal escaped root directory and read source file!\nE   assert 200 in (400, 403, 404)\nE    +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code\n______________________ test_idor_anonymous_access_blocked ______________________\ntests/test_app.py:68: in test_idor_anonymous_access_blocked\n    assert res.status_code == 401\nE   assert 200 == 401\nE    +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code\n_____________________ test_idor_cross_user_access_blocked ______________________\ntests/test_app.py:74: in test_idor_cross_user_access_blocked\n    assert res.status_code == 403\nE   assert 200 == 403\nE    +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code\n__________________ test_path_traversal_absolute_path_blocked ___________________\ntests/test_app.py:87: in test_path_traversal_absolute_path_blocked\n    assert res.status_code in (400, 403, 404)\nE   assert 200 in (400, 403, 404)\nE    +  where 200 = <WrapperTestResponse streamed [200 OK]>.status_code\n=========================== short test summary info ============================\nFAILED tests/test_app.py::test_sqli_auth_bypass_blocked - AssertionError: SEC...\nFAILED tests/test_app.py::test_path_traversal_exploit_blocked - AssertionErro...\nFAILED tests/test_app.py::test_idor_anonymous_access_blocked - assert 200 == 401\nFAILED tests/test_app.py::test_idor_cross_user_access_blocked - assert 200 ==...\nFAILED tests/test_app.py::test_path_traversal_absolute_path_blocked - assert ...\n5 failed, 6 passed in 0.81s\n",
      "duration_seconds": 8.14
    },
    "level": "info",
    "event_id": "244c3eef-b2e0-4861-bd25-ecceab40d34a",
    "timestamp": "2026-10-10T00:52:38.172578+00:00"
  },
  {
    "agent": "orchestrator",
    "message": "FORGE: generating targeted security patches",
    "data": {
      "status": "patching",
      "active_agent": "patcher",
      "progress": 30,
      "phase": "patcher",
      "iteration": 1
    },
    "level": "info",
    "event_id": "b5d8f376-0864-4b7d-83e1-2c166c3b6321",
    "timestamp": "2026-10-10T00:52:38.205635+00:00"
  },
  {
    "agent": "patcher",
    "message": "Created patch branch codex/vasuki-patch-d3c0261f",
    "data": {},
    "level": "info",
    "event_id": "be36b8b4-4681-49bc-aca4-43a3f02b2f54",
    "timestamp": "2026-10-10T00:52:38.290776+00:00"
  },
  {
    "agent": "patcher",
    "message": "Generating sql-injection patch using oci/google.gemini-2.5-flash",
    "data": {},
    "level": "info",
    "event_id": "2e0dcb8f-972b-4b75-8a25-6e3a8196ebae",
    "timestamp": "2026-10-10T00:52:38.300962+00:00"
  },
  {
    "agent": "patcher",
    "message": "Model patch unavailable or invalid: unterminated triple-quoted string literal (detected at line 75) (<unknown>, line 6); checking supported AST repair",
    "data": {},
    "level": "warning",
    "event_id": "eff465a9-72a1-4f1a-b109-bcaa3365fed1",
    "timestamp": "2026-10-10T00:52:53.977673+00:00"
  },
  {
    "agent": "patcher",
    "message": "Applied sql-injection patch in app.py",
    "data": {
      "file": "app.py",
      "model_used": "native-ast-repair"
    },
    "level": "info",
    "event_id": "e73d398c-d53f-4fae-a9a6-1d496e503166",
    "timestamp": "2026-10-10T00:52:53.987947+00:00"
  },
  {
    "agent": "patcher",
    "message": "Generating path-traversal patch using oci/google.gemini-2.5-flash",
    "data": {},
    "level": "info",
    "event_id": "7ca24208-2e79-4adc-9b48-756a83a91305",
    "timestamp": "2026-10-10T00:52:53.995172+00:00"
  },
  {
    "agent": "patcher",
    "message": "Applied path-traversal patch in app.py",
    "data": {
      "file": "app.py",
      "model_used": "oci/google.gemini-2.5-flash"
    },
    "level": "info",
    "event_id": "1760e04a-4474-4bcd-abc9-b7cbbfb7e189",
    "timestamp": "2026-10-10T00:53:10.064852+00:00"
  },
  {
    "agent": "patcher",
    "message": "Generating broken-access-control patch using oci/google.gemini-2.5-flash",
    "data": {},
    "level": "info",
    "event_id": "886a63f0-aa68-4230-8162-c8bc23182f74",
    "timestamp": "2026-10-10T00:53:10.069362+00:00"
  },
  {
    "agent": "patcher",
    "message": "Applied broken-access-control patch in app.py",
    "data": {
      "file": "app.py",
      "model_used": "oci/google.gemini-2.5-flash"
    },
    "level": "info",
    "event_id": "6f3c2697-e8f4-4752-b7d3-46d999a5d5d6",
    "timestamp": "2026-10-10T00:53:16.413652+00:00"
  },
  {
    "agent": "orchestrator",
    "message": "SHIELD: reviewing source and patches \u2014 cycle 1",
    "data": {
      "status": "reviewing",
      "active_agent": "reviewer",
      "progress": 55,
      "phase": "reviewer",
      "iteration": 1
    },
    "level": "info",
    "event_id": "509bee05-0d64-4ebb-aeb8-8113898a8640",
    "timestamp": "2026-10-10T00:53:16.439610+00:00"
  },
  {
    "agent": "reviewer",
    "level": "info",
    "message": "Re-scanning final patched source with the intake rules",
    "data": {},
    "event_id": "b2a5e178-ce5e-49a0-9459-2f8747292cf4",
    "timestamp": "2026-10-10T00:53:16.440174+00:00"
  },
  {
    "agent": "scanner",
    "message": "Native AST analysis found 0 security findings",
    "data": {
      "count": 0
    },
    "level": "info",
    "event_id": "c624709e-1428-4e7f-a8fa-595d021aa418",
    "timestamp": "2026-10-10T00:53:16.489483+00:00"
  },
  {
    "agent": "scanner",
    "message": "Dependency advisory audit completed",
    "data": {
      "declared_packages": 2,
      "findings": 0,
      "scope": "explicitly declared pinned requirements"
    },
    "level": "info",
    "event_id": "02a238b7-64ad-4f99-bad3-0ac32899e5ae",
    "timestamp": "2026-10-10T00:53:20.589822+00:00"
  },
  {
    "agent": "orchestrator",
    "message": "PROOF: building and testing the patch \u2014 cycle 1",
    "data": {
      "status": "testing",
      "active_agent": "tester",
      "progress": 75,
      "phase": "tester",
      "iteration": 1
    },
    "level": "info",
    "event_id": "a73a7bee-8d0c-432f-9a2c-2d12bcf055e4",
    "timestamp": "2026-10-10T00:53:20.686898+00:00"
  },
  {
    "agent": "tester",
    "message": "Running patched test suite",
    "data": {
      "label": "patched"
    },
    "level": "info",
    "event_id": "a0f3c6eb-8bcc-498e-a073-85df82c13e37",
    "timestamp": "2026-10-10T00:53:20.705120+00:00"
  },
  {
    "agent": "tester",
    "message": "patched: 11 passed, 0 failed, 0 errors",
    "data": {
      "passed": 11,
      "failed": 0,
      "errors": 0,
      "skipped": 0,
      "total": 11,
      "cases": [
        {
          "id": "tests.test_app::test_login_valid",
          "name": "test_login_valid",
          "status": "passed",
          "duration": 0.012,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_login_invalid",
          "name": "test_login_invalid",
          "status": "passed",
          "duration": 0.002,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_profile_lookup",
          "name": "test_profile_lookup",
          "status": "passed",
          "duration": 0.011,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_nonexistent_profile",
          "name": "test_nonexistent_profile",
          "status": "passed",
          "duration": 0.084,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_sqli_auth_bypass_blocked",
          "name": "test_sqli_auth_bypass_blocked",
          "status": "passed",
          "duration": 0.002,
          "security": true,
          "message": ""
        },
        {
          "id": "tests.test_app::test_path_traversal_exploit_blocked",
          "name": "test_path_traversal_exploit_blocked",
          "status": "passed",
          "duration": 0.005,
          "security": true,
          "message": ""
        },
        {
          "id": "tests.test_app::test_idor_anonymous_access_blocked",
          "name": "test_idor_anonymous_access_blocked",
          "status": "passed",
          "duration": 0.001,
          "security": true,
          "message": ""
        },
        {
          "id": "tests.test_app::test_idor_cross_user_access_blocked",
          "name": "test_idor_cross_user_access_blocked",
          "status": "passed",
          "duration": 0.002,
          "security": true,
          "message": ""
        },
        {
          "id": "tests.test_app::test_owner_profile_access_preserved",
          "name": "test_owner_profile_access_preserved",
          "status": "passed",
          "duration": 0.002,
          "security": false,
          "message": ""
        },
        {
          "id": "tests.test_app::test_path_traversal_absolute_path_blocked",
          "name": "test_path_traversal_absolute_path_blocked",
          "status": "passed",
          "duration": 0.001,
          "security": true,
          "message": ""
        },
        {
          "id": "tests.test_app::test_document_read_preserved",
          "name": "test_document_read_preserved",
          "status": "passed",
          "duration": 0.003,
          "security": false,
          "message": ""
        }
      ],
      "sandbox": {
        "container_id": "b2ec18aabefb19b825f7890640e05a0e5620c99f1d53b40f8184fe9fc6ec03da",
        "user": "1000:1000",
        "network_connections": [
          "none"
        ],
        "memory_bytes": 536870912,
        "nano_cpus": 500000000,
        "pids_limit": 128,
        "cap_drop": [
          "ALL"
        ],
        "security_options": [
          "no-new-privileges:true"
        ],
        "host_mounts": []
      },
      "build": {
        "kind": "python-source-compile",
        "command": [
          "python",
          "-I",
          "/tmp/vasuki-controller.py",
          "compile",
          "/tmp/repo"
        ],
        "exit_code": 0,
        "success": true,
        "output": "Syntax build passed for 1 Python source files\n",
        "duration_seconds": 0.61
      },
      "test_inputs": {
        "unchanged": true,
        "changed_test_inputs": []
      },
      "test_manifest": {
        "files": {
          "tests/test_app.py": "9fa6474f401b12bb74cf07ebc575b78c00143759711fba53be75250372e3ba10"
        },
        "configuration": {}
      },
      "success": true,
      "has_tests": true,
      "label": "patched",
      "runner": "docker",
      "exit_code": 0,
      "output": "...........                                                              [100%]\n11 passed in 0.88s\n",
      "duration_seconds": 7.07
    },
    "level": "info",
    "event_id": "5f4bbfc4-1989-4d89-b296-ba4cc67d667a",
    "timestamp": "2026-10-10T00:53:27.776506+00:00"
  },
  {
    "agent": "orchestrator",
    "message": "Cycle 1 passed both source review and unchanged tests",
    "data": {
      "iteration": 1
    },
    "level": "info",
    "event_id": "45faa93c-18fa-4027-ae10-39f75ffc8f97",
    "timestamp": "2026-10-10T00:53:27.789221+00:00"
  },
  {
    "agent": "orchestrator",
    "message": "HERALD: committing the verified patch branch and preparing the draft PR",
    "data": {
      "status": "deploying",
      "active_agent": "deployer",
      "progress": 92,
      "phase": "deployer",
      "iteration": 1
    },
    "level": "info",
    "event_id": "0c6f1309-e1ea-467c-990d-0e3b4f15905e",
    "timestamp": "2026-10-10T00:53:27.807932+00:00"
  },
  {
    "agent": "patcher",
    "message": "Verified patches committed",
    "data": {},
    "level": "info",
    "event_id": "22c2cb8e-deed-492b-af64-214b56423eaa",
    "timestamp": "2026-10-10T00:53:27.910989+00:00"
  },
  {
    "agent": "orchestrator",
    "message": "HERALD: publishing the verified branch and opening a draft PR",
    "data": {
      "progress": 95
    },
    "level": "info",
    "event_id": "cf7473aa-e4ca-4938-addc-f41c405c9319",
    "timestamp": "2026-10-10T00:53:27.997864+00:00"
  },
  {
    "agent": "github",
    "level": "info",
    "message": "Verified branch pushed to dhanrajgupta2736/vasuki-security-lab",
    "data": {
      "branch": "codex/vasuki-patch-d3c0261f"
    },
    "event_id": "42970534-3bf4-4bb9-bed7-4b7600edae3c",
    "timestamp": "2026-10-10T00:53:30.052755+00:00"
  },
  {
    "agent": "github",
    "level": "info",
    "message": "Draft PR #6 created",
    "data": {
      "pr_url": "https://github.com/dhanrajgupta2736/vasuki-security-lab/pull/6",
      "pr_number": 6
    },
    "event_id": "2f061699-ec7b-42ce-a7d5-985630e56a56",
    "timestamp": "2026-10-10T00:53:31.615850+00:00"
  },
  {
    "agent": "orchestrator",
    "message": "Verified patches published in a real GitHub draft PR",
    "data": {
      "status": "completed",
      "progress": 100
    },
    "level": "info",
    "event_id": "e1266683-611b-4031-ba6f-ba376b5967b3",
    "timestamp": "2026-10-10T00:53:31.637756+00:00"
  }
];
