import { readFileSync, writeFileSync } from "node:fs";
const batch = process.argv.includes("--post-b6") ? "post-b6" : process.argv.includes("--b6") ? "b6" : "b5";
const input = `src/integrations/api/fixtures/${batch}/openapi.json`;
const output = `src/integrations/api/${batch === "post-b6" ? "postB6" : batch}Schemas.ts`;
const definitions = JSON.parse(readFileSync(input, "utf8")).components.schemas;
const selected = ["StateOut", "RoleOut", "GroupOut", "ClanOut", "RequestOut", "OwnRequestOut", "ApplicantOut", "MembershipOut", "InviteOut", "ClanHomeOut", "ContributionOut", "TreasuryOut", "EquipmentOut", "InventoryOut", "ShopItemOut", "MutationOut", "ClanMissionOut", "TrophyOut", "GovernanceOut", "RecoveryOut", "RosterPage", "RoleIn", "ClanCreateIn", "DecisionIn", "RemovalCaseIn", "VoteIn", "IdempotencyIn"];
const emitted = new Map();
function ref(name) {
  if (!definitions[name]) throw new Error(`Missing published B5 schema ${name}`);
  if (!emitted.has(name)) { const expression = emit(definitions[name]); emitted.set(name, `export const ${name} = ${expression};\nexport type ${name} = z.infer<typeof ${name}>;`); }
  return name;
}
function emit(value) {
  if (Object.hasOwn(value, "const")) return `z.literal(${JSON.stringify(value.const)})`;
  if (value.$ref) return ref(value.$ref.split("/").at(-1));
  if (value.anyOf) return `z.union([${value.anyOf.map(emit).join(", ")}])`;
  if (value.enum) return value.enum.length === 1 ? `z.literal(${JSON.stringify(value.enum[0])})` : `z.enum(${JSON.stringify(value.enum)})`;
  if (value.type === "null") return "z.null()";
  if (value.type === "array") return `z.array(${emit(value.items)})`;
  if (value.type === "object") return `z.object({\n${Object.entries(value.properties ?? {}).map(([name, schema]) => `  ${JSON.stringify(name)}: ${emit(schema)}${value.required?.includes(name) ? "" : ".optional()"},`).join("\n")}\n})`;
  if (value.type === "boolean") return "z.boolean()";
  if (value.type === "integer" || value.type === "number") {
    let expression = value.type === "integer" ? "z.number().int().safe()" : "z.number().finite()";
    for (const [property, method] of [["minimum", "min"], ["maximum", "max"], ["exclusiveMinimum", "gt"], ["exclusiveMaximum", "lt"]]) if (typeof value[property] === "number") expression += `.${method}(${value[property]})`;
    return expression;
  }
  if (value.type === "string") {
    let expression = value.format === "date-time" ? "z.iso.datetime({ offset: true })" : "z.string()";
    if (value.minLength !== undefined) expression += `.min(${value.minLength})`;
    if (value.maxLength !== undefined) expression += `.max(${value.maxLength})`;
    return expression;
  }
  throw new Error(`Unsupported B5 schema: ${JSON.stringify(value)}`);
}
if (batch !== "b5") selected.push("ClanActivityOut", "ClanActivityPage");
selected.forEach(ref);
const text = `// Generated from the exact ${batch.toUpperCase()} pin's OpenAPI; do not hand-edit.\nimport { z } from "zod";\n\n` + Array.from(emitted.values()).join("\n\n") + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(output, "utf8") !== text) throw new Error("B5 generated schema drift");
  console.log(`${batch.toUpperCase()} generated schemas match pinned OpenAPI`);
} else writeFileSync(output, text);
