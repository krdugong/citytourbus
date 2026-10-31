// Renders keyword card images (JPEG) from a JSON spec. macOS only. Compiled together with landmarks.swift
// (see make-cards.sh). Usage: cards <spec.json> <repoRoot>
// Layout: light background, big open-top bus illustration and the title all inside the CENTRE SQUARE of the
// canvas, because Naver/Google/Kakao crop og:image (1200×630) to a 1:1 thumbnail around the centre.
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
func para(_ lineHeight: CGFloat) -> NSMutableParagraphStyle {
  let p = NSMutableParagraphStyle(); p.lineHeightMultiple = lineHeight; p.lineBreakStrategy = .hangulWordPriority; p.alignment = .center; return p
}
func text(_ s: String, _ f: NSFont, _ c: NSColor, _ rect: NSRect, lineHeight: CGFloat = 1.15) {
  (s as NSString).draw(with: rect, options: [.usesLineFragmentOrigin], attributes: [.font: f, .foregroundColor: c, .paragraphStyle: para(lineHeight)])
}
func measure(_ s: String, _ f: NSFont, width: CGFloat, lineHeight: CGFloat) -> NSSize {
  (s as NSString).boundingRect(with: NSSize(width: width, height: 10000), options: [.usesLineFragmentOrigin], attributes: [.font: f, .paragraphStyle: para(lineHeight)]).size
}
func rr(_ r: NSRect, _ rad: CGFloat, _ c: NSColor) { c.setFill(); NSBezierPath(roundedRect: r, xRadius: rad, yRadius: rad).fill() }
func oval(_ r: NSRect, _ c: NSColor) { c.setFill(); NSBezierPath(ovalIn: r).fill() }

