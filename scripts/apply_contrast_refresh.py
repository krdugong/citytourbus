#!/usr/bin/env python3
from pathlib import Path


def replace_all(path: Path, replacements):
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new in replacements:
        if old not in text:
            raise SystemExit(f"Expected CSS fragment not found in {path}: {old[:90]!r}")
        text = text.replace(old, new, 1)
    if text == original:
        raise SystemExit(f"No changes made to {path}")
    path.write_text(text, encoding="utf-8")


compare = Path("compare.html")
replace_all(compare, [
    (
        ":root{--ink:#111118;--paper:#F7F6F2;--card:#FFFFFF;--red:#D0001B;--navy:#0E1A2B;--muted:#9A9690;--line:#E6E3DC;--sub:#6B6860;--gyg:#E05C20}",
        ":root{--ink:#1D1D1F;--paper:#F5F5F7;--card:#FFFFFF;--red:#D70015;--navy:#0B1424;--muted:#6E6E73;--line:#E2E2E7;--sub:#4B4B50;--gyg:#D85A1F}"
    ),
    (
        "nav{background:var(--navy);height:52px;display:flex;align-items:center;padding:0 32px;position:sticky;top:0;z-index:300;border-bottom:1px solid rgba(255,255,255,.06)}",
        "nav{background:var(--navy);height:52px;display:flex;align-items:center;padding:0 32px;position:sticky;top:0;z-index:300;border-bottom:1px solid rgba(255,255,255,.12)}"
    ),
    (
        ".l1{font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--red)}.l2{font-family:'Bebas Neue',sans-serif;font-size:20px;color:#fff}.l3{font-family:'Bebas Neue',sans-serif;font-size:20px;color:#C8A040}.l4{font-size:9px;font-weight:600;color:rgba(255,255,255,.28);margin-left:3px;letter-spacing:.5px;align-self:center}",
        ".l1{font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--red)}.l2{font-family:'Bebas Neue',sans-serif;font-size:20px;color:#fff}.l3{font-family:'Bebas Neue',sans-serif;font-size:20px;color:#D9B13E}.l4{font-size:9px;font-weight:600;color:rgba(255,255,255,.58);margin-left:3px;letter-spacing:.5px;align-self:center}"
    ),
    (
        ".nav-link{color:rgba(255,255,255,.42);font-size:12px;font-weight:500;background:none;border:none;cursor:pointer;padding:4px 10px;border-radius:5px;font-family:inherit;transition:.12s}",
        ".nav-link{color:rgba(255,255,255,.72);font-size:12px;font-weight:600;background:none;border:none;cursor:pointer;padding:5px 10px;border-radius:7px;font-family:inherit;transition:.12s}"
    ),
    (
        ".hero-label{font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:20px}",
        ".hero-label{font-size:10px;font-weight:700;letter-spacing:2.3px;text-transform:uppercase;color:rgba(255,255,255,.64);margin-bottom:20px}"
    ),
    (
        "h1{font-family:'Bebas Neue',sans-serif;font-size:58px;line-height:.95;color:#fff;letter-spacing:1px;margin-bottom:16px}h1 span{color:#C8A040}",
        "h1{font-family:'Noto Sans KR',sans-serif;font-size:58px;line-height:1.08;color:#fff;letter-spacing:-2.5px;font-weight:700;margin-bottom:18px}h1 span{color:#D9B13E}"
    ),
    (
        ".hero-desc{font-size:13px;color:rgba(255,255,255,.38);line-height:1.9;max-width:460px;margin-bottom:32px;font-weight:300}",
        ".hero-desc{font-size:13.5px;color:rgba(255,255,255,.74);line-height:1.85;max-width:500px;margin-bottom:32px;font-weight:400}"
    ),
    (
        ".search{display:flex;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;width:100%}",
        ".search{display:flex;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.22);border-radius:12px;width:100%;overflow:hidden;box-shadow:0 1px 0 rgba(255,255,255,.05) inset}"
    ),
    (
        ".search input{flex:1;background:none;border:none;outline:none;padding:10px 16px;font-size:13px;color:#fff;font-family:inherit;font-weight:300}",
        ".search input{flex:1;background:none;border:none;outline:none;padding:12px 16px;font-size:13px;color:#fff;font-family:inherit;font-weight:500}"
    ),
    (
        ".search input::placeholder{color:rgba(255,255,255,.22)}",
        ".search input::placeholder{color:rgba(255,255,255,.54)}"
    ),
    (
        ".search-go{background:var(--gyg);color:#fff;border:none;padding:0 16px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;border-radius:0 8px 8px 0}",
        ".search-go{background:#fff;color:var(--navy);border:none;border-left:1px solid rgba(255,255,255,.16);padding:0 18px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;border-radius:0;transition:.12s}.search-go:hover{background:#F5F5F7}"
    ),
    (
        ".pill{background:none;border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.42);font-size:11px;font-weight:500;padding:5px 14px;border-radius:20px;cursor:pointer;transition:.12s;font-family:inherit;white-space:nowrap}",
        ".pill{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.20);color:rgba(255,255,255,.72);font-size:11px;font-weight:600;padding:6px 14px;border-radius:20px;cursor:pointer;transition:.12s;font-family:inherit;white-space:nowrap}"
    ),
    (
        ".pill:hover{border-color:rgba(255,255,255,.25);color:rgba(255,255,255,.75)}",
        ".pill:hover{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.42);color:#fff}"
    ),
    (
        ".ob-brand{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.42);margin-bottom:4px}",
        ".ob-brand{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.72);margin-bottom:4px}"
    ),
    (
        ".ob-feat{font-size:9px;font-weight:600;color:rgba(255,255,255,.55);background:rgba(255,255,255,.1);padding:2px 8px;border-radius:4px}",
        ".ob-feat{font-size:9px;font-weight:600;color:rgba(255,255,255,.82);background:rgba(255,255,255,.12);padding:3px 8px;border-radius:5px}"
    ),
    (
        ".ob-from{font-size:9px;color:rgba(255,255,255,.35);margin-bottom:3px}",
        ".ob-from{font-size:9px;color:rgba(255,255,255,.66);margin-bottom:3px}"
    ),
    (
        ".ob-code{font-size:9px;font-weight:700;color:rgba(255,255,255,.6);background:rgba(255,255,255,.12);padding:2px 8px;border-radius:4px;display:inline-block}",
        ".ob-code{font-size:9px;font-weight:700;color:#fff;background:rgba(255,255,255,.16);padding:3px 8px;border-radius:5px;display:inline-block}"
    ),
    (
        ".why-s{font-size:12px;color:rgba(255,255,255,.28);font-weight:300}",
        ".why-s{font-size:12px;color:rgba(255,255,255,.70);font-weight:400}"
    ),
    (
        ".wc-d{font-size:11px;color:rgba(255,255,255,.32);line-height:1.8;font-weight:300}",
        ".wc-d{font-size:11px;color:rgba(255,255,255,.68);line-height:1.8;font-weight:400}"
    ),
    (
        "footer{background:#07101E;padding:28px 32px;text-align:center;font-size:11px;color:rgba(255,255,255,.2);line-height:2.2}",
        "footer{background:#07101E;padding:28px 32px;text-align:center;font-size:11px;color:rgba(255,255,255,.54);line-height:2.2}"
    ),
    (
        "footer a{color:rgba(255,255,255,.18);text-decoration:none}",
        "footer a{color:rgba(255,255,255,.68);text-decoration:none}footer a:hover{color:#fff}"
    ),
    (
        ".anim{animation:fadeUp .2s ease both}\n</style>",
        ".anim{animation:fadeUp .2s ease both}\n.detail-banner div:nth-child(2) div:nth-child(2){color:rgba(255,255,255,.72)!important}\n@media(max-width:640px){nav{padding:0 18px}.hero{padding:42px 20px 36px}h1{font-size:44px;letter-spacing:-1.8px}.hero-desc{font-size:13px;line-height:1.8}.search-wrap{width:100%}.pill{font-size:11px;padding:7px 12px}.main{padding-top:30px}.city-hd-meta{font-size:11px}.why{padding:42px 20px}.why-hd{display:block}.why-s{margin-top:8px;line-height:1.6}}\n</style>"
    ),
])


