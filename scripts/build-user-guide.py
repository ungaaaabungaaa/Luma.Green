#!/usr/bin/env python3
"""Build the maintained PDF from Markdown and unchanged browser PNG captures.

Install scripts/user-guide-requirements.txt. Run from the repository root.
The output uses embedded ReportLab Vera fonts and needs no network or app secrets.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
from pathlib import Path

from PIL import Image as PILImage
import reportlab
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, Image, PageBreak, PageTemplate, Paragraph,
    Spacer, Table, TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/user-guide/guide.md'
OUTPUT = ROOT / 'output/pdf/luma-green-user-guide.pdf'
LOCK = ROOT / 'docs/user-guide/build.json'
WIDTH, HEIGHT = A4
MARGIN = 43
BODY = WIDTH - 2 * MARGIN
INK = colors.HexColor('#163f31')
MUTED = colors.HexColor('#506258')
metadata = re.search(r'Edition: ([^.]+)\. Application checkpoint: ([a-f0-9]+)\.', SOURCE.read_text())
if metadata is None:
    raise ValueError('The guide must declare its edition date and application checkpoint.')
EDITION, CHECKPOINT = metadata.groups()
PALE = colors.HexColor('#edf3e9')


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def image_paths() -> list[Path]:
    return [(SOURCE.parent / item).resolve() for item in re.findall(r'!\[[^\]]*\]\(([^)]+)\)', SOURCE.read_text())]


def input_paths() -> list[Path]:
    paths = [SOURCE, Path(__file__).resolve(), ROOT / 'scripts/user-guide-requirements.txt']
    paths += image_paths()
    paths += sorted(SOURCE.parent.rglob('*captures.json'))
    return list(dict.fromkeys(paths))


def verify() -> None:
    record = json.loads(LOCK.read_text())
    for name, expected in record['inputs'].items():
        path = ROOT / name
        if not path.exists() or digest(path) != expected:
            raise SystemExit(f'Guide input changed: {name}. Review, rebuild and inspect the PDF.')
    current = {str(path.relative_to(ROOT)) for path in input_paths()}
    if current != set(record['inputs']):
        raise SystemExit('Guide input set changed. Rebuild and inspect the PDF.')
    if digest(OUTPUT) != record['pdf_sha256']:
        raise SystemExit('PDF does not match its build record.')
    print(f'Guide source, {len(image_paths())} image uses and PDF match the build record.')


def inline(value: str) -> str:
    value = html.escape(value)
    value = re.sub(r'`([^`]+)`', r'<font name="Courier">\1</font>', value)
    value = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', value)
    value = re.sub(r'\[([^\]]+)\]\((https?://[^)]+)\)', r'<link href="\2" color="#1c654d">\1</link>', value)
    return value


def page_chrome(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor('#d5dfd2'))
    canvas.line(MARGIN, HEIGHT - 32, WIDTH - MARGIN, HEIGHT - 32)
    canvas.setFont('GuideBold', 8)
    canvas.setFillColor(INK)
    canvas.drawString(MARGIN, HEIGHT - 24, 'LUMA.GREEN  /  PLATFORM USER GUIDE')
    canvas.setFont('Guide', 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(MARGIN, 23, f'{EDITION.upper()}  |  Application {CHECKPOINT}  |  See screenshot evidence labels')
    canvas.drawRightString(WIDTH - MARGIN, 23, str(doc.page))
    canvas.restoreState()


class GuideDocument(BaseDocTemplate):
    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and flowable.style.name == 'Chapter':
            title = flowable.getPlainText()
            key = f'chapter-{self.seq.nextf("chapter")}'
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(title, key, 0, False)
            self.notify('TOCEntry', (0, title, self.page, key))


def build():
    font_dir = Path(reportlab.__file__).parent / 'fonts'
    for name, filename in [('Guide', 'Vera.ttf'), ('GuideBold', 'VeraBd.ttf'), ('GuideItalic', 'VeraIt.ttf')]:
        pdfmetrics.registerFont(TTFont(name, str(font_dir / filename)))
    pdfmetrics.registerFontFamily('Guide', normal='Guide', bold='GuideBold', italic='GuideItalic', boldItalic='GuideBold')
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle('GuideBody', fontName='Guide', fontSize=10, leading=14.5, textColor=INK, spaceAfter=8, splitLongWords=True))
    styles.add(ParagraphStyle('Cover', parent=styles['GuideBody'], fontName='GuideBold', fontSize=33, leading=40, spaceAfter=12))
    styles.add(ParagraphStyle('Chapter', parent=styles['GuideBody'], fontName='GuideBold', fontSize=21, leading=27, spaceAfter=14, keepWithNext=True))
    styles.add(ParagraphStyle('Subhead', parent=styles['GuideBody'], fontName='GuideBold', fontSize=12, leading=17, spaceBefore=10, spaceAfter=7, keepWithNext=True))
    styles.add(ParagraphStyle('Caption', parent=styles['GuideBody'], fontName='GuideItalic', fontSize=8, leading=11, textColor=MUTED, spaceAfter=13))
    styles.add(ParagraphStyle('Cell', parent=styles['GuideBody'], fontSize=8.5, leading=12, spaceAfter=0))
    styles.add(ParagraphStyle('ListItem', parent=styles['GuideBody'], leftIndent=15, firstLineIndent=-12, spaceAfter=5))
    story = []
    lines = SOURCE.read_text().splitlines()
    i = 0
    first_break = True
    while i < len(lines):
        line = lines[i].strip()
        i += 1
        if not line:
            continue
        if line == '---':
            story.append(PageBreak())
            if first_break:
                story.append(Paragraph('Contents', styles['Cover']))
                toc = TableOfContents()
                toc.levelStyles = [ParagraphStyle('Toc', fontName='Guide', fontSize=8.5, leading=12, spaceBefore=1, textColor=INK)]
                story.extend([toc, PageBreak()])
                first_break = False
            continue
        match = re.fullmatch(r'!\[([^\]]*)\]\(([^)]+)\)', line)
        if match:
            caption, relative = match.groups()
            path = (SOURCE.parent / relative).resolve()
            with PILImage.open(path) as img:
                width, height = img.size
            compact = {'admin-review.png', 'yard-trades.png'}
            max_height = 265 if path.name in compact else 325
            if path.name == 'household-tracking.png':
                max_height = 600
            elif path.name == 'manufacturer-compliance.png':
                max_height = 520
            scale = min(BODY / width, max_height / height)
            picture = Image(str(path), width * scale, height * scale)
            picture.hAlign = 'LEFT'
            picture.keepWithNext = True
            story.extend([Spacer(1, 4), picture, Spacer(1, 5), Paragraph(inline(caption), styles['Caption'])])
            continue
        if line.startswith('|'):
            rows = [line]
            while i < len(lines) and lines[i].strip().startswith('|'):
                rows.append(lines[i].strip())
                i += 1
            values = []
            for row in rows:
                cells = [cell.strip() for cell in row.strip('|').split('|')]
                if all(re.fullmatch(r':?-+:?', cell) for cell in cells):
                    continue
                values.append([Paragraph(inline(cell), styles['Cell']) for cell in cells])
            count = len(values[0])
            widths = [BODY * .29, BODY * .71] if count == 2 else [BODY * .23, BODY * .30, BODY * .47]
            table = Table(values, colWidths=widths, repeatRows=1, hAlign='LEFT')
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), PALE),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8faf6')]),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
                ('LINEBELOW', (0, 0), (-1, 0), .7, colors.HexColor('#b9cfba')),
            ]))
            story.extend([table, Spacer(1, 12)])
            continue
        if line.startswith('# '):
            story.append(Paragraph(inline(line[2:]), styles['Cover']))
        elif line.startswith('## '):
            story.append(Paragraph(inline(line[3:]), styles['Chapter']))
        elif line.startswith('### '):
            story.append(Paragraph(inline(line[4:]), styles['Subhead']))
        elif re.match(r'^(?:\d+\.|-) ', line):
            story.append(Paragraph(inline(line), styles['ListItem']))
        else:
            paragraph = [line]
            while i < len(lines) and lines[i].strip() and not re.match(r'^(?:#|\||!\[|---|\d+\. |- )', lines[i].strip()):
                paragraph.append(lines[i].strip())
                i += 1
            story.append(Paragraph(inline(' '.join(paragraph)), styles['GuideBody']))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = GuideDocument(str(OUTPUT), pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
                        topMargin=49, bottomMargin=43, title='Luma.Green - Platform user guide',
                        author='Luma.Green', subject='Current workflows, access and browser screenshot evidence',
                        pageCompression=1)
    doc.addPageTemplates(PageTemplate(id='guide', frames=[Frame(MARGIN, 43, BODY, HEIGHT - 92, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)], onPage=page_chrome))
    doc.multiBuild(story)
    from pypdf import PdfReader
    reader = PdfReader(OUTPUT)
    text = '\n'.join(page.extract_text() for page in reader.pages)
    for required in ['Kabadiwala', 'Admin', 'Synthetic documentation fixture', 'not a GST', 'Evidence and maintenance']:
        if required not in text:
            raise SystemExit(f'Missing required PDF content: {required}')
    record = {
        'application_checkpoint': CHECKPOINT,
        'pages': len(reader.pages),
        'pdf': str(OUTPUT.relative_to(ROOT)),
        'pdf_sha256': digest(OUTPUT),
        'inputs': {str(path.relative_to(ROOT)): digest(path) for path in input_paths()},
    }
    LOCK.write_text(json.dumps(record, indent=2) + '\n')
    print(f'Built {len(reader.pages)} pages, {OUTPUT.stat().st_size:,} bytes: {OUTPUT}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify source/image/PDF hashes without rebuilding')
    args = parser.parse_args()
    verify() if args.check else build()
