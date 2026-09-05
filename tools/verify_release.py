#!/usr/bin/env python3
"""Validate a Mixed Signals aggregate CSV without third-party dependencies.

The validator streams rows and rejects unsafe publication: mixed demo/live rows,
small reported samples, out-of-range scores, duplicate cities, or leaked columns.
It reads local files only and never transmits data.
"""
from __future__ import annotations
import argparse
import csv
import json
from pathlib import Path
from typing import TextIO

FIELDS = ('sample_type', 'city', 'country', 'responses', 'chemistry', 'chemistry_n',
          'mixed_signals', 'mixed_signals_n', 'friction', 'friction_n')
METRICS = ('chemistry', 'mixed_signals', 'friction')

class InvalidRelease(ValueError):
    """The export is malformed or violates the public disclosure contract."""

def validate_release(stream: TextIO, *, allow_preview: bool = False) -> dict:
    reader = csv.DictReader(stream)
    if reader.fieldnames != list(FIELDS):
        raise InvalidRelease('Unexpected columns. Only the documented aggregate schema is allowed.')
    seen: set[tuple[str, str]] = set()
    kind: str | None = None
    count = 0
    total = 0
    for line, row in enumerate(reader, start=2):
        if None in row or any(v is None for v in row.values()):
            raise InvalidRelease(f'Line {line}: malformed column count.')
        current = row['sample_type']
        if current not in ('ILLUSTRATIVE', 'VOLUNTARY_SURVEY'):
            raise InvalidRelease(f'Line {line}: unrecognized sample type.')
        if current == 'ILLUSTRATIVE' and not allow_preview:
            raise InvalidRelease('Illustrative data is not a real release. Use --allow-preview intentionally.')
        if kind is not None and current != kind:
            raise InvalidRelease('Illustrative and real responses must never be mixed.')
        kind = current
        key = (row['city'], row['country'])
        if not all(key) or key in seen:
            raise InvalidRelease(f'Line {line}: empty or duplicate city.')
        seen.add(key)
        try:
            n = int(row['responses'])
            if n < 10:
                raise InvalidRelease(f'Line {line}: city has fewer than 10 reports.')
            for metric in METRICS:
                sample = int(row[metric + '_n'])
                value = row[metric]
                if not value:
                    if sample != 0:
                        raise InvalidRelease(f'Line {line}: suppressed sample count must be zero.')
                    continue
                score = float(value)
                if not 0 <= score <= 100 or score % 5:
                    raise InvalidRelease(f'Line {line}: {metric} must be rounded to five on a 0–100 scale.')
                if not 10 <= sample <= n:
                    raise InvalidRelease(f'Line {line}: unsafe or impossible {metric} sample count.')
        except (ValueError, OverflowError) as error:
            if isinstance(error, InvalidRelease):
                raise
            raise InvalidRelease(f'Line {line}: invalid numeric value.') from error
        count += 1
        total += n
    return {'valid': True, 'sample_type': kind, 'published_cities': count,
            'reports_in_published_cities': total, 'interpretation': 'Voluntary, unrepresentative contributors only.'}

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('csv_file', type=Path)
    parser.add_argument('--allow-preview', action='store_true')
    args = parser.parse_args()
    try:
        with args.csv_file.open(newline='', encoding='utf-8-sig') as stream:
            print(json.dumps(validate_release(stream, allow_preview=args.allow_preview), indent=2))
    except (OSError, InvalidRelease) as error:
        parser.exit(1, f'Release rejected: {error}\n')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
