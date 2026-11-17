export interface GlyphSet {
  name: string
  glyphs: readonly string[]
}

/** Real glyphs with a made-up order. Each set needs at least 9 glyphs (the hard puzzle size). */
export const GLYPH_SETS: readonly GlyphSet[] = [
  {
    name: 'Elder Futhark runes',
    glyphs: [...'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'],
  },
  {
    name: 'Canadian Aboriginal syllabics',
    glyphs: [...'ᐁᐃᐅᐊᐯᐱᐳᐸᑌᑎᑐᑕᑫᑭᑯᑲᒉᒋᒍᒐᒣᒥᒧᒪ'],
  },
  {
    name: 'geometric shapes',
    glyphs: [...'◆●▲■★◐▼◇○△□☆⬟⬢✚◒'],
  },
]
