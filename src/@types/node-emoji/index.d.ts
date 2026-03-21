declare module "node-emoji" {
  const emoji: {
    emojify(text: string): string
    unemojify(text: string): string
  }
  export default emoji
}
