declare module 'cc-cedict' {
  interface CedictEntry {
    simplified: string;
    traditional: string;
    pinyin: string;
    definitions: string[];
  }

  interface Cedict {
    search(text: string): CedictEntry[];
    searchByPinyin(pinyin: string): CedictEntry[];
    searchByDefinition(definition: string): CedictEntry[];
  }

  export function load(): Promise<Cedict>;
} 