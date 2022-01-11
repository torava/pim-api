export enum Locale {
  'fi-FI' = 'fi-FI',
  'en-US' = 'en-US',
  'sv-SE' = 'sv-SE',
  'es-AR' = 'es-AR'
}

export type NameTranslations = {[key in Locale]?: string};

// https://stackoverflow.com/a/62055863
type Entries<T> = { [K in keyof T]: [K, T[K]] }[keyof T];
export function ObjectEntries<T extends object>(t: T): Entries<T>[] {
  return Object.entries(t) as any;
}

// https://stackoverflow.com/a/61132308
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export interface Token {
  substring: string;
  distance: number;
  accuracy?: number;
}
