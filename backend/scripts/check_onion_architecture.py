#!/usr/bin/env python3
from __future__ import annotations

import ast
from dataclasses import dataclass
from pathlib import Path

RED = '\033[0;31m'
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
NC = '\033[0m'


@dataclass
class LayerRule:
    name: str
    directory: str
    forbidden: tuple[str, ...]
    description: str


@dataclass
class ImportViolation:
    file: Path
    lineno: int
    module: str
    statement: str


SCRIPT_PATH = Path(__file__).resolve()
REPO_ROOT = SCRIPT_PATH.parents[1]
APP_ROOT = REPO_ROOT / 'app'


if not APP_ROOT.exists():
    raise SystemExit(
        f'{RED}Error:{NC} backend/app directory not found at the same level as backend/scripts'
    )


LAYER_RULES: list[LayerRule] = [
    LayerRule(
        name='Domain',
        directory='domain',
        forbidden=('app.application', 'app.infrastructure', 'app.presentation'),
        description='Must not depend on Application, Infrastructure, or Presentation layers',
    ),
    LayerRule(
        name='Application',
        directory='application',
        forbidden=('app.infrastructure', 'app.presentation'),
        description='Must not depend on Infrastructure or Presentation layers',
    ),
    LayerRule(
        name='Infrastructure',
        directory='infrastructure',
        forbidden=('app.presentation',),
        description='Must not depend on Presentation layer',
    ),
    LayerRule(
        name='Presentation',
        directory='presentation',
        forbidden=(),
        description='May depend on inner layers',
    ),
]


LAYER_PREFIX = {
    'Domain': 'app.domain',
    'Application': 'app.application',
    'Infrastructure': 'app.infrastructure',
    'Presentation': 'app.presentation',
}


def module_path_from_file(py_file: Path) -> str:
    rel = py_file.relative_to(APP_ROOT)
    without_suffix = rel.with_suffix('')
    parts = ['app', *without_suffix.parts]
    return '.'.join(parts)


def resolve_base_modules(module_path: str, node: ast.AST) -> list[str]:
    if isinstance(node, ast.Import):
        return [alias.name for alias in node.names]
    if isinstance(node, ast.ImportFrom):
        base = node.module
        level = node.level
        if level == 0:
            return [base] if base else []
        parts = module_path.split('.')
        if level > len(parts):
            return []
        base_parts = parts[:-level]
        if base:
            base_parts.extend(base.split('.'))
        return ['.'.join(base_parts)] if base_parts else []
    return []


def classify_module(module: str) -> str | None:
    for layer, prefix in LAYER_PREFIX.items():
        if module == prefix or module.startswith(prefix + '.'):
            return layer
    return None


def is_forbidden(module: str, forbidden: tuple[str, ...]) -> bool:
    return any(
        module == prefix or module.startswith(prefix + '.') for prefix in forbidden
    )


def rel_to_repo(path: Path) -> str:
    try:
        return path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def emit_error_annotation(path: Path, lineno: int, message: str) -> None:
    location = rel_to_repo(path)
    if lineno:
        print(f'::error file={location},line={lineno}::{message}')
    else:
        print(f'::error file={location}::{message}')


def print_header() -> None:
    print('🔍 Onion Architecture Dependency Checker')
    print('========================================\n')


def print_overview() -> None:
    print('📊 Architecture Overview')
    print('========================')
    print('\nLayer Structure:')
    print('  1. Domain (Core) - Business logic and entities')
    print('  2. Application - Use cases and application services')
    print('  3. Infrastructure - External systems integration (DB, API, etc.)')
    print('  4. Presentation - Controllers and UI boundary')
    print('\nDependency Rules:')
    print('  • Domain → Must not depend on other layers')
    print('  • Application → May depend only on Domain')
    print('  • Infrastructure → May depend on Domain and Application')
    print('  • Presentation → May depend on all inner layers')
    print('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')


