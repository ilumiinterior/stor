import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";
it("keeps readable JSX UI text in translation dictionaries", () => {
  const violations: string[] = [];
  function scan(dir: string) {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, name.name);
      if (name.isDirectory()) {
        scan(path);
        continue;
      }
      if (!path.endsWith(".tsx")) continue;
      const file = ts.createSourceFile(
        path,
        readFileSync(path, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      function walk(node: ts.Node) {
        if (ts.isJsxText(node) && /[\p{L}]{2}/u.test(node.text))
          violations.push(`${path}: ${node.text.trim()}`);
        if (
          ts.isJsxAttribute(node) &&
          ["title", "placeholder", "aria-label", "alt"].includes(
            node.name.getText(file),
          ) &&
          node.initializer &&
          ts.isStringLiteral(node.initializer) &&
          /[\p{L}]{2}/u.test(node.initializer.text)
        )
          violations.push(`${path}: ${node.initializer.text}`);
        ts.forEachChild(node, walk);
      }
      walk(file);
    }
  }
  scan("src");
  expect(violations).toEqual([]);
});
