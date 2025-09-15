# Pre-Deployment Checks

## Quick Guide to Avoid Railway Build Failures

Railway runs the exact same build process as your local environment. To catch errors before pushing:

### Available Commands

```bash
# Quick type check (fastest - catches TypeScript errors)
npm run check:types

# Full build check (exactly what Railway runs)
npm run check:build

# ESLint + TypeScript check
npm run check:all

# Automated pre-push check
npm run pre-push
```

### Recommended Workflow

1. **Before pushing to GitHub:**
   ```bash
   npm run pre-push
   ```
   This runs quick TypeScript and ESLint checks.

2. **If you want to be 100% sure:**
   ```bash
   npm run check:build
   ```
   This runs the exact same build that Railway will run.

### Common Issues and Fixes

#### TypeScript Errors
- **Property doesn't exist**: Cast to `any` or fix the type definition
- **Possibly undefined**: Add null checks or use optional chaining (`?.`)
- **Type not assignable**: Check if you need `null` vs `undefined`

#### React/JSX Errors
- **Unescaped entities**: Use HTML entities (`&apos;`, `&quot;`, etc.)
- **Missing alt prop**: Add alt="" for decorative images

### Why These Errors Don't Show in Dev

- **Dev mode** uses Turbopack with relaxed type checking
- **Build mode** runs full TypeScript compilation with strict checks
- Railway always runs in **build mode**

### Tips

1. Run `npm run check:types` frequently during development
2. Before any deployment, run `npm run check:build`
3. The errors shown locally will be EXACTLY the same as Railway

### Setting Up Git Hook (Optional)

To automatically check before every push:

```bash
# Create git hooks directory if it doesn't exist
mkdir -p .git/hooks

# Create pre-push hook
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
npm run pre-push
EOF

# Make it executable
chmod +x .git/hooks/pre-push
```

Now git will automatically run checks before allowing a push.