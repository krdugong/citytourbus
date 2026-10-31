// Simple landmark silhouettes drawn behind the bus on the keyword cards (compiled together with cards.swift).
// Each shape is drawn in a 100-unit-tall box (ground at y=0, y up); LW gives its width in the same units.
import AppKit

struct Pen {
  let ox: CGFloat, oy: CGFloat, k: CGFloat, fill: NSColor, hole: NSColor
  func P(_ x: CGFloat, _ y: CGFloat) -> NSPoint { NSPoint(x: ox + x * k, y: oy + y * k) }
  func rect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ c: NSColor? = nil) { (c ?? fill).setFill(); NSRect(x: ox + x * k, y: oy + y * k, width: w * k, height: h * k).fill() }
  func oval(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ c: NSColor? = nil) { (c ?? fill).setFill(); NSBezierPath(ovalIn: NSRect(x: ox + x * k, y: oy + y * k, width: w * k, height: h * k)).fill() }
  func circle(_ cx: CGFloat, _ cy: CGFloat, _ r: CGFloat, _ c: NSColor? = nil) { oval(cx - r, cy - r, r * 2, r * 2, c) }
  func poly(_ pts: [(CGFloat, CGFloat)], _ c: NSColor? = nil) {
    let p = NSBezierPath(); p.move(to: P(pts[0].0, pts[0].1)); for q in pts.dropFirst() { p.line(to: P(q.0, q.1)) }; p.close(); (c ?? fill).setFill(); p.fill()
  }
  func line(_ a: (CGFloat, CGFloat), _ b: (CGFloat, CGFloat), _ w: CGFloat) { let p = NSBezierPath(); p.move(to: P(a.0, a.1)); p.line(to: P(b.0, b.1)); p.lineWidth = w * k; p.lineCapStyle = .round; fill.setStroke(); p.stroke() }
  func curve(_ a: (CGFloat, CGFloat), _ c1: (CGFloat, CGFloat), _ c2: (CGFloat, CGFloat), _ b: (CGFloat, CGFloat), _ w: CGFloat) {
    let p = NSBezierPath(); p.move(to: P(a.0, a.1)); p.curve(to: P(b.0, b.1), controlPoint1: P(c1.0, c1.1), controlPoint2: P(c2.0, c2.1)); p.lineWidth = w * k; fill.setStroke(); p.stroke()
  }
  func ring(_ cx: CGFloat, _ cy: CGFloat, _ r: CGFloat, _ w: CGFloat) { let p = NSBezierPath(ovalIn: NSRect(x: ox + (cx - r) * k, y: oy + (cy - r) * k, width: 2 * r * k, height: 2 * r * k)); p.lineWidth = w * k; fill.setStroke(); p.stroke() }
  func rotOval(_ cx: CGFloat, _ cy: CGFloat, _ w: CGFloat, _ h: CGFloat, _ deg: CGFloat) {
    let p = NSBezierPath(ovalIn: NSRect(x: -w / 2, y: -h / 2, width: w, height: h)); let t = NSAffineTransform()
    t.translateX(by: ox + cx * k, yBy: oy + cy * k); t.scale(by: k); t.rotate(byDegrees: deg); p.transform(using: t as AffineTransform); fill.setFill(); p.fill()
  }
}

let LW: [String: CGFloat] = ["eiffel": 60, "clocktower": 30, "dome": 80, "gate": 90, "spire": 30, "skyline": 110, "hilltower": 100, "needle": 30, "bridge": 160, "archbridge": 150, "castle": 92, "windmill": 70, "opera": 120, "pagoda": 80, "wheel": 90, "lighthouse": 40, "palm": 70, "mountains": 140, "mosque": 100, "stupa": 50, "hanok": 110, "cathedral": 80, "arch": 80, "colosseum": 150, "tvtower": 30, "tablemountain": 160, "liberty": 40, "walls": 120, "stepchurch": 90, "karst": 130, "spires4": 90, "temple": 120, "gables": 100, "obelisk": 24, "crane": 100, "cheomseongdae": 44, "roundtower": 40, "pier": 140]

