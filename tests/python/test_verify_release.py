import csv
import io
import unittest
from tools.verify_release import FIELDS, InvalidRelease, validate_release

def csv_data(rows, fields=FIELDS):
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(fields)
    writer.writerows(rows)
    stream.seek(0)
    return stream

def row(**changes):
    values = dict(zip(FIELDS, ['VOLUNTARY_SURVEY', 'London', 'United Kingdom', '10', '50', '10', '50', '10', '50', '10']))
    values.update(changes)
    return [values[k] for k in FIELDS]

class ReleaseTests(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(validate_release(csv_data([row()]))['published_cities'], 1)
    def test_empty_release_is_valid(self):
        self.assertEqual(validate_release(csv_data([]))['published_cities'], 0)
    def test_demo_is_never_accepted_accidentally(self):
        with self.assertRaises(InvalidRelease): validate_release(csv_data([row(sample_type='ILLUSTRATIVE')]))
        self.assertTrue(validate_release(csv_data([row(sample_type='ILLUSTRATIVE')]), allow_preview=True)['valid'])
    def test_mixed_data_rejected(self):
        with self.assertRaises(InvalidRelease): validate_release(csv_data([row(), row(city='Paris', sample_type='ILLUSTRATIVE')]), allow_preview=True)
    def test_extra_private_column_rejected(self):
        with self.assertRaises(InvalidRelease): validate_release(csv_data([], fields=(*FIELDS, 'session_hash')))
    def test_duplicate_city_rejected(self):
        with self.assertRaises(InvalidRelease): validate_release(csv_data([row(), row()]))
    def test_small_city_rejected(self):
        with self.assertRaises(InvalidRelease): validate_release(csv_data([row(responses='9')]))
    def test_metric_sample_cannot_exceed_city(self):
        with self.assertRaises(InvalidRelease): validate_release(csv_data([row(chemistry_n='11')]))
    def test_safe_suppression(self):
        self.assertTrue(validate_release(csv_data([row(chemistry='', chemistry_n='0')]))['valid'])
        with self.assertRaises(InvalidRelease): validate_release(csv_data([row(chemistry='', chemistry_n='9')]))
    def test_invalid_score(self):
        for score in ('-5', '105', 'NaN', 'Infinity', '52', 'hello'):
            with self.subTest(score=score), self.assertRaises(InvalidRelease):
                validate_release(csv_data([row(chemistry=score)]))
    def test_missing_cell(self):
        with self.assertRaises(InvalidRelease): validate_release(csv_data([row()[:-1]]))
    def test_streaming_does_not_require_seek(self):
        lines = iter(csv_data([row()]).getvalue().splitlines())
        self.assertTrue(validate_release(lines)['valid'])

if __name__ == '__main__': unittest.main()