// Open-top double-decker, side view, design box 1000×560 units (ground at y=40); fills `box` keeping aspect.
func drawBus(_ box: NSRect, accent: NSColor) {
  let u = box.width / 1000
  func R(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> NSRect { NSRect(x: box.minX + x * u, y: box.minY + (y + 40) * u, width: w * u, height: h * u) }
  let dark = accent.blended(withFraction: 0.3, of: .black)!, light = accent.blended(withFraction: 0.18, of: .white)!
  let glass = color("#dff3ff"), glassEdge = color("#b7dcf3"), tire = color("#2b3442"), hub = color("#dde7ee"), ink = color("#2b3442")
  let skins = ["#f6c9a8", "#e0a884", "#f8d8c0", "#c98b63", "#f3c5a5"].map(color)
  let hairs = ["#2b2118", "#6b3e1e", "#111111", "#c9a06a", "#3b2a20"].map(color)
  let shirts = ["#ffffff", "#ffd166", "#9ad0f5", "#f4a6b8", "#b8e0b0"].map(color)
  oval(R(60, -36, 880, 60), NSColor(white: 0, alpha: 0.08))                     // ground shadow
  // passengers on the open upper deck (bodies hidden behind the deck wall)
  for (i, x) in [120, 230, 345, 455, 565].enumerated() {
    let fx = CGFloat(x)
    rr(R(fx - 44, 380, 88, 70), 26 * u, shirts[i])
    oval(R(fx - 28, 408, 56, 56), hairs[i])
    oval(R(fx - 26, 400, 52, 52), skins[i])
    if i == 1 || i == 3 { rr(R(fx - 32, 438, 64, 18), 9 * u, i == 1 ? color("#e22b37") : color("#1f6fd1")) } // caps
  }
  // railing
  rr(R(64, 456, 616, 10), 5 * u, ink)
  for x in stride(from: 90, through: 650, by: 80) { rr(R(CGFloat(x), 410, 8, 52), 4 * u, ink) }
  rr(R(40, 300, 660, 112), 30 * u, dark)                                         // upper deck wall
  rr(R(660, 300, 300, 190), 48 * u, dark)                                        // upper front cab
  rr(R(700, 350, 236, 118), 24 * u, glass)                                       // upper windscreen
  rr(R(700, 350, 236, 10), 5 * u, glassEdge)
  rr(R(20, 50, 960, 270), 46 * u, accent)                                        // lower body
  rr(R(20, 236, 960, 14), 7 * u, light)                                          // roof-line highlight
  rr(R(20, 118, 960, 22), 11 * u, NSColor(white: 1, alpha: 0.85))                // stripe
  for x in [80, 220, 360] { rr(R(CGFloat(x), 160, 118, 92), 14 * u, glass); rr(R(CGFloat(x) + 10, 232, 98, 10), 5 * u, glassEdge) }
  rr(R(520, 64, 112, 190), 14 * u, glass); rr(R(573, 64, 6, 190), 3 * u, accent) // door
  rr(R(760, 150, 190, 150), 22 * u, glass); rr(R(770, 280, 170, 10), 5 * u, glassEdge) // driver windscreen
  text("CITY TOUR", font(26 * u, bold: true), NSColor(white: 1, alpha: 0.95), R(300, 64, 210, 40))
  oval(R(930, 80, 44, 34), color("#ffd166")); oval(R(26, 80, 30, 34), color("#ff8a80")) // lights
  rr(R(8, 40, 984, 22), 11 * u, ink)                                             // bumper
  for cx in [214, 786] {                                                         // wheels
    oval(R(CGFloat(cx) - 78, -38, 156, 156), tire); oval(R(CGFloat(cx) - 42, -2, 84, 84), hub); oval(R(CGFloat(cx) - 14, 26, 28, 28), tire)
  }
}

let args = CommandLine.arguments
let cards = try! JSONDecoder().decode([Card].self, from: Data(contentsOf: URL(fileURLWithPath: args[1])))
let root = args[2]
let ink = color("#1d1d1f")
for c in cards {
  let W = CGFloat(c.w), H = CGFloat(c.h), s = min(W, H) / 1080, wide = W > H
  let accent = c.bg == "#1d1d1f" ? color("#2f3e5c") : color(c.bg)   // the "route" cards were near-black; use navy
  let bg = accent.blended(withFraction: 0.91, of: .white)!
  let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: c.w, pixelsHigh: c.h, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  bg.setFill(); NSRect(x: 0, y: 0, width: W, height: H).fill()
  oval(NSRect(x: W - 420 * s, y: -300 * s, width: 760 * s, height: 760 * s), accent.withAlphaComponent(0.07))
  oval(NSRect(x: -240 * s, y: H - 300 * s, width: 520 * s, height: 520 * s), accent.withAlphaComponent(0.05))
  // everything that matters stays inside the centre square (x from (W-H)/2 to (W+H)/2)
  let cx = W / 2, safeW = min(W, H) - 120 * s
  var busW: CGFloat, busY: CGFloat, titleTop: CGFloat, titleH: CGFloat, titleSize: CGFloat, pillY: CGFloat, subY: CGFloat, domY: CGFloat
  if wide { busW = 500; busY = 120; titleTop = 78; titleH = 80; titleSize = 62; pillY = 24; subY = 56; domY = 16 }
  else { busW = 720; busY = 170; titleTop = 150; titleH = 280; titleSize = 112; pillY = 86; subY = 98; domY = 36 }
  // landmarks on a horizon behind the bus (inside the centre square), then the road
  let busH = busW * 0.56, ground = busY + busH * (452.0 / 560) - 6, bandH: CGFloat = wide ? 132 : 200
  let safeL = cx - (min(W, H) / 2 - 50 * s), safeR = cx + (min(W, H) / 2 - 50 * s)
  drawLandmarks(CITY_LANDMARKS[cityKey(c.out)] ?? ["skyline", "mountains"], left: safeL, right: safeR, ground: ground, bandH: bandH, fill: accent.blended(withFraction: 0.68, of: .white)!, hole: bg)
  rr(NSRect(x: 0, y: busY + 36 * busW / 1000, width: W, height: 8 * s), 4 * s, accent.withAlphaComponent(0.14))
  drawBus(NSRect(x: cx - busW / 2, y: busY, width: busW, height: busW * 0.56), accent: accent)
  // eyebrow pill
  let ef = font(28 * s, bold: true)
  let ew = (c.eyebrow as NSString).size(withAttributes: [.font: ef]).width + 44 * s
  let pill = NSRect(x: cx - ew / 2, y: H - pillY - 56 * s, width: ew, height: 56 * s)
  rr(pill, 28 * s, accent.withAlphaComponent(0.12))
  text(c.eyebrow, ef, accent, pill.insetBy(dx: 0, dy: 11 * s))
  // title: shrink until it fits the safe width and the title box
  var size = titleSize * s, tf = font(size, bold: true)
  while size > 40 * s {
    let m = measure(c.title, tf, width: safeW, lineHeight: 1.05)
    if m.height <= titleH * s && (wide ? measure(c.title, tf, width: 10000, lineHeight: 1.05).width <= safeW : true) { break }
    size -= 3 * s; tf = font(size, bold: true)
  }
  let th = measure(c.title, tf, width: safeW, lineHeight: 1.05).height
  text(c.title, tf, ink, NSRect(x: cx - safeW / 2, y: H - titleTop - th, width: safeW, height: th + 4), lineHeight: 1.05)
  text(c.sub, font((wide ? 30 : 40) * s, bold: false), ink.withAlphaComponent(0.78), NSRect(x: cx - safeW / 2, y: subY, width: safeW, height: 60 * s))
  text("CITYTOURBUS.KR", font(24 * s, bold: true), accent, NSRect(x: cx - safeW / 2, y: domY, width: safeW, height: 40 * s))
  NSGraphicsContext.restoreGraphicsState()
  let url = URL(fileURLWithPath: root).appendingPathComponent(c.out)
  try! FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
  try! rep.representation(using: .jpeg, properties: [.compressionFactor: 0.86])!.write(to: url)
  print("wrote", c.out)
}