func landmark(_ n: String, _ p: Pen) {
  switch n {
  case "eiffel":
    p.poly([(0, 0), (16, 0), (22, 30), (38, 30), (44, 0), (60, 0), (42, 45), (38, 65), (33, 85), (31, 100), (29, 100), (27, 85), (22, 65), (18, 45)])
    p.rect(8, 30, 44, 4); p.rect(15, 60, 30, 3)
  case "clocktower":
    p.rect(5, 0, 20, 75); p.poly([(2, 75), (28, 75), (15, 100)]); p.rect(2, 73, 26, 3); p.circle(15, 64, 7, p.hole); p.circle(15, 64, 2)
  case "dome":
    p.rect(0, 0, 80, 40); p.rect(8, 40, 64, 8); p.oval(14, 28, 52, 50); p.rect(37, 76, 6, 14); p.circle(40, 93, 4)
    for i in 0..<5 { p.rect(8 + CGFloat(i) * 14, 8, 6, 24, p.hole) }
  case "gate":
    for i in 0..<6 { p.rect(4 + CGFloat(i) * 16, 0, 8, 60) }
    p.rect(0, 60, 90, 12); p.rect(10, 72, 70, 10); p.rect(32, 82, 26, 8); p.circle(45, 94, 5)
  case "spire":
    p.rect(0, 0, 30, 18); p.rect(4, 18, 22, 14); p.poly([(8, 32), (22, 32), (20, 55), (18, 72), (16, 88), (15, 100), (14, 88), (12, 72), (10, 55)])
  case "skyline":
    p.rect(0, 0, 20, 45); p.rect(22, 0, 18, 70); p.rect(42, 0, 16, 55); p.rect(60, 0, 22, 85); p.rect(84, 0, 14, 60); p.rect(100, 0, 10, 40); p.rect(70, 85, 2, 15)
    for (x, h) in [(22, 70), (60, 85), (84, 60)] { var y = 8; while y < h - 8 { p.rect(CGFloat(x) + 4, CGFloat(y), 4, 4, p.hole); p.rect(CGFloat(x) + 11, CGFloat(y), 4, 4, p.hole); y += 10 } }
  case "hilltower":
    p.oval(0, -40, 100, 80); p.rect(47, 30, 6, 58); p.oval(38, 76, 24, 10); p.rect(49, 86, 2, 14)
  case "needle":
    p.rect(12, 0, 6, 70); p.oval(0, 66, 30, 12); p.rect(13, 76, 4, 24); p.poly([(4, 0), (26, 0), (18, 14), (12, 14)])
  case "bridge":
    p.rect(0, 22, 160, 5); p.rect(38, 0, 6, 70); p.rect(116, 0, 6, 70); p.rect(36, 68, 10, 4); p.rect(114, 68, 10, 4)
    p.curve((0, 40), (20, 62), (30, 70), (41, 70), 2.5); p.curve((41, 70), (60, 32), (100, 32), (119, 70), 2.5); p.curve((119, 70), (130, 70), (140, 62), (160, 40), 2.5)
    for x in stride(from: 50, through: 110, by: 10) { let t = (CGFloat(x) - 80) / 39; p.line((CGFloat(x), 27), (CGFloat(x), 42 + 28 * t * t), 1.5) }
  case "archbridge":
    p.rect(0, 25, 150, 5); p.rect(0, 0, 12, 45); p.rect(138, 0, 12, 45); p.curve((6, 30), (40, 100), (110, 100), (144, 30), 6)
    for x in stride(from: 30, through: 120, by: 15) { let t = (CGFloat(x) - 75) / 69; p.line((CGFloat(x), 30), (CGFloat(x), 80 - 50 * t * t), 1.5) }
  case "castle":
    p.rect(10, 0, 72, 45); for i in 0..<5 { p.rect(12 + CGFloat(i) * 14, 45, 8, 8) }
    p.rect(0, 0, 18, 70); p.rect(74, 0, 18, 70); p.poly([(-2, 70), (20, 70), (9, 92)]); p.poly([(72, 70), (94, 70), (83, 92)])
    p.rect(37, 45, 18, 30); p.poly([(34, 75), (58, 75), (46, 100)]); p.rect(42, 4, 8, 18, p.hole); p.oval(42, 16, 8, 8, p.hole)
  case "windmill":
    p.poly([(20, 0), (50, 0), (44, 55), (26, 55)]); p.oval(22, 48, 26, 16)
    for d in [20, 110, 200, 290] { let r = CGFloat(d) * .pi / 180; p.line((35, 58), (35 + 40 * cos(r), 58 + 40 * sin(r)), 3) }
    p.rect(31, 10, 8, 14, p.hole)
  case "opera":
    p.rect(0, 0, 120, 8)
    for (x, h, w) in [(0, 70, 55), (30, 100, 60), (68, 80, 52)] {
      let path = NSBezierPath(); path.move(to: p.P(CGFloat(x), 8)); path.curve(to: p.P(CGFloat(x + w), 8), controlPoint1: p.P(CGFloat(x) + 8, CGFloat(h)), controlPoint2: p.P(CGFloat(x + w) - 4, CGFloat(h))); path.close(); p.fill.setFill(); path.fill()
    }
  case "pagoda":
    for t in 0..<3 { let y = CGFloat(t) * 30, d = CGFloat(t) * 7; p.rect(26, y, 28, 22); p.poly([(2 + d, y + 20), (78 - d, y + 20), (58 - d, y + 31), (22 + d, y + 31)]) }
    p.rect(38, 90, 4, 10)
  case "wheel":
    p.ring(45, 52, 40, 3); p.circle(45, 52, 6)
    for i in 0..<8 { let r = CGFloat(i) * .pi / 4; p.line((45, 52), (45 + 40 * cos(r), 52 + 40 * sin(r)), 1.8); p.circle(45 + 40 * cos(r), 52 + 40 * sin(r), 4) }
    p.poly([(45, 52), (10, 0), (22, 0)]); p.poly([(45, 52), (80, 0), (68, 0)])
  case "lighthouse":
    p.rect(0, 0, 40, 6); p.poly([(8, 6), (32, 6), (26, 70), (14, 70)]); p.rect(9, 22, 22, 7, p.hole); p.rect(10, 44, 20, 7, p.hole)
    p.rect(11, 70, 18, 14); p.poly([(9, 84), (31, 84), (20, 96)]); p.rect(14, 73, 12, 8, p.hole)
  case "palm":
    p.poly([(30, 0), (41, 0), (38, 62), (34, 62)])
    for (a, l) in [(-28, 34), (-5, 36), (25, 34), (55, 30), (155, 30), (185, 32)] { let r = CGFloat(a) * .pi / 180; p.rotOval(36 + cos(r) * CGFloat(l) / 2, 64 + sin(r) * CGFloat(l) / 2, CGFloat(l), 11, CGFloat(a)) }
    p.circle(32, 60, 4); p.circle(40, 59, 4)
  case "mountains":
    p.poly([(0, 0), (45, 78), (70, 42), (100, 100), (140, 0)]); p.poly([(90, 80), (100, 100), (110, 80), (105, 77), (100, 83), (95, 77)], p.hole); p.poly([(38, 66), (45, 78), (52, 66), (48, 64), (45, 69), (42, 64)], p.hole)
  case "mosque":
    p.rect(10, 0, 80, 40); p.oval(25, 24, 50, 50); p.rect(4, 0, 8, 84); p.rect(88, 0, 8, 84); p.poly([(2, 84), (14, 84), (8, 100)]); p.poly([(86, 84), (98, 84), (92, 100)]); p.oval(14, 34, 14, 14); p.oval(72, 34, 14, 14)
    p.rect(44, 4, 12, 20, p.hole); p.oval(44, 18, 12, 12, p.hole)
  case "stupa":
    p.rect(0, 0, 50, 14); p.rect(8, 14, 34, 14); p.poly([(10, 28), (40, 28), (31, 72), (19, 72)]); p.poly([(17, 72), (33, 72), (25, 100)]); for y in [34, 46, 58] { p.rect(16, CGFloat(y), 18, 3, p.hole) }
  case "hanok":
    p.rect(4, 0, 102, 6); for x in [16, 52, 88] { p.rect(CGFloat(x), 6, 6, 36) }
    p.poly([(0, 42), (110, 42), (88, 66), (22, 66)]); p.poly([(0, 42), (12, 42), (3, 54)]); p.poly([(98, 42), (110, 42), (107, 54)]); p.rect(26, 66, 58, 5); p.rect(32, 12, 46, 3, p.hole)
  case "cathedral":
    p.rect(10, 0, 60, 50); p.rect(14, 50, 14, 20); p.poly([(10, 70), (32, 70), (21, 100)]); p.rect(52, 50, 14, 20); p.poly([(48, 70), (70, 70), (59, 100)]); p.poly([(28, 50), (52, 50), (40, 64)])
    p.circle(40, 32, 7, p.hole); p.rect(36, 4, 8, 14, p.hole); p.oval(36, 12, 8, 8, p.hole)
  case "arch":
    p.rect(0, 0, 80, 70); p.rect(6, 70, 68, 10); p.rect(28, 0, 24, 28, p.hole); p.oval(28, 16, 24, 24, p.hole); p.rect(10, 50, 60, 3, p.hole)
  case "colosseum":
    p.poly([(0, 0), (150, 0), (150, 70), (100, 70), (0, 52)])
    for i in 0..<9 { let x = 8 + CGFloat(i) * 16; p.rect(x, 8, 8, 10, p.hole); p.oval(x, 12, 8, 8, p.hole); if x < 100 || i > 6 { p.rect(x, 30, 8, 10, p.hole); p.oval(x, 34, 8, 8, p.hole) } }
    for i in 6..<9 { let x = 8 + CGFloat(i) * 16; p.rect(x, 50, 8, 8, p.hole); p.oval(x, 52, 8, 8, p.hole) }
  case "tvtower":
    p.poly([(5, 0), (25, 0), (18, 22), (12, 22)]); p.rect(12, 20, 6, 42); p.circle(15, 68, 13); p.rect(13, 80, 4, 20); p.rect(5, 66, 20, 2, p.hole)
  case "tablemountain":
    p.poly([(0, 0), (30, 60), (62, 70), (110, 70), (136, 56), (160, 0)])
  case "liberty":
    p.rect(8, 0, 24, 34); p.rect(4, 34, 32, 6); p.poly([(11, 40), (29, 40), (26, 70), (14, 70)]); p.circle(20, 76, 6)
    for d in [-40, -20, 0, 20, 40] { let r = (90 + CGFloat(d)) * .pi / 180; p.line((20, 78), (20 + 10 * cos(r), 78 + 10 * sin(r)), 1.5) }
    p.rect(27, 60, 4, 32); p.circle(29, 95, 4)
  case "walls":
    p.rect(0, 0, 120, 34); for i in 0..<7 { p.rect(2 + CGFloat(i) * 16, 34, 8, 7) }
    p.rect(88, 0, 30, 56); p.poly([(86, 56), (120, 56), (103, 72)]); p.rect(100, 20, 6, 14, p.hole); p.rect(50, 0, 10, 20, p.hole); p.oval(50, 14, 10, 10, p.hole)
  case "stepchurch":
    for i in 0..<5 { let h = 70 - CGFloat(i) * 12; p.rect(37 - CGFloat(i + 1) * 8, 0, 8, h); p.rect(53 + CGFloat(i) * 8, 0, 8, h) }
    p.rect(37, 0, 16, 90); p.poly([(35, 88), (55, 88), (45, 100)]); p.rect(43, 50, 4, 30, p.hole)
  case "karst":
    p.oval(0, -30, 50, 90); p.oval(40, -20, 40, 70); p.oval(75, -40, 55, 100); p.oval(20, -10, 30, 50)
  case "spires4":
    p.rect(0, 0, 90, 30)
    for (x, h) in [(5, 80), (27, 100), (49, 100), (71, 80)] { let fx = CGFloat(x), fh = CGFloat(h); p.poly([(fx, 0), (fx + 18, 0), (fx + 14, fh - 10), (fx + 9, fh), (fx + 4, fh - 10)]); p.rect(fx + 6, 40, 6, 8, p.hole) }
  case "temple":
    p.rect(0, 0, 120, 10); for i in 0..<8 { p.rect(6 + CGFloat(i) * 14, 10, 6, 40) }; p.rect(0, 50, 120, 8); p.poly([(0, 58), (120, 58), (60, 80)])
  case "gables":
    for (i, h) in [70, 85, 60, 80].enumerated() { let x = CGFloat(i) * 25, fh = CGFloat(h); p.rect(x, 0, 24, fh); p.poly([(x, fh), (x + 24, fh), (x + 12, fh + 15)]); var y: CGFloat = 10; while y < fh - 12 { p.rect(x + 6, y, 5, 7, p.hole); p.rect(x + 14, y, 5, 7, p.hole); y += 16 } }
  case "obelisk":
    p.rect(0, 0, 24, 6); p.poly([(6, 6), (18, 6), (15, 88), (9, 88)]); p.poly([(9, 88), (15, 88), (12, 100)])
  case "crane":
    p.rect(10, 0, 10, 80); p.rect(80, 0, 10, 80); p.rect(0, 80, 100, 12); p.rect(44, 30, 12, 50); p.rect(30, 55, 40, 4)
  case "cheomseongdae":
    p.poly([(4, 0), (40, 0), (36, 30), (30, 55), (28, 75), (16, 75), (14, 55), (8, 30)]); p.rect(10, 75, 24, 8); p.rect(8, 83, 28, 5); p.rect(17, 36, 10, 10, p.hole)
    for y in stride(from: 8, through: 68, by: 12) { p.rect(6, CGFloat(y), 32, 1.5, p.hole) }
  case "roundtower":
    p.rect(0, 0, 40, 18); p.rect(5, 18, 30, 54); for i in 0..<4 { p.rect(5 + CGFloat(i) * 8, 72, 5, 7) }; p.rect(16, 79, 8, 16); p.rect(17, 40, 6, 12, p.hole)
  case "pier":
    p.rect(0, 30, 140, 5); for i in 0..<7 { p.rect(CGFloat(i) * 20 + 5, 0, 4, 30) }; p.rect(100, 35, 34, 22); p.oval(104, 50, 26, 20); p.rect(116, 68, 2, 8); p.rect(108, 40, 6, 10, p.hole); p.rect(120, 40, 6, 10, p.hole)
  default: break
  }
}

