# ESLint & Prettier 설정 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expo/React Native 프로젝트에 ESLint와 Prettier를 설정하여 일관된 코드 스타일과 품질을 유지한다.

**Architecture:** Expo의 공식 eslint-config-expo를 기반으로 하고, Prettier와 통합하여 충돌을 방지한다. ESLint 9의 flat config 형식을 사용한다.

**Tech Stack:** eslint-config-expo, prettier, eslint-config-prettier, eslint-plugin-prettier

---

## Task 1: 의존성 설치

**Files:**

- Modify: `package.json`

**Step 1: ESLint 및 Prettier 패키지 설치**

```bash
npm install -D eslint eslint-config-expo prettier eslint-config-prettier eslint-plugin-prettier
```

**Step 2: 설치 확인**

Run: `npm ls eslint prettier`
Expected: eslint와 prettier가 devDependencies에 설치됨

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
chore(deps): add eslint and prettier dependencies

- eslint with eslint-config-expo for Expo-specific rules
- prettier with eslint integration
EOF
)"
```

---

## Task 2: Prettier 설정 파일 생성

**Files:**

- Create: `.prettierrc`
- Create: `.prettierignore`

**Step 1: .prettierrc 파일 생성**

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "jsxSingleQuote": false,
  "arrowParens": "always"
}
```

**Step 2: .prettierignore 파일 생성**

```
node_modules/
dist/
.expo/
web-build/
ios/
android/
*.lock
```

**Step 3: Prettier 동작 확인**

Run: `npx prettier --check "app/**/*.tsx" --config .prettierrc`
Expected: 파일들이 체크됨 (포맷 불일치가 있을 수 있음)

**Step 4: Commit**

```bash
git add .prettierrc .prettierignore
git commit -m "$(cat <<'EOF'
chore: add prettier configuration

- No semicolons, single quotes (matches existing code style)
- 2 space indentation, 100 char print width
- Add prettierignore for build artifacts
EOF
)"
```

---

## Task 3: ESLint 설정 파일 생성

**Files:**

- Create: `eslint.config.js`

**Step 1: ESLint flat config 파일 생성**

```javascript
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')
const prettier = require('eslint-plugin-prettier')
const prettierConfig = require('eslint-config-prettier')

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': 'warn',
    },
  },
  {
    ignores: ['node_modules/', 'dist/', '.expo/', 'web-build/', 'ios/', 'android/'],
  },
])
```

**Step 2: ESLint 동작 확인**

Run: `npx eslint app/_layout.tsx`
Expected: ESLint가 파일을 분석함 (경고/오류가 있을 수 있음)

**Step 3: Commit**

```bash
git add eslint.config.js
git commit -m "$(cat <<'EOF'
chore: add eslint configuration with expo preset

- Use eslint-config-expo/flat for Expo-specific rules
- Integrate prettier for formatting rules
- Ignore build artifacts and generated directories
EOF
)"
```

---

## Task 4: package.json에 lint/format 스크립트 추가

**Files:**

- Modify: `package.json`

**Step 1: 스크립트 추가**

package.json의 scripts 섹션에 추가:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\""
  }
}
```

**Step 2: lint 스크립트 실행 확인**

Run: `npm run lint`
Expected: ESLint가 전체 프로젝트를 검사함

**Step 3: format:check 스크립트 실행 확인**

Run: `npm run format:check`
Expected: Prettier가 포맷을 검사함

**Step 4: Commit**

```bash
git add package.json
git commit -m "$(cat <<'EOF'
chore: add lint and format scripts to package.json

- npm run lint / lint:fix for ESLint
- npm run format / format:check for Prettier
EOF
)"
```

---

## Task 5: 기존 코드 포맷팅 적용

**Files:**

- Modify: `app/**/*.tsx`
- Modify: `src/**/*.ts`
- Modify: `src/**/*.tsx`

**Step 1: 전체 코드 포맷팅 실행**

Run: `npm run format`
Expected: 모든 파일이 Prettier 규칙에 맞게 포맷됨

**Step 2: ESLint 자동 수정 실행**

Run: `npm run lint:fix`
Expected: 자동 수정 가능한 ESLint 오류들이 수정됨

**Step 3: 남은 오류 확인**

Run: `npm run lint`
Expected: 오류 없음 (또는 수동 수정이 필요한 오류만 남음)

**Step 4: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
style: apply eslint and prettier formatting to codebase

Auto-formatted all TypeScript/TSX files to match
the new eslint and prettier configuration
EOF
)"
```

---

## Task 6: VS Code 설정 추가 (선택사항)

**Files:**

- Create: `.vscode/settings.json`

**Step 1: VS Code 설정 파일 생성**

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

**Step 2: Commit**

```bash
git add .vscode/settings.json
git commit -m "$(cat <<'EOF'
chore: add vscode settings for auto-format on save

- Format on save with Prettier
- ESLint auto-fix on save
EOF
)"
```

---

## 완료 확인

모든 태스크 완료 후:

1. `npm run lint` - 오류 없음
2. `npm run format:check` - 모든 파일이 포맷됨
3. `npm start` - 앱이 정상적으로 시작됨
