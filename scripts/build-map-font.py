#!/usr/bin/env python3
"""지도 WebView 에 넣을 Pretendard 부분집합을 만든다.

## 왜 필요한가

지도는 WebView 라 앱이 `expo-font` 로 올린 Pretendard 를 **볼 수 없다.** 그래서
클러스터 배지 숫자와 상호명 라벨만 시스템 폰트(안드로이드 Noto Sans CJK, iOS Apple SD
Gothic Neo)로 렌더됐다 — 앱의 다른 모든 글자가 Pretendard 인데 지도 위 글자만 달랐다.

## 왜 통째로 안 넣나

Pretendard OTF 는 굵기당 1.5MB 다. 두 굵기를 base64 로 HTML 에 박으면 4MB 가 넘는다.
그래서 **KS X 1001 완성형 2,350자 + ASCII + 흔한 문장부호**로 줄이고 WOFF2 로 압축한다
(굵기당 약 160KB). 지도에 나오는 글자는 상호명·개수뿐이고, 상호명은 사실상 이 범위 안에
있다. 범위 밖 글자(옛한글·희귀 한자 등)는 아래 CSS 의 폴백 스택이 그대로 받는다 —
글자가 사라지지 않는다.

## 다시 만들려면

    python3 scripts/build-map-font.py

`fonttools`·`brotli` 가 필요하다(`pip install fonttools brotli`). 결과는
`src/features/restaurant/map/mapFont.generated.ts` 이고 커밋한다 — 빌드 때 폰트를
가공하지 않으려는 것이다(EAS 빌드에 파이썬 의존을 만들지 않는다).
"""

import base64
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "assets" / "fonts"
OUT = ROOT / "src" / "features" / "restaurant" / "map" / "mapFont.generated.ts"

# 지도가 쓰는 굵기. `.mk .name` 이 600, `.cl`·`.mk .bubble` 이 700 이다.
WEIGHTS = [("SemiBold", 600), ("Bold", 700)]

# 한글 외 범위: ASCII · 라틴1 · 일반 문장부호 · CJK 기호 · 전각 · 가운뎃점 · 원화.
UNICODES = "U+0020-007E,U+00A0-00FF,U+2010-2027,U+3000-303F,U+FF01-FF60,U+00B7,U+2022,U+20A9"


def ks_x_1001_syllables() -> str:
    """완성형(KS X 1001)이 담은 한글 음절 2,350자. euc-kr 왕복으로 뽑는다."""
    found = set()
    for high in range(0x81, 0xFF):
        for low in range(0x41, 0xFF):
            try:
                char = bytes([high, low]).decode("euc-kr")
            except (UnicodeDecodeError, ValueError):
                continue
            if len(char) == 1 and 0xAC00 <= ord(char) <= 0xD7A3:
                found.add(char)
    return "".join(sorted(found))


def subset(source: pathlib.Path, text_file: pathlib.Path, out: pathlib.Path) -> None:
    subprocess.run(
        [
            sys.executable,
            "-m",
            "fontTools.subset",
            str(source),
            f"--text-file={text_file}",
            f"--unicodes={UNICODES}",
            "--layout-features=",
            "--no-hinting",
            "--desubroutinize",
            "--flavor=woff2",
            f"--output-file={out}",
        ],
        check=True,
    )


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = pathlib.Path(tmp)
        text_file = tmp_dir / "hangul.txt"
        text_file.write_text(ks_x_1001_syllables(), encoding="utf-8")

        faces = []
        for name, weight in WEIGHTS:
            source = FONT_DIR / f"Pretendard-{name}.otf"
            out = tmp_dir / f"{name}.woff2"
            subset(source, text_file, out)
            encoded = base64.b64encode(out.read_bytes()).decode("ascii")
            faces.append((name, weight, len(out.read_bytes()), encoded))

        lines = [
            "/**",
            " * 지도 WebView 용 Pretendard 부분집합. **생성물이다 —"
            " 손으로 고치지 말 것.**",
            " *",
            " * 만드는 법과 이 파일이 존재하는 이유는 `scripts/build-map-font.py` 머리말에 있다.",
            " * 요약하면: WebView 는 앱이 올린 폰트를 볼 수 없어서, 지도 위 글자만 시스템"
            " 폰트로",
            " * 렌더되고 있었다. 통째로 넣기엔 무거워서 KS X 1001 2,350자 + ASCII 로 줄였다.",
            " */",
            "",
        ]
        for name, weight, size, encoded in faces:
            lines.append(f"/** Pretendard {name} 부분집합(WOFF2, {size:,} bytes). */")
            lines.append(
                f"export const PRETENDARD_{name.upper()}_WOFF2_BASE64 ="
                f' "{encoded}"'
            )
            lines.append("")

        lines.append("/** `@font-face` 규칙. `mapHtml.ts` 가 스타일 맨 앞에 넣는다. */")
        lines.append("export const MAP_FONT_FACE_CSS = [")
        for name, weight, _size, _encoded in faces:
            lines.append("  `@font-face {")
            lines.append("    font-family: 'Pretendard';")
            lines.append(f"    font-weight: {weight};")
            lines.append("    font-style: normal;")
            lines.append("    font-display: block;")
            lines.append(
                "    src: url(data:font/woff2;base64,"
                f"${{PRETENDARD_{name.upper()}_WOFF2_BASE64}}) format('woff2');"
            )
            lines.append("  }`,")
        lines.append('].join("\\n")')
        lines.append("")

        OUT.write_text("\n".join(lines), encoding="utf-8")
        total = sum(size for _n, _w, size, _e in faces)
        print(f"{OUT.relative_to(ROOT)} 작성 — WOFF2 합계 {total:,} bytes")


main()