let CITY_LANDMARKS: [String: [String]] = [
  "aarhus": ["cathedral", "lighthouse"], "abu-dhabi": ["mosque", "skyline"], "alesund": ["mountains", "lighthouse"], "amsterdam": ["gables", "windmill"],
  "andong": ["hanok", "mountains"], "athens": ["temple", "mountains"], "bangkok": ["stupa", "skyline"], "barcelona": ["spires4", "skyline"],
  "bath": ["cathedral", "arch"], "belfast": ["crane", "clocktower"], "benalmadena": ["castle", "palm"], "bergen": ["mountains", "gables"],
  "berlin": ["gate", "tvtower"], "bournemouth": ["pier", "lighthouse"], "brighton": ["pier", "dome"], "budapest": ["dome", "bridge"],
  "busan": ["bridge", "skyline"], "cadiz": ["dome", "lighthouse"], "cambridge": ["cathedral", "archbridge"], "cape-town": ["tablemountain", "lighthouse"],
  "cartagena": ["walls", "clocktower"], "chester": ["clocktower", "walls"], "chicago": ["skyline", "wheel"], "copenhagen": ["gables", "spire"],
  "cordoba": ["mosque", "archbridge"], "corfu": ["walls", "palm"], "da-lat": ["eiffel", "mountains"], "daegu": ["needle", "mountains"],
  "dubai": ["spire", "skyline"], "dublin": ["obelisk", "archbridge"], "dubrovnik": ["walls", "dome"], "edinburgh": ["castle", "mountains"],
  "fukuoka": ["needle", "wheel"], "funchal": ["mountains", "palm"], "galway": ["arch", "lighthouse"], "geiranger": ["mountains", "lighthouse"],
  "glasgow": ["clocktower", "archbridge"], "gothenburg": ["lighthouse", "wheel"], "gozo": ["dome", "walls"], "gyeongju": ["cheomseongdae", "pagoda"],
  "ha-long": ["karst", "lighthouse"], "hanoi": ["pagoda", "archbridge"], "haugesund": ["mountains", "lighthouse"], "helsinki": ["dome", "lighthouse"],
  "ho-chi-minh": ["skyline", "cathedral"], "hong-kong": ["skyline", "mountains"], "hue": ["pagoda", "gate"], "incheon": ["bridge", "skyline"],
  "inverness": ["castle", "mountains"], "jeju": ["mountains", "palm"], "johannesburg": ["skyline", "tvtower"], "las-palmas": ["palm", "lighthouse"],
  "las-vegas": ["skyline", "wheel"], "lisbon": ["castle", "bridge"], "llandudno": ["pier", "mountains"], "london": ["clocktower", "wheel"],
  "los-angeles": ["palm", "skyline"], "madrid": ["arch", "skyline"], "malaga": ["castle", "palm"], "malta": ["dome", "walls"],
  "medina": ["mosque", "walls"], "miami": ["palm", "skyline"], "munich": ["cathedral", "wheel"], "new-orleans": ["cathedral", "skyline"],
  "new-york": ["liberty", "skyline"], "osaka": ["pagoda", "wheel"], "oslo": ["opera", "mountains"], "oxford": ["dome", "cathedral"],
  "paju": ["hanok", "mountains"], "palma-de-mallorca": ["cathedral", "palm"], "panama-city": ["skyline", "archbridge"], "paris": ["eiffel", "arch"],
  "pattaya": ["palm", "skyline"], "philadelphia": ["clocktower", "skyline"], "phuket": ["palm", "stupa"], "porto": ["archbridge", "cathedral"],
  "potsdam": ["windmill", "dome"], "prague": ["castle", "archbridge"], "puerto-de-la-cruz": ["mountains", "palm"], "reykjavik": ["stepchurch", "mountains"],
  "riga": ["cathedral", "gables"], "rome": ["colosseum", "dome"], "san-francisco": ["bridge", "skyline"], "santa-cruz-de-tenerife": ["opera", "palm"],
  "santander": ["lighthouse", "palm"], "seattle": ["needle", "mountains"], "seoul": ["hilltower", "hanok"], "seville": ["clocktower", "palm"],
  "sharjah": ["mosque", "skyline"], "singapore": ["skyline", "wheel"], "split": ["walls", "clocktower"], "stavanger": ["mountains", "lighthouse"],
  "stockholm": ["clocktower", "gables"], "stratford-upon-avon": ["gables", "archbridge"], "sydney": ["opera", "archbridge"], "tallinn": ["castle", "gables"],
  "thessaloniki": ["roundtower", "lighthouse"], "tokyo": ["eiffel", "skyline"], "toledo": ["castle", "archbridge"], "toronto": ["needle", "skyline"],
  "vienna": ["wheel", "cathedral"], "visby": ["walls", "cathedral"], "warsaw": ["spire", "castle"], "washington-dc": ["dome", "obelisk"],
  "yeosu": ["bridge", "lighthouse"], "york": ["cathedral", "walls"]
]

