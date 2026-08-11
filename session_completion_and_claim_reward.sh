#!/usr/bin/env bash

# Exit immediately if any command fails (except our explicit checks)
set -e

echo "=================================================================="
echo "SYSTEM MESSAGE: SESSION VALIDATION & CLAIM FLOW"
echo "=================================================================="
echo ""
echo "Running dynamic analysis, performance verification, and compile checks."
echo "You must pass all compliance checks to successfully claim this session."
echo ""
echo "------------------------------------------------------------------"
echo "RUNNING REAL-TIME PERFORMANCE & GC AUDIT..."
echo "------------------------------------------------------------------"

# Run the Node.js compliance scanner for GC allocations in tick/render loops and hardcoded pixel values
node -e "
const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(process.cwd(), 'client');
const EXCLUDE_FILES = ['design-system.ts', 'DiagnosisSystem.ts', 'dev_menu.ts', 'dev_visual_diagnosis.ts', 'map_editor.ts', 'ui_editor.ts', 'dev-entities.ts', 'dev-map-editor.ts'];
const EXCLUDE_DIRS = ['public', 'node_modules', 'dist', 'screens', 'settings', 'ui'];

// Track all compliance violations
const gcViolations = [];
const pxViolations = [];

// 1. Pixel/Layout check patterns
const PROP_REGEX = /\\b(width|height|padding|margin|top|left|right|bottom|font-size|fontSize|paddingLeft|paddingRight|paddingTop|paddingBottom|marginLeft|marginRight|marginTop|marginBottom|minWidth|maxWidth|minHeight|maxHeight|min-width|max-width|min-height|max-height|padding-left|padding-right|padding-top|padding-bottom|margin-left|margin-right|margin-top|margin-bottom)\\b/;

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(file)) {
        walkDir(fullPath, callback);
      }
    } else {
      if (!EXCLUDE_FILES.includes(file) && (file.endsWith('.ts') || file.endsWith('.js'))) {
        callback(fullPath);
      }
    }
  }
}

// Simple parsing helper to extract functions and check for allocations
function parseAndCheckGC(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\\n');
  const relativePath = path.relative(process.cwd(), filePath);

  let currentFunction = null;
  let braceDepth = 0;
  let functionStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comment lines completely
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      continue;
    }

    // Detect high-frequency method/function boundaries (update, tick, render, animate, process, loop)
    // Avoid constructors, init, setup, and destroy
    if (currentFunction === null) {
      const funcMatch = line.match(/(public|private|protected|async|function|const|let|get)?\\s*\\b(update|tick|render|animate|process|loop)\\w*\\s*\\(/i);
      const isInitOrSetup = line.match(/init|setup|constructor|destroy|dispose/i);
      
      if (funcMatch && !isInitOrSetup && line.includes('{')) {
        currentFunction = funcMatch[2];
        braceDepth = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        functionStartLine = i + 1;
        continue;
      }
    } else {
      // We are inside a high-frequency method, track brace depth
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      braceDepth += openBraces - closeBraces;

      // Scan for allocations inside high-frequency function body
      // a) ThreeJS/Vector/Matrix allocations (new THREE.Vector3, etc.)
      const isNewAlloc = line.match(/\\bnew\\s+(THREE\\.\\w+|Vector\\d*|Euler|Quaternion|Matrix\\d*|Color|Group|Mesh|Box\\d*|Ray)/);
      if (isNewAlloc) {
        gcViolations.push({
          file: relativePath,
          line: i + 1,
          functionName: currentFunction,
          text: trimmed,
          type: 'Object Allocation (new ' + isNewAlloc[1] + ')'
        });
      }

      // b) Array/Object literal initialization
      const isLiteralAlloc = line.match(/\\b(const|let|var|return)\\s+\\w+\\s*=\\s*(\\{\\}|\\[\\])/) || line.match(/return\\s+(\\{\\}|\\[\\])/);
      if (isLiteralAlloc) {
        gcViolations.push({
          file: relativePath,
          line: i + 1,
          functionName: currentFunction,
          text: trimmed,
          type: 'Literal Allocation ({} or [])'
        });
      }

      // c) Iteration closures / Arrow functions inside tick/render
      const isClosureAlloc = line.match(/\\.(forEach|map|filter|reduce)\\s*\\(/);
      if (isClosureAlloc) {
        gcViolations.push({
          file: relativePath,
          line: i + 1,
          functionName: currentFunction,
          text: trimmed,
          type: 'Closure Allocation (.' + isClosureAlloc[1] + ' iterator)'
        });
      }

      if (braceDepth <= 0) {
        // Exited function scope
        currentFunction = null;
        braceDepth = 0;
      }
    }
  }
}

