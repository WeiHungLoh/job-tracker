import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';
import { ESLint } from 'eslint';

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));

const readSourceFiles = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(
        entries.map((entry) => {
            const entryPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                return readSourceFiles(entryPath);
            }
            return entryPath.endsWith('.ts') ? [entryPath] : [];
        })
    );
    return files.flat();
};

test('business modules expose explicit APIs and only depend on permitted module APIs', async () => {
    const modules = await readdir(path.join(sourceRoot, 'modules'));
    const { moduleDependencies } = await import('../moduleBoundaries.mjs');
    assert.deepEqual(modules.sort(), Object.keys(moduleDependencies).sort());

    const files = await readSourceFiles(sourceRoot);
    const fileSet = new Set(files);
    const graph = new Map();

    for (const file of files) {
        const relativeFile = path.relative(sourceRoot, file);
        const owner = relativeFile.split(path.sep)[0] === 'modules' ? relativeFile.split(path.sep)[1] : undefined;
        const source = ts.createSourceFile(file, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true);
        const dependencies = [];

        const inspect = (node) => {
            let specifier;
            if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
                specifier = node.moduleSpecifier;
            } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
                specifier = node.arguments[0];
            } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
                specifier = node.argument.literal;
            }
            if (specifier && ts.isStringLiteral(specifier) && specifier.text.startsWith('.')) {
                const target = path.resolve(path.dirname(file), specifier.text.replace(/\.js$/, '.ts'));
                assert.ok(fileSet.has(target), `${relativeFile} has an unresolved import: ${specifier.text}`);
                dependencies.push(target);

                const targetPath = path.relative(sourceRoot, target).split(path.sep);
                if (owner && targetPath[0] !== 'modules') {
                    assert.equal(targetPath[0], 'shared', `${relativeFile} imports application startup code`);
                }
                if (relativeFile.startsWith(`shared${path.sep}`)) {
                    assert.equal(
                        targetPath[0],
                        'shared',
                        `${relativeFile} depends on code outside shared infrastructure`
                    );
                }
                if (targetPath[0] === 'modules' && targetPath[1] !== owner) {
                    const targetOwner = targetPath[1];
                    if (owner) {
                        assert.ok(
                            moduleDependencies[owner].includes(targetOwner),
                            `${owner} must not depend on ${targetOwner}`
                        );
                        assert.equal(targetPath.slice(2).join('/'), 'api.ts', `${relativeFile} bypasses a module API`);
                    } else {
                        const allowedEntry =
                            targetPath[2] === 'api.ts' ||
                            (relativeFile === 'app.ts' && ['routes.ts', 'archivedRoutes.ts'].includes(targetPath[2]));
                        assert.ok(allowedEntry, `${relativeFile} imports a private module implementation`);
                    }
                }
            }
            ts.forEachChild(node, inspect);
        };
        inspect(source);
        graph.set(file, dependencies);
    }

    const visited = new Set();
    const visiting = new Set();
    const visit = (file) => {
        assert.ok(!visiting.has(file), `Circular dependency at ${path.relative(sourceRoot, file)}`);
        if (visited.has(file)) return;
        visiting.add(file);
        for (const dependency of graph.get(file)) visit(dependency);
        visiting.delete(file);
        visited.add(file);
    };
    for (const file of files) visit(file);

    for (const module of modules) {
        assert.ok(fileSet.has(path.join(sourceRoot, 'modules', module, 'api.ts')), `${module} needs a public API`);
    }
});

test('lint rejects private module imports and forbidden dependency directions', async () => {
    const eslint = new ESLint({ cwd: fileURLToPath(new URL('../', import.meta.url)) });
    const cases = [
        { file: 'interviews/service.ts', target: '../applications/api.js', allowed: true },
        { file: 'interviews/service.ts', target: '../applications/repository.js', allowed: false },
        { file: 'applications/service.ts', target: '../interviews/api.js', allowed: false },
    ];

    for (const { file, target, allowed } of cases) {
        const [result] = await eslint.lintText(`export { example } from '${target}';\n`, {
            filePath: `src/modules/${file}`,
        });
        const violations = result.messages.filter((message) => message.ruleId === 'no-restricted-imports');
        assert.equal(violations.length, allowed ? 0 : 1, `${file} importing ${target}`);
        assert.equal(result.fatalErrorCount, 0);
    }
});
