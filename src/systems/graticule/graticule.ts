/** Latitude and longitude graticule with adaptive spacing. */
import { densify, type Box, type GridGeometry, type GridLabel, type GridPath } from "../../geo/geometry";


export function graticule(view: Box): GridGeometry {
  const choices = [30, 10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05, 0.01];
  const span = Math.max(view[2] - view[0], view[3] - view[1]);
  // Choices run largest first, so take the last (smallest) spacing that keeps about two dozen lines in view.
  const spacing = choices.findLast((c) => span / c <= 24) ?? 30;
  const paths: GridPath[] = [];
  const labels: GridLabel[] = [];
  const [w, s, e, n] = view;
  const decimals = spacing >= 1 ? 0 : spacing >= 0.1 ? 1 : 2;
  for (let lon = Math.ceil(w / spacing) * spacing; lon <= e; lon += spacing) {
    paths.push({ path: densify([lon, s], [lon, n], (n - s) / 32), width: 0.75 });
    labels.push({ position: [lon, s + (n - s) * 0.03], text: `${lon.toFixed(decimals)}°`, size: 10 });
  }
  for (let lat = Math.ceil(s / spacing) * spacing; lat <= n; lat += spacing) {
    paths.push({ path: densify([w, lat], [e, lat], (e - w) / 32), width: 0.75 });
    labels.push({ position: [w + (e - w) * 0.03, lat], text: `${lat.toFixed(decimals)}°`, size: 10 });
  }
  return { paths, labels };
}
