// Renders keyword card images (JPEG) from a JSON spec. macOS only.
// Usage: cards <spec.json> <repoRoot>
import AppKit

struct Card: Decodable { let out: String; let w: Int; let h: Int; let eyebrow: String; let title: String; let sub: String; let bg: String }

func color(_ hex: String) -> NSColor {
  var v: UInt64 = 0; Scanner(string: hex.replacingOccurrences(of: "#", with: "")).scanHexInt64(&v)
  return NSColor(red: CGFloat((v >> 16) & 255) / 255, green: CGFloat((v >> 8) & 255) / 255, blue: CGFloat(v & 255) / 255, alpha: 1)
}
func font(_ size: CGFloat, bold: Bool) -> NSFont {
  let base = NSFont(name: "Apple SD Gothic Neo", size: size) ?? NSFont.systemFont(ofSize: size)
  return bold ? NSFontManager.shared.convert(base, toHaveTrait: .boldFontMask) : base
}
func text(_ s: String, _ f: NSFont, _ c: NSColor, _ rect: NSRect, lineHeight: CGFloat = 1.15) {
  let p = NSMutableParagraphStyle(); p.lineHeightMultiple = lineHeight; p.lineBreakStrategy = .hangulWordPriority
  (s as NSString).draw(with: rect, options: [.usesLineFragmentOrigin], attributes: [.font: f, .foregroundColor: c, .paragraphStyle: p])
}

let args = CommandLine.arguments
let cards = try! JSONDecoder().decode([Card].self, from: Data(contentsOf: URL(fileURLWithPath: args[1])))
let root = args[2]
for c in cards {
  let W = CGFloat(c.w), H = CGFloat(c.h), s = min(W, H) / 1080
  let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: c.w, pixelsHigh: c.h, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  color(c.bg).setFill(); NSRect(x: 0, y: 0, width: W, height: H).fill()
  NSColor(white: 1, alpha: 0.09).setFill()
  NSBezierPath(ovalIn: NSRect(x: W - 520 * s, y: -260 * s, width: 820 * s, height: 820 * s)).fill()
  NSColor(white: 1, alpha: 0.06).setFill()
  NSBezierPath(ovalIn: NSRect(x: -200 * s, y: H - 260 * s, width: 460 * s, height: 460 * s)).fill()
  let pad = 88 * s, white = NSColor.white
  // eyebrow pill
  let ef = font(30 * s, bold: true)
  let ew = (c.eyebrow as NSString).size(withAttributes: [.font: ef]).width + 44 * s
  let pill = NSRect(x: pad, y: H - pad - 62 * s, width: ew, height: 62 * s)
  NSColor(white: 1, alpha: 0.18).setFill(); NSBezierPath(roundedRect: pill, xRadius: 31 * s, yRadius: 31 * s).fill()
  text(c.eyebrow, ef, white, pill.insetBy(dx: 22 * s, dy: 12 * s))
  let wide = W > H
  let titleH = (wide ? 230 : 340) * s
  // shrink the title until it fits the box (long city names would otherwise be clipped)
  var size = (wide ? 92 : 128) * s
  var tf = font(size, bold: true)
  let tp = NSMutableParagraphStyle(); tp.lineHeightMultiple = 1.05; tp.lineBreakStrategy = .hangulWordPriority
  while size > 40 * s {
    let h = (c.title as NSString).boundingRect(with: NSSize(width: W - pad * 2, height: 10000), options: [.usesLineFragmentOrigin], attributes: [.font: tf, .paragraphStyle: tp]).height
    if h <= titleH { break }
    size -= 4 * s; tf = font(size, bold: true)
  }
  text(c.title, tf, white, NSRect(x: pad, y: H / 2 - titleH / 2 + (wide ? 10 : 30) * s, width: W - pad * 2, height: titleH), lineHeight: 1.05)
  text(c.sub, font((wide ? 36 : 42) * s, bold: false), NSColor(white: 1, alpha: 0.92), NSRect(x: pad, y: pad + 70 * s, width: W - pad * 2, height: 120 * s))
  text("CITYTOURBUS.KR", font(28 * s, bold: true), NSColor(white: 1, alpha: 0.75), NSRect(x: pad, y: pad - 10 * s, width: W - pad * 2, height: 50 * s))
  NSGraphicsContext.restoreGraphicsState()
  let url = URL(fileURLWithPath: root).appendingPathComponent(c.out)
  try! FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
  try! rep.representation(using: .jpeg, properties: [.compressionFactor: 0.86])!.write(to: url)
  print("wrote", c.out)
}
