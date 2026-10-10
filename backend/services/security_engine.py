"""Auditable Python source analysis and narrowly scoped repairs.

The native engine reports CWE classes, never guesses CVE identities. Repairs
are limited to supported SQLite and Flask patterns; other code goes to an LLM.
"""
import ast
from pathlib import Path

IGNORED = {".git", "node_modules", "venv", ".venv", "__pycache__", "dist", "build", "artifacts"}


def call_name(node):
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return f"{call_name(node.value)}.{node.attr}"
    return ""


def source_files(root):
    for path in sorted(Path(root).rglob("*.py")):
        parts = path.relative_to(root).parts
        if not path.is_symlink() and not any(p in IGNORED or p == "tests" for p in parts) and not path.name.startswith("test_"):
            yield path


def analyze_file(path, root):
    code = path.read_text(encoding="utf-8")
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return []
    rel = path.relative_to(root).as_posix()
    result = []

    def finding(node, rule, category, cwe, severity, message):
        result.append({"id": f"{rule}:{rel}:{node.lineno}", "rule_id": rule,
                       "file": rel, "line_start": node.lineno, "line_end": node.end_lineno,
                       "severity": severity, "category": category, "cwe_id": cwe,
                       "cve_id": None, "message": message, "source": "native-ast",
                       "code_snippet": ast.get_source_segment(code, node) or ""})

    for func in [n for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]:
        nodes = list(ast.walk(func))
        dynamic = {t.id for n in nodes if isinstance(n, ast.Assign) and isinstance(n.value, (ast.JoinedStr, ast.BinOp))
                   for t in n.targets if isinstance(t, ast.Name)}
        for node in nodes:
            if not isinstance(node, ast.Call):
                continue
            name = call_name(node.func)
            if name.endswith(".execute") and node.args:
                arg = node.args[0]
                if isinstance(arg, ast.JoinedStr) or isinstance(arg, ast.BinOp) or (isinstance(arg, ast.Name) and arg.id in dynamic):
                    finding(node, "python-dynamic-sql", "sql-injection", "CWE-89", "CRITICAL",
                            "A dynamically formatted SQL string reaches the database execution call.")
        # Restrict filesystem and identity rules to request handlers.
        route = any(isinstance(d, ast.Call) and call_name(d.func).endswith(".route") for d in func.decorator_list)
        if not route:
            continue
        joins = [n for n in nodes if isinstance(n, ast.Assign) and isinstance(n.value, ast.Call)
                 and call_name(n.value.func) == "os.path.join"]
        has_boundary = any(isinstance(n, ast.Call) and call_name(n.func) == "os.path.commonpath" for n in nodes)
        if joins and not has_boundary:
            for node in nodes:
                if isinstance(node, ast.Call) and call_name(node.func) in {"open", "send_file"}:
                    finding(node, "flask-path-boundary", "path-traversal", "CWE-22", "HIGH",
                            "A request handler opens a joined path without checking the resolved directory boundary.")
        args = {a.arg for a in func.args.args}
        identity_guard = any(isinstance(n, ast.Compare) and any(isinstance(x, ast.Name) and x.id == "user_id" for x in ast.walk(n))
                             and any(isinstance(x, ast.Name) and x.id == "session" for x in ast.walk(n)) for n in nodes)
        if "user_id" in args and not identity_guard:
            for node in nodes:
                if (isinstance(node, ast.Call) and call_name(node.func).endswith(".execute") and node.args
                        and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str)
                        and "WHERE id" in node.args[0].value):
                    finding(node, "flask-object-authorization", "broken-access-control", "CWE-639", "HIGH",
                            "A user object is fetched using a route ID without a session ownership check.")
    return result


def analyze_repo(root):
    root = Path(root).resolve()
    findings = []
    for path in source_files(root):
        findings.extend(analyze_file(path, root))
    return findings


