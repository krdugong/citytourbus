// Draws route-map images from scripts/route-maps/.cache/specs.json (made by prepare.mjs). macOS only.
// Usage: render <specs.json> <repoRoot>
import AppKit

struct Stop: Decodable { let n: Int; let p: [Double] }
struct Route: Decodable { let name: String; let color: String; let path: [[Double]]; let stops: [Stop]; let offset: Int }
struct Tile: Decodable { let file: String; let x: Double; let y: Double }
struct Label: Decodable { let name: String; let p: [Double] }
struct Spec: Decodable { let out: String; let w: Int; let h: Int; let title: String; let sub: String; let tiles: [Tile]; let routes: [Route]; let labels: [Label]; let note: String }

func color(_ hex: String, _ a: CGFloat = 1) -> NSColor {
  var v: UInt64 = 0; Scanner(string: hex.replacingOccurrences(of: "#", with: "")).scanHexInt64(&v)
  return NSColor(red: CGFloat((v >> 16) & 255) / 255, green: CGFloat((v >> 8) & 255) / 255, blue: CGFloat(v & 255) / 255, alpha: a)
}
func font(_ size: CGFloat, _ bold: Bool) -> NSFont {
  let base = NSFont(name: "Apple SD Gothic Neo", size: size) ?? NSFont.systemFont(ofSize: size)
  return bold ? NSFontManager.shared.convert(base, toHaveTrait: .boldFontMask) : base
}
func attrs(_ f: NSFont, _ c: NSColor) -> [NSAttributedString.Key: Any] { [.font: f, .foregroundColor: c] }

let args = CommandLine.arguments
let specs = try! JSONDecoder().decode([Spec].self, from: Data(contentsOf: URL(fileURLWithPath: args[1])))
for s in specs {
  let W = CGFloat(s.w), H = CGFloat(s.h)
  let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: s.w, pixelsHigh: s.h, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  NSGraphicsContext.saveGraphicsState()
  // flipped context so (0,0) is top-left like the spec coordinates, with text and images upright
  let cg = NSGraphicsContext(bitmapImageRep: rep)!.cgContext
  cg.translateBy(x: 0, y: H); cg.scaleBy(x: 1, y: -1)
  NSGraphicsContext.current = NSGraphicsContext(cgContext: cg, flipped: true)
  NSColor.white.setFill(); NSRect(x: 0, y: 0, width: W, height: H).fill()
  for tl in s.tiles {
    if let img = NSImage(contentsOfFile: tl.file) {
      img.draw(in: NSRect(x: tl.x, y: tl.y, width: 256, height: 256), from: .zero, operation: .sourceOver, fraction: 1, respectFlipped: true, hints: nil)
    }
  }
  NSColor(white: 1, alpha: 0.35).setFill(); NSRect(x: 0, y: 0, width: W, height: H).fill() // soften the base map
  // route lines: white casing, then colour; small sideways offset so shared roads stay visible
  for r in s.routes {
    let off = CGFloat(r.offset - (s.routes.count - 1) / 2) * 5
    let p = NSBezierPath(); p.lineJoinStyle = .round; p.lineCapStyle = .round
    for (i, q) in r.path.enumerated() { let pt = NSPoint(x: q[0] + off, y: q[1] + off); i == 0 ? p.move(to: pt) : p.line(to: pt) }
    p.lineWidth = 13; NSColor.white.setStroke(); p.stroke()
    p.lineWidth = 7; color(r.color).setStroke(); p.stroke()
  }
  for l in s.labels {
    let a = attrs(font(22, true), NSColor(white: 0.15, alpha: 1))
    let sz = (l.name as NSString).size(withAttributes: a)
    let rect = NSRect(x: l.p[0] - sz.width / 2 - 8, y: l.p[1] - sz.height / 2 - 3, width: sz.width + 16, height: sz.height + 6)
    NSColor(white: 1, alpha: 0.85).setFill(); NSBezierPath(roundedRect: rect, xRadius: 8, yRadius: 8).fill()
    (l.name as NSString).draw(at: NSPoint(x: rect.minX + 8, y: rect.minY + 3), withAttributes: a)
  }
  // stop markers with route-local numbers (same numbering as the page's stop list)
  for r in s.routes {
    let off = CGFloat(r.offset - (s.routes.count - 1) / 2) * 16
    for st in r.stops {
      let c = NSPoint(x: st.p[0] + off, y: st.p[1])
      let rad: CGFloat = 17
      let circle = NSBezierPath(ovalIn: NSRect(x: c.x - rad, y: c.y - rad, width: rad * 2, height: rad * 2))
      color(r.color).setFill(); circle.fill()
      circle.lineWidth = 3.5; NSColor.white.setStroke(); circle.stroke()
      let a = attrs(font(19, true), .white)
      let txt = "\(st.n)" as NSString; let sz = txt.size(withAttributes: a)
      txt.draw(at: NSPoint(x: c.x - sz.width / 2, y: c.y - sz.height / 2), withAttributes: a)
    }
  }
  // title panel
  let tp = NSRect(x: 40, y: 40, width: W - 80, height: 120)
  NSColor(white: 1, alpha: 0.94).setFill(); NSBezierPath(roundedRect: tp, xRadius: 22, yRadius: 22).fill()
  var tsize: CGFloat = 50
  while tsize > 28 && (s.title as NSString).size(withAttributes: attrs(font(tsize, true), .black)).width > W - 400 { tsize -= 2 }
  (s.title as NSString).draw(at: NSPoint(x: 70, y: 56 + (50 - tsize) / 2), withAttributes: attrs(font(tsize, true), NSColor(white: 0.1, alpha: 1)))
  (s.sub as NSString).draw(at: NSPoint(x: 72, y: 118), withAttributes: attrs(font(24, false), NSColor(white: 0.35, alpha: 1)))
  ("CITYTOURBUS.KR" as NSString).draw(at: NSPoint(x: W - 280, y: 64), withAttributes: attrs(font(22, true), color("#e22b37")))
  // legend
  let lh: CGFloat = 64 + CGFloat(max(0, s.routes.count - 3)) * 0
  let lp = NSRect(x: 40, y: H - 40 - 120, width: W - 80, height: 120)
  NSColor(white: 1, alpha: 0.94).setFill(); NSBezierPath(roundedRect: lp, xRadius: 22, yRadius: 22).fill()
  var x: CGFloat = 70
  for r in s.routes {
    color(r.color).setFill(); NSBezierPath(roundedRect: NSRect(x: x, y: lp.minY + 30, width: 44, height: 12), xRadius: 6, yRadius: 6).fill()
    let a = attrs(font(24, true), NSColor(white: 0.15, alpha: 1))
    (r.name as NSString).draw(at: NSPoint(x: x + 54, y: lp.minY + 20), withAttributes: a)
    x += 54 + (r.name as NSString).size(withAttributes: a).width + 40
  }
  _ = lh
  (s.note as NSString).draw(at: NSPoint(x: 70, y: lp.minY + 70), withAttributes: attrs(font(19, false), NSColor(white: 0.4, alpha: 1)))
  ("© OpenStreetMap contributors" as NSString).draw(at: NSPoint(x: W - 300, y: lp.minY + 70), withAttributes: attrs(font(17, false), NSColor(white: 0.4, alpha: 1)))
  NSGraphicsContext.restoreGraphicsState()
  let url = URL(fileURLWithPath: args[2]).appendingPathComponent(s.out)
  try! FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
  try! rep.representation(using: .jpeg, properties: [.compressionFactor: 0.86])!.write(to: url)
  print("wrote", s.out)
}
