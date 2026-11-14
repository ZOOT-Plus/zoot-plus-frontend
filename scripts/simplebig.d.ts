declare module 'simplebig' {
  const simplebig: {
    s2t(text: string): string
    t2s(text: string): string
    attach(): void
  }

  export = simplebig
}