def check_layer(
    rule: LayerRule,
    graph: dict[str, set[str]],
    files_checked: set[Path],
) -> list[ImportViolation]:
    layer_path = APP_ROOT / rule.directory
    print(f'{YELLOW}Checking:{NC} {rule.name} layer dependencies...')
    if not layer_path.exists():
        print(f'  ⚠️  {rule.name} layer not found at {rel_to_repo(layer_path)}\n')
        return []

    violations: list[ImportViolation] = []
    for py_file in layer_path.rglob('*.py'):
        files_checked.add(py_file)
        try:
            source = py_file.read_text(encoding='utf-8')
        except OSError as exc:
            violations.append(ImportViolation(py_file, 0, 'N/A', f'[read error] {exc}'))
            continue
        try:
            tree = ast.parse(source)
        except SyntaxError as exc:
            violations.append(
                ImportViolation(
                    py_file, exc.lineno or 0, 'N/A', f'[parse error] {exc.msg}'
                )
            )
            continue

        module_path = module_path_from_file(py_file)
        source_layer = classify_module(module_path)
        if not source_layer:
            continue
        graph.setdefault(module_path, set())

        lines = source.splitlines()
        for node in ast.walk(tree):
            if not isinstance(node, ast.Import | ast.ImportFrom):
                continue
            modules = resolve_base_modules(module_path, node)
            if not modules:
                continue
            lineno = getattr(node, 'lineno', 0)
            statement = lines[lineno - 1].strip() if 0 < lineno <= len(lines) else ''
            for module in modules:
                if not module:
                    continue
                dest_layer = classify_module(module)
                if dest_layer:
                    graph.setdefault(module_path, set()).add(module)
                if is_forbidden(module, rule.forbidden):
                    violations.append(
                        ImportViolation(
                            file=py_file,
                            lineno=lineno,
                            module=module,
                            statement=statement,
                        )
                    )

    if violations:
        print(f'{RED}❌{NC} Forbidden dependencies detected in {rule.name} layer:')
        for violation in violations:
            location = (
                f'{rel_to_repo(violation.file)}:{violation.lineno}'
                if violation.lineno
                else rel_to_repo(violation.file)
            )
            emit_error_annotation(
                violation.file,
                violation.lineno,
                f'Forbidden dependency: {violation.module}',
            )
            print(f'    └─ {location}')
            if violation.statement:
                print(f'       ⤷ {violation.statement}')
        print()
    else:
        print(f'{GREEN}✅{NC} {rule.name} layer: No forbidden dependencies found\n')
    return violations


def detect_circular_dependencies(graph: dict[str, set[str]]) -> set[tuple[str, str]]:
    print(f'{YELLOW}Checking:{NC} Circular dependencies...')
    pairs: set[tuple[str, str]] = set()
    for src, targets in graph.items():
        for dst in targets:
            if src == dst:
                continue
            if src in graph.get(dst, set()):
                pairs.add(tuple(sorted((src, dst))))
    if pairs:
        print(f'{RED}❌{NC} Circular dependencies detected:')
        for a, b in sorted(pairs):
            print(f'    └─ {a} ⟷ {b}')
            print(f'::error ::Circular dependency: {a} ⟷ {b}')
        print()
    else:
        print(f'{GREEN}✅{NC} No circular dependencies found\n')
    return pairs


def main() -> int:
    print_header()
    print_overview()
    print('🔍 Running dependency checks...')
    print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    dependency_graph: dict[str, set[str]] = {}
    violations_map: dict[str, list[ImportViolation]] = {}
    files_checked: set[Path] = set()

    for rule in LAYER_RULES:
        violations = check_layer(rule, dependency_graph, files_checked)
        violations_map[rule.name] = violations

    cycles = detect_circular_dependencies(dependency_graph)

    print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    print('📋 Summary')
    print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    violation_count = sum(len(items) for items in violations_map.values())
    if violation_count == 0 and not cycles:
        print(f'{GREEN}✅ All architecture checks passed{NC}\n')
        print('Code follows Onion Architecture principles.')
        print(f'\n{len(files_checked)} files checked.')
        return 0

    if violation_count:
        print(f'{RED}❌ Detected {violation_count} architecture violation(s){NC}\n')
        for rule in LAYER_RULES:
            items = violations_map[rule.name]
            if items:
                print(f'- {rule.name}: {rule.description}')
    if cycles:
        print(
            '- Circular dependencies: Please resolve mutual dependencies between the modules above.'
        )

    print('\nPlease fix violations to maintain Onion Architecture.')
    print(f'\n{len(files_checked)} files checked.')
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