def _replace(code, edits):
    lines = code.splitlines(keepends=True)
    offsets = [0]
    for line in lines:
        offsets.append(offsets[-1] + len(line))
    for node, replacement in sorted(edits, key=lambda e: (e[0].lineno, e[0].col_offset), reverse=True):
        # AST columns count UTF-8 bytes; source string slicing counts characters.
        start = offsets[node.lineno - 1] + len(lines[node.lineno - 1].encode('utf-8')[:node.col_offset].decode('utf-8'))
        end = offsets[node.end_lineno - 1] + len(lines[node.end_lineno - 1].encode('utf-8')[:node.end_col_offset].decode('utf-8'))
        code = code[:start] + replacement + code[end:]
    ast.parse(code)
    return code


def _parameterize(joined):
    parts, values = [], []
    for node in joined.values:
        if isinstance(node, ast.Constant):
            parts.append(node.value)
        elif isinstance(node, ast.FormattedValue) and node.conversion == -1 and node.format_spec is None:
            parts.append("\x00")
            values.append(ast.unparse(node.value))
        else:
            raise ValueError("Unsupported SQL formatting")
    sql = "".join(parts)
    if sql.count("'\x00'") != len(values):
        raise ValueError("Only quoted SQL values can be repaired automatically")
    return repr(sql.replace("'\x00'", "?")), "(" + ", ".join(values) + ",)"


def repair_supported(code, category):
    tree = ast.parse(code)
    if category == "sql-injection" and any(isinstance(n, ast.Import) and any(a.name == "sqlite3" for a in n.names) for n in ast.walk(tree)):
        for func in [n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)]:
            assignments = {n.targets[0].id: n for n in ast.walk(func) if isinstance(n, ast.Assign)
                           and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name) and isinstance(n.value, ast.JoinedStr)}
            for call in ast.walk(func):
                if not isinstance(call, ast.Call) or not call_name(call.func).endswith(".execute") or len(call.args) != 1:
                    continue
                arg = call.args[0]
                assignment = assignments.get(arg.id) if isinstance(arg, ast.Name) else None
                joined = assignment.value if assignment else arg
                if not isinstance(joined, ast.JoinedStr):
                    continue
                query, params = _parameterize(joined)
                edits = [(call, f"{ast.unparse(call.func)}({ast.unparse(arg) if assignment else query}, {params})")]
                if assignment:
                    edits.append((assignment.value, query))
                return _replace(code, edits)
    if category == "path-traversal":
        for func in [n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and n.decorator_list]:
            if any(isinstance(n, ast.Call) and call_name(n.func) == "os.path.commonpath" for n in ast.walk(func)):
                continue
            for node in ast.walk(func):
                if (isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name)
                        and isinstance(node.value, ast.Call) and call_name(node.value.func) == "os.path.join"
                        and len(node.value.args) == 2):
                    name = node.targets[0].id
                    base = ast.unparse(node.value.args[0])
                    indent = " " * node.col_offset
                    replacement = (f"{name} = os.path.realpath({ast.unparse(node.value)})\n"
                                   f"{indent}try:\n{indent}    if os.path.commonpath([os.path.realpath({base}), {name}]) != os.path.realpath({base}):\n"
                                   f"{indent}        return jsonify({{'error': 'Path outside allowed directory'}}), 400\n"
                                   f"{indent}except ValueError:\n{indent}    return jsonify({{'error': 'Invalid path'}}), 400")
                    return _replace(code, [(node, replacement)])
    if category == "broken-access-control" and 'session["user_id"]' in code:
        for func in [n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and "user_id" in {a.arg for a in n.args.args}]:
            if any(isinstance(n, ast.Compare) and "session" in ast.unparse(n) for n in ast.walk(func)):
                continue
            first = func.body[0]
            indent = " " * first.col_offset
            guard = ("if not session.get('user_id'):\n" + indent + "    return jsonify({'error': 'Authentication required'}), 401\n" + indent
                     + "if session['user_id'] != user_id:\n" + indent + "    return jsonify({'error': 'Access denied'}), 403\n" + indent)
            return _replace(code, [(first, guard + (ast.get_source_segment(code, first) or ast.unparse(first)))])
    return None
