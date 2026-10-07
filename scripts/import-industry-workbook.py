"""Extract the team's reference workbook without treating it as regulatory approval.

Read only. Run with the bundled document Python runtime and the source path.
The reviewed JSON is committed; production does not read local XLSX files.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]


def extract(source: Path) -> dict:
    workbook = openpyxl.load_workbook(source, read_only=True, data_only=False)
    sheets = {sheet.title: list(sheet.iter_rows(values_only=True)) for sheet in workbook}
    sha = hashlib.sha256(source.read_bytes()).hexdigest()
    sectors = []
    official = sheets['CPCB 2025 Official Master'][4:]
    inferred = sheets['CPCB + Luma Unified'][4:]
    if len(official) != 419 or len(inferred) != len(official):
        raise ValueError('Unexpected sector coverage; review the workbook before import.')
    analysis_fields = ['industryGroup', 'userRole', 'inputs', 'products', 'byproducts',
                       'recoverableWaste', 'residualWaste', 'nextUser',
                       'marketplaceStatus', 'opportunity', 'suggestedFlow']
    for row_number, (row, analysis) in enumerate(zip(official, inferred, strict=True), 5):
        if any(row[index] != analysis[index] for index in [0, 1, 3, 4, 5]):
            raise ValueError(f'Official and analysis identity fields disagree at {row_number}.')
        sectors.append({
            'id': f'cpcb-2025-row-{row_number}',
            'code': str(row[1]), 'name': row[2], 'category': row[3],
            'annexure': row[0], 'pollutionIndex': row[4], 'division': row[5],
            'groupHeading': row[6], 'reportedSourceLine': row[7], 'sourceUrl': row[8],
            'workbookSha256': sha, 'sheet': 'CPCB 2025 Official Master',
            'row': row_number, 'sourceQuality': 'workbook_unverified',
            'analysis': {**dict(zip(analysis_fields, analysis[6:], strict=True)),
                         'sheet': 'CPCB + Luma Unified', 'row': row_number,
                         'reportedSectorName': analysis[2],
                         'nameMatchesSource': row[2] == analysis[2],
                         'sourceQuality': 'team_inference'},
        })

    def records(sheet: str, prefix: str, fields: list[str]) -> list[dict]:
        return [{
            'id': f'{prefix}-row-{number}', 'sheet': sheet, 'row': number,
            'sourceQuality': 'team_inference',
            **dict(zip(fields, row, strict=True)),
        } for number, row in enumerate(sheets[sheet][2:], 3)]

    return {
        'version': 1,
        'sourceWorkbook': source.name,
        'sourceWorkbookSha256': sha,
        'reportedReferenceEdition': 'January 2025',
        'sourceLanguage': 'en',
        'sourceQuality': 'workbook_unverified',
        'sectors': sectors,
        'industries': records('Industry Matrix', 'industry', [
            'group', 'name', 'role', 'inputs', 'products', 'byproducts',
            'recoverableWaste', 'residualWaste', 'nextUser', 'materialState', 'note']),
        'lifecycles': records('Material Lifecycle', 'lifecycle', [
            'family', 'grade', 'state', 'route', 'soldAs', 'nextUser', 'qualityAttributes', 'productNeed']),
        'byproducts': records('By-product Marketplace', 'byproduct', [
            'name', 'generatedBy', 'reportedCommercialStatus', 'potentialBuyer', 'qualityAttributes']),
        'qualityNotes': [
            'Reference only. Workbook text and inferred routes are not regulatory approval.',
            'CPCB categories do not establish product, waste or trade eligibility.',
            'Six Annexure II codes repeat; row-based IDs preserve distinct source records.',
            'Some sector descriptions have missing thresholds or extraction fragments; consult the original source.',
            'Dashboard row counts include headers and its static industry counts do not reconcile.',
        ],
    }


if __name__ == '__main__':
    data = extract(Path(sys.argv[1]))
    destination = ROOT / 'convex/data/industryWorkbook.json'
    if destination.exists():
        previous = json.loads(destination.read_text())
        if previous['sourceWorkbookSha256'] != data['sourceWorkbookSha256']:
            raise ValueError('A different workbook requires a new version and row identity namespace. Preserve existing references.')
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: len(data[key]) for key in ['sectors', 'industries', 'lifecycles', 'byproducts']}))
