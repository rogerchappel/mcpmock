#!/usr/bin/env bash
set -euo pipefail

echo "🔧 MCPMock Smoke Test"
echo "===================="
echo ""

fail=0
pass_count=0

check() {
  if "$@"; then
    echo "✅ $*"
    pass_count=$((pass_count + 1))
  else
    echo "❌ $*"
    fail=1
  fi
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

check node -e "require('./fixtures/catalog.json')"
check bash -c 'test -d src'
check bash -c 'test -d fixtures'
check bash -c 'test -f fixtures/catalog.json'
check bash -c 'test -f src/cli.ts'
check bash -c 'test -f src/catalog.ts'
check bash -c 'test -f src/runner.ts'
check bash -c 'test -f src/template.ts'
check bash -c 'test -f src/transcript.ts'
check bash -c 'test -f src/orchestrator.ts'
check bash -c 'test -f src/types.ts'
check bash -c 'test -f src/__tests__/catalog.test.ts'
check bash -c 'test -f src/__tests__/runner.test.ts'
check bash -c 'test -f src/__tests__/template.test.ts'
check bash -c 'test -f src/__tests__/transcript.test.ts'
check bash -c 'test -f src/__tests__/orchestrator.test.ts'
check bash -c 'test -f docs/PRD.md'
check bash -c 'test -f docs/TASKS.md'
check bash -c 'test -f docs/ORCHESTRATION.md'
check bash -c 'test -f docs/orchestration.json'

echo ""

if [ -f "node_modules/.package-lock.json" ] || [ -d "node_modules" ]; then
  echo "✅ node_modules exist"
  pass_count=$((pass_count + 1))
fi

echo ""
echo "Smoke test: $pass_count checks"
if [ "$fail" -eq 0 ]; then
  echo "✅ All smoke checks passed"
else
  echo "❌ Some checks failed"
  exit 1
fi