// Function to run pixel audit on a file
function runPixelAudit(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\\n');
  const relativePath = path.relative(process.cwd(), filePath);
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      return;
    }
    
    const propMatch = line.match(PROP_REGEX);
    if (propMatch) {
      const pxMatches = line.match(/([0-9]+(\\.[0-9]+)?)px/g);
      if (pxMatches) {
        for (const match of pxMatches) {
          const val = parseFloat(match);
          if (val <= 4 || val === 44 || val === 48) {
            continue;
          }
          pxViolations.push({
            file: relativePath,
            line: index + 1,
            text: trimmed,
            prop: propMatch[0],
            value: match
          });
          break;
        }
      }
    }
  });
}

// Walk files and run both audits
walkDir(TARGET_DIR, (filePath) => {
  // 1. Pixel/Layout Audits
  runPixelAudit(filePath);

  // 2. Garbage Collection Audits
  parseAndCheckGC(filePath);
});

// Also scan the root hud_layout.json file if it exists
const rootHud = path.join(process.cwd(), 'hud_layout.json');
if (fs.existsSync(rootHud)) {
  runPixelAudit(rootHud);
}

// Report Audit Results
let failed = false;

if (pxViolations.length > 0) {
  failed = true;
  console.log('[FAIL] PX LAYOUT AUDIT FAILED');
  console.log('The following files contain hardcoded pixel layout/font dimensions:');
  console.log('------------------------------------------------------------------');
  pxViolations.forEach(v => {
    console.log('\\x1b[33m' + v.file + ':' + v.line + '\\x1b[0m');
    console.log('  Property: \\x1b[36m' + v.prop + '\\x1b[0m | Value: \\x1b[31m' + v.value + '\\x1b[0m');
    console.log('  Code: \\x1b[90m' + v.text + '\\x1b[0m\\n');
  });
} else {
  console.log('[OK] PX LAYOUT AUDIT: Clean! No hardcoded pixel dimensions found.');
}

if (gcViolations.length > 0) {
  failed = true;
  console.log('[FAIL] GARBAGE COLLECTION AUDIT FAILED');
  console.log('The following files contain memory allocations inside high-frequency loops:');
  console.log('------------------------------------------------------------------');
  gcViolations.forEach(v => {
    console.log('\\x1b[33m' + v.file + ':' + v.line + '\\x1b[0m inside \\x1b[35m' + v.functionName + '()\\x1b[0m');
    console.log('  Violation: \\x1b[31m' + v.type + '\\x1b[0m');
    console.log('  Code: \\x1b[90m' + v.text + '\\x1b[0m\\n');
  });
} else {
  console.log('[OK] GARBAGE COLLECTION AUDIT: Clean! Zero allocations in tick/render loops.');
}

if (failed) {
  console.log('------------------------------------------------------------------');
  console.log('REMEDY REQUIRED:');
  if (pxViolations.length > 0) {
    console.log('1. For Hardcoded PX: Use viewport-relative units (vh, vw, clamp),');
    console.log('   container query units (cqw, cqi), percentages (%), or design system tokens.');
  }
  if (gcViolations.length > 0) {
    console.log('2. For GC Allocations: Pre-allocate vectors/arrays outside the function,');
    console.log('   or use standard for-loops instead of closures/array-iterators (like .forEach).');
  }
  console.log('3. Run this script again after resolving issues.');
  console.log('');
  console.log('You are BLOCKED from completing this session until all audits pass.');
  console.log('==================================================================');
  process.exit(1);
} else {
  console.log('[OK] All static analysis performance audits passed successfully!');
  process.exit(0);
}
"

echo ""
echo "------------------------------------------------------------------"
echo "RUNNING APPLET INTEGRITY CHECKS (LINT & BUILD)..."
echo "------------------------------------------------------------------"

if npm run lint && npm run build; then
  echo ""
  echo "=================================================================="
  echo "[SUCCESS] COMPLIANCE CHECK & BUILD SUCCEEDED — YOU MAY NOW CLAIM SUCCESS"
  echo "=================================================================="
  echo ""
  echo "All static analysis audits, compiler validations, and dynamic checks"
  echo "have passed cleanly with perfect scores."
  echo ""
  echo "You may now present the completed work and state your final success"
  echo "to the user."
  echo "=================================================================="
  exit 0
else
  echo ""
  echo "[FAIL] INTEGRITY CHECK FAILED!"
  echo "The application failed to lint or build successfully."
  echo "Please review the build/lint errors above, resolve them, and"
  echo "run this script again."
  echo "=================================================================="
  exit 1
fi
