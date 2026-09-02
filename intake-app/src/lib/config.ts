// Typed access to the generated config (src/config/*.json), built from
// docs/functions-values-source.md by scripts/build-config.mjs.

import functionsJson from '@/config/functions.json';
import valuesJson from '@/config/values.json';

export interface FunctionItem {
  id: string;
  label: string;
}

export interface FunctionCategory {
  id: string;
  name: string;
  jobCategory: string; // e.g. "information-oriented"
  jobCategoryName: string; // e.g. "Information-Oriented Functions"
  branch: string | null; // "one-on-one" | "group" | null (People only)
  branchName: string | null;
  items: FunctionItem[];
  hasOther: boolean;
  walkIndex: number; // 1-based position in the 19-screen walk
}

export interface FunctionsConfig {
  jobCategories: { id: string; name: string }[];
  categories: FunctionCategory[];
  meta: { categoryCount: number; itemCount: number; source: string };
}

export interface ValueOption {
  id: string;
  label: string;
}

export interface ValuesConfig {
  values: ValueOption[];
  hasOther: boolean;
  meta: { valueCount: number; source: string };
}

export const functionsConfig = functionsJson as FunctionsConfig;
export const valuesConfig = valuesJson as ValuesConfig;

/** All function categories in walk order (Info 5 → Things 7 → People 1:1 3 → People Group 4). */
export const functionCategories = functionsConfig.categories;

/** Flat list of every function item id (order follows the walk). */
export const allFunctionItemIds: string[] = functionCategories.flatMap((c) =>
  c.items.map((i) => i.id),
);

/** Lookup: item id → its label. */
export const functionItemLabel: Record<string, string> = Object.fromEntries(
  functionCategories.flatMap((c) => c.items.map((i) => [i.id, i.label])),
);

/** Lookup: item id → its category id. */
export const functionItemCategory: Record<string, string> = Object.fromEntries(
  functionCategories.flatMap((c) => c.items.map((i) => [i.id, c.id])),
);

export const valueLabel: Record<string, string> = Object.fromEntries(
  valuesConfig.values.map((v) => [v.id, v.label]),
);
