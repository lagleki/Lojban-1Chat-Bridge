declare module "twemoji-parser" {
  export interface TwemojiEntity {
    indices: [number, number]
    url: string
    text: string
    type: string
  }
  export function parse(
    text: string,
    options?: {
      assetType?: string
      buildUrl?: (codepoints: string, assetType: string) => string
    },
  ): TwemojiEntity[]
}
