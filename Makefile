.PHONY: dev build check lint test test-rust test-ui assert-frontend-tests clean install

# ============================================================================
# Development
# ============================================================================

dev:
	npm run tauri dev

build:
	npm run tauri build

install:
	npm install
	cd src-tauri && cargo build

# ============================================================================
# Quality Checks
# ============================================================================

lint:
	cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
	npm run lint

lint-fix:
	cargo clippy --manifest-path src-tauri/Cargo.toml --fix --allow-dirty
	npm run lint -- --fix

format:
	cargo fmt --manifest-path src-tauri/Cargo.toml
	npm run format

typecheck:
	cargo check --manifest-path src-tauri/Cargo.toml
	npm run check

# THE IMPORTANT ONE: Run before completing any phase
check: lint typecheck test
	@echo "✓ All checks passed!"

# ============================================================================
# Testing
# ============================================================================

test: test-rust test-ui
	@echo "✓ All tests passed!"

test-rust:
	cargo test --manifest-path src-tauri/Cargo.toml

assert-frontend-tests:
	@if command -v rg >/dev/null 2>&1; then \
		count=$$(rg --files src tests 2>/dev/null | rg '\.(test|spec)\.(ts|js)$$' | wc -l); \
	else \
		count=$$(find src tests -type f \( -name '*.test.ts' -o -name '*.spec.ts' -o -name '*.test.js' -o -name '*.spec.js' \) 2>/dev/null | wc -l); \
	fi; \
	if [ "$$count" -eq 0 ]; then \
		echo "✗ No frontend test files found (.test/.spec .ts/.js in src/ or tests/)"; \
		exit 1; \
	fi; \
	echo "✓ Frontend test file guard: $$count file(s)"

test-ui: assert-frontend-tests
	npm run test

# ============================================================================
# Cleanup
# ============================================================================

clean:
	rm -rf node_modules/
	rm -rf .svelte-kit/
	rm -rf dist/
	cargo clean --manifest-path src-tauri/Cargo.toml

# ============================================================================
# Help
# ============================================================================

help:
	@echo "Aperture Development Commands"
	@echo ""
	@echo "  make dev        - Start development server"
	@echo "  make build      - Build for production"
	@echo "  make install    - Install all dependencies"
	@echo ""
	@echo "  make check      - Run all quality checks (lint + typecheck + test)"
	@echo "  make lint       - Run linters"
	@echo "  make test       - Run all tests"
	@echo ""
	@echo "  make clean      - Clean build artifacts"
