"""Portable, clickable links for the maintained Word documents."""
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit, urlunsplit

from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.text.run import Run

REPOSITORY_URL = "https://github.com/ungaaaabungaaa/Luma.Green/blob/main/"


def resolve_document_link(target: str, source: Path, repository: Path) -> str:
    parsed = urlsplit(target)
    if parsed.scheme:
        if parsed.scheme not in {"https", "http", "mailto"}:
            raise ValueError("Unsupported standalone document link scheme")
        if parsed.scheme in {"http", "https"} and not parsed.netloc:
            raise ValueError("Web link needs a host")
        return target
    if parsed.netloc or parsed.path.startswith("/"):
        raise ValueError("Local or protocol-relative links are not portable")
    root = repository.resolve()
    path = (source.parent / unquote(parsed.path)).resolve() if parsed.path else source.resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise ValueError(f"Repository link must identify an existing file: {target}")
    base = urlsplit(REPOSITORY_URL)
    return urlunsplit((base.scheme, base.netloc, base.path + quote(path.relative_to(root).as_posix(), safe="/"), parsed.query, parsed.fragment))


def add_document_hyperlink(paragraph, text: str, destination: str, bold: bool = False):
    relation = paragraph.part.relate_to(destination,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
        is_external=True)
    link = OxmlElement("w:hyperlink")
    link.set(qn("r:id"), relation)
    element = OxmlElement("w:r")
    link.append(element)
    paragraph._p.append(link)
    run = Run(element, paragraph)
    run.text = text
    run.font.underline = True
    if bold:
        run.bold = True
    return run