// city key from a card's output path: img/<slug>/<slug>-main.jpg or img/en/<slug>-og.jpg
func cityKey(_ out: String) -> String {
  let file = (out as NSString).lastPathComponent
  var slug = (file as NSString).deletingPathExtension
  if let r = slug.range(of: "-", options: .backwards) { slug = String(slug[..<r.lowerBound]) }
  return slug.replacingOccurrences(of: "-city-tour-bus", with: "").replacingOccurrences(of: "-big-bus", with: "")
}

func drawLandmarks(_ names: [String], left: CGFloat, right: CGFloat, ground: CGFloat, bandH: CGFloat, fill: NSColor, hole: NSColor) {
  let k = bandH / 100, n = names.count
  let fr: [CGFloat] = n == 1 ? [0.5] : n == 2 ? [0.2, 0.8] : [0.13, 0.5, 0.87]
  NSGraphicsContext.saveGraphicsState()
  NSBezierPath(rect: NSRect(x: left, y: ground, width: right - left, height: bandH + 4)).addClip()
  for (i, nm) in names.enumerated() {
    let w = (LW[nm] ?? 100) * k
    let x = max(left, min(right - w, left + (right - left) * fr[i] - w / 2))
    landmark(nm, Pen(ox: x, oy: ground, k: k, fill: fill, hole: hole))
  }
  NSGraphicsContext.restoreGraphicsState()
  fill.setFill(); NSRect(x: left, y: ground - 2, width: right - left, height: 3).fill()  // horizon
}
