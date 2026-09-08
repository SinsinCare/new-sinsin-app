import fs from "node:fs"
import path from "node:path"
import ts from "typescript"
export function nativeTextImports(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  return source.statements.flatMap((node) => {
    if (!ts.isImportDeclaration(node) || node.importClause?.isTypeOnly)
      return []
    const names = node.importClause?.namedBindings
    if (!names || !ts.isNamedImports(names)) return []
    const sourceModule = node.moduleSpecifier.text
    const checkedNames =
      sourceModule === "react-native"
        ? ["Text", "TextInput"]
        : sourceModule === "@gorhom/bottom-sheet"
          ? ["BottomSheetTextInput"]
          : sourceModule === "react-native-gesture-handler"
            ? ["TextInput"]
            : []
    return names.elements
      .filter(
        (e) =>
          !e.isTypeOnly &&
          checkedNames.includes(e.propertyName?.text ?? e.name.text),
      )
      .map((e) => `${file}: ${e.getText(source)}`)
  })
}
function files(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? files(path.join(directory, e.name))
        : /\.[jt]sx?$/.test(e.name)
          ? [path.join(directory, e.name)]
          : [],
    )
}
const positive = nativeTextImports(
  "positive.tsx",
  'import { Text as Alias, type TextInput } from "react-native"',
)
if (positive.length !== 1)
  throw new Error("Text import audit positive control failed")
if (
  nativeTextImports(
    "sheet.tsx",
    'import { BottomSheetTextInput as Input } from "@gorhom/bottom-sheet"',
  ).length !== 1
)
  throw new Error("Sheet input audit positive control failed")
const failures = [...files("src"), ...files("app")]
  .filter(
    (f) =>
      ![
        "src/design-system-v2/primitives/NativeText.tsx",
        "src/design-system-v2/components/V2SheetTextInput.tsx",
      ].includes(f),
  )
  .flatMap((f) => nativeTextImports(f, fs.readFileSync(f, "utf8")))
if (failures.length) {
  console.error(failures.join("\n"))
  process.exitCode = 1
} else console.log("TEXT_SCALING_COVERAGE_OK")
