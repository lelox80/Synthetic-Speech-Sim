const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'outputs');
fs.mkdirSync(output, { recursive: true });

for (const builder of ['build.cjs', 'build-morrow-full.cjs', 'build-morrow-mutter.cjs', 'build-seemann.cjs']) {
  execFileSync(process.execPath, [path.join(root, 'work', builder)], {
    cwd: root,
    stdio: 'inherit'
  });
}

const html = fs.readFileSync(path.join(output, 'Morrow-Seemann.html'), 'utf8');
fs.writeFileSync(path.join(root, 'index.html'), html.replace(/[ \t]+$/gm, ''));
console.log('Built index.html');
