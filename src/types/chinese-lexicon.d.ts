declare module 'chinese-lexicon' {
  interface Definition {
    simplified: string;
    traditional?: string;
    pinyin: string;
    definitions: string[];
  }

  export function getDefinitions(text: string): Promise<Definition[]>;
} 