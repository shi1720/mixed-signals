import { geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import { readFileSync, writeFileSync } from 'node:fs';
const atlas = JSON.parse(
  readFileSync('node_modules/world-atlas/land-110m.json', 'utf8'),
);
const land = feature(atlas, atlas.objects.land);
const points = [];
// Approximately equal-area latitude rings avoid polar point crowding.
for (let lat = -57; lat < 82; lat += 1.55) {
  const step = 1.55 / Math.cos((lat * Math.PI) / 180);
  for (let lon = -180; lon < 180; lon += step) {
    if (geoContains(land, [lon, lat]))
      points.push([+lon.toFixed(2), +lat.toFixed(2)]);
  }
}
writeFileSync('lib/data/land-points.json', JSON.stringify(points));
console.log(`Generated ${points.length} land points from Natural Earth.`);