index = Path("index.html")
replace_all(index, [
    (
        ":root{--ink:#111118;--paper:#F7F6F2;--red:#D0001B;--navy:#0E1A2B;--muted:#9A9690;--line:#E6E3DC;--gyg:#E05C20}",
        ":root{--ink:#1D1D1F;--paper:#F5F5F7;--red:#D70015;--navy:#0B1424;--muted:#6E6E73;--line:#E2E2E7;--gyg:#D85A1F}"
    ),
    (
        "nav{background:var(--navy);height:52px;display:flex;align-items:center;padding:0 32px;position:sticky;top:0;z-index:300;border-bottom:1px solid rgba(255,255,255,.06)}",
        "nav{background:var(--navy);height:52px;display:flex;align-items:center;padding:0 32px;position:sticky;top:0;z-index:300;border-bottom:1px solid rgba(255,255,255,.12)}"
    ),
    (
        ".l1{font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--red)}.l2{font-family:'Bebas Neue',sans-serif;font-size:20px;color:#fff}.l3{font-family:'Bebas Neue',sans-serif;font-size:20px;color:#C8A040}.l4{font-size:9px;font-weight:600;color:rgba(255,255,255,.28);margin-left:3px;letter-spacing:.5px;align-self:center}",
        ".l1{font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--red)}.l2{font-family:'Bebas Neue',sans-serif;font-size:20px;color:#fff}.l3{font-family:'Bebas Neue',sans-serif;font-size:20px;color:#D9B13E}.l4{font-size:9px;font-weight:600;color:rgba(255,255,255,.58);margin-left:3px;letter-spacing:.5px;align-self:center}"
    ),
    (
        ".hero-label{font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:20px}",
        ".hero-label{font-size:10px;font-weight:700;letter-spacing:2.3px;text-transform:uppercase;color:rgba(255,255,255,.64);margin-bottom:20px}"
    ),
    (
        "h1{font-family:'Bebas Neue',sans-serif;font-size:62px;line-height:.92;color:#fff;letter-spacing:1px;margin-bottom:18px}h1 span{color:#C8A040}",
        "h1{font-family:'Noto Sans KR',sans-serif;font-size:62px;line-height:1.06;color:#fff;letter-spacing:-2.7px;font-weight:700;margin-bottom:20px}h1 span{color:#D9B13E}"
    ),
    (
        ".hero-desc{font-size:14px;color:rgba(255,255,255,.4);line-height:1.9;max-width:480px;margin-bottom:36px;font-weight:300}",
        ".hero-desc{font-size:14px;color:rgba(255,255,255,.76);line-height:1.85;max-width:500px;margin-bottom:36px;font-weight:400}"
    ),
    (
        ".btn-secondary{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.8);border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:14px 28px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;text-decoration:none;transition:.15s}.btn-secondary:hover{background:rgba(255,255,255,.14);color:#fff}",
        ".btn-secondary{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.10);color:rgba(255,255,255,.94);border:1px solid rgba(255,255,255,.24);border-radius:10px;padding:14px 28px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;text-decoration:none;transition:.15s}.btn-secondary:hover{background:rgba(255,255,255,.16);color:#fff;border-color:rgba(255,255,255,.38)}"
    ),
    (
        ".stat-val{font-family:'Bebas Neue',sans-serif;font-size:32px;color:#fff;letter-spacing:.5px}.stat-label{font-size:10px;color:rgba(255,255,255,.3);font-weight:500;letter-spacing:.5px}",
        ".stat-val{font-family:'Bebas Neue',sans-serif;font-size:32px;color:#fff;letter-spacing:.5px}.stat-label{font-size:10px;color:rgba(255,255,255,.66);font-weight:600;letter-spacing:.5px}"
    ),
    (
        ".seo-text h3{font-size:14px;font-weight:700;color:var(--ink);margin:20px 0 8px}.seo-text p{font-size:13px;color:#555;line-height:1.9;margin-bottom:12px}",
        ".seo-text h3{font-size:14px;font-weight:700;color:var(--ink);margin:20px 0 8px}.seo-text p{font-size:13px;color:#3A3A3C;line-height:1.9;margin-bottom:12px}"
    ),
    (
        "footer{background:var(--navy);padding:40px 32px;text-align:center;color:rgba(255,255,255,.25);font-size:11px;line-height:2.2;margin-top:60px}",
        "footer{background:var(--navy);padding:40px 32px;text-align:center;color:rgba(255,255,255,.54);font-size:11px;line-height:2.2;margin-top:60px}"
    ),
    (
        "footer strong{color:rgba(255,255,255,.5)}footer a{color:rgba(255,255,255,.25);text-decoration:none;margin:0 6px}footer a:hover{color:rgba(255,255,255,.6)}",
        "footer strong{color:rgba(255,255,255,.82)}footer a{color:rgba(255,255,255,.68);text-decoration:none;margin:0 6px}footer a:hover{color:#fff}"
    ),
    (
        "@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.anim{animation:fadeUp .25s ease both}\n</style>",
        "@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.anim{animation:fadeUp .25s ease both}\n@media(max-width:640px){nav{padding:0 18px}.hero{padding:46px 20px 42px}h1{font-size:46px;letter-spacing:-2px}.hero-desc{font-size:13.5px;line-height:1.8}.hero-ctas{gap:8px}.btn-primary,.btn-secondary{padding:13px 18px}.wrap{padding:0 20px}.trust{padding-left:20px;padding-right:20px;gap:14px}}\n</style>"
    ),
])

print("Applied high-contrast minimal UI refresh to compare.html and index.html")
