declare module "nspell" {
  export type NspellDictionary = {
    aff: ArrayBufferView | Buffer | string;
    dic: ArrayBufferView | Buffer | string;
  };

  export type NspellInstance = {
    add(word: string, model?: string): void;
    correct(word: string): boolean;
    remove(word: string): void;
    suggest(word: string): string[];
  };

  export default function nspell(
    dictionary: NspellDictionary | Array<NspellDictionary>
  ): NspellInstance;
}
