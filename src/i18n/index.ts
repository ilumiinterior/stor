import { sk } from "./sk";
type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];
export type TranslationKey = Paths<typeof sk>;
export type Dictionary = { [key: string]: string | Dictionary };
export const defaultLocale = "sk";
export const fallbackLocale = "sk";
const dictionaries: Record<string, Dictionary> = { sk };
function lookup(dictionary: Dictionary, key: string): string | undefined {
  let value: string | Dictionary = dictionary;
  for (const part of key.split(".")) {
    if (typeof value === "string") return;
    value = value[part];
    if (value === undefined) return;
  }
  return typeof value === "string" ? value : undefined;
}
export function registerLocale(locale: string, dictionary: Dictionary) {
  dictionaries[locale] = dictionary;
}
export function t(
  key: TranslationKey,
  params: Record<string, string | number> = {},
  locale = defaultLocale,
): string {
  const value =
    lookup(dictionaries[locale] ?? sk, key) ?? lookup(sk, key) ?? key;
  return value.replace(/\{(\w+)\}/g, (match, name) =>
    params[name] === undefined ? match : String(params[name]),
  );
}
