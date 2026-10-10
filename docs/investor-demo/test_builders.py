"""Focused checks for fresh screenshots and private credential projection."""
import importlib.util
import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


tour = load('investor_tour', ROOT / 'scripts/build-investor-demo.py')
private = load('investor_credentials', Path(__file__).with_name('build-private-credentials.py'))


class InvestorBuilders(unittest.TestCase):
    def test_draft_source_is_valid_but_not_final(self):
        source = json.loads(tour.SOURCE.read_text())
        for page in source['pages']:
            page['screenshot'] = None
        self.assertEqual(tour.validate(source, False), [])
        with self.assertRaises(ValueError):
            tour.validate(source, True)

    def test_roster_change_is_rejected(self):
        source = json.loads(tour.SOURCE.read_text())
        source['admin_accounts'] = 1
        with self.assertRaises(ValueError):
            tour.validate(source, False)

    def test_credentials_need_private_paths(self):
        with self.assertRaises(ValueError):
            private.private_path(str(ROOT / 'output/docx/credentials.docx'), '.docx')

    def test_private_output_has_only_projected_fields(self):
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder) / '.convex'
            base.mkdir()
            source, output = base / 'input.json', base / 'accounts.docx'
            rows = [dict(name='Fictional Example', email=f'example-{i}@investor.luma.invalid', password=f'unit-test-only-{i}', backendId='MUST_NOT_EXPORT_ID', passwordHash='MUST_NOT_EXPORT_HASH') for i in range(1, 6)]
            source.write_text(json.dumps({'accounts': rows}))
            private.build(source, output, 5)
            with zipfile.ZipFile(output) as archive:
                xml = archive.read('word/document.xml')
                text = ' '.join(ElementTree.fromstring(xml).itertext())
                self.assertNotIn('MUST_NOT_EXPORT', text)
                self.assertIn(rows[0]['email'], text)
                self.assertIn(rows[0]['password'], text)
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)

    def test_duplicate_and_real_domain_are_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder) / '.convex'
            base.mkdir()
            source, output = base / 'input.json', base / 'accounts.docx'
            row = dict(name='Example', email='example-1@investor.luma.invalid', password='unit-test-only')
            source.write_text(json.dumps([row, row]))
            with self.assertRaises(ValueError):
                private.build(source, output, 2)
            row['email'] = 'someone@example.com'
            source.write_text(json.dumps([row]))
            with self.assertRaises(ValueError):
                private.build(source, output, 1)


if __name__ == '__main__':
    unittest.main()
