/**
 * Turn coverage/coverage-summary.json into a badge (dist/badges/coverage.svg), copy the HTML
 * report to dist/coverage/, and add a table to the GitHub Actions job summary when there is one.
 * Run after `vitest run --coverage` and `vite build`.
 */
import { appendFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises'

type Metric = { pct: number; covered: number; total: number }
type Summary = { total: Record<'lines' | 'statements' | 'functions' | 'branches', Metric> }

const summary: Summary = JSON.parse(await readFile('coverage/coverage-summary.json', 'utf8'))
const lines = summary.total.lines.pct

const colour = lines >= 90 ? '#3fb950' : lines >= 80 ? '#a3c51c' : lines >= 70 ? '#dfb317' : '#e05d44'
const label = 'coverage'
const value = `${lines.toFixed(1)}%`
const textWidth = (text: string) => Math.round(text.length * 6.5 + 10)
const labelWidth = textWidth(label)
const valueWidth = textWidth(value)
const width = labelWidth + valueWidth

const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <clipPath id="r"><rect width="${width}" height="20" rx="3"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${colour}"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>
`

await mkdir('dist/badges', { recursive: true })
await writeFile('dist/badges/coverage.svg', badge)
await cp('coverage', 'dist/coverage', { recursive: true })

const stepSummary = process.env['GITHUB_STEP_SUMMARY']
if (stepSummary) {
  const rows = (['lines', 'statements', 'functions', 'branches'] as const)
    .map(key => `| ${key} | ${summary.total[key].pct.toFixed(1)}% | ${summary.total[key].covered} / ${summary.total[key].total} |`)
    .join('\n')
  await appendFile(stepSummary, `## Test coverage\n\n| Metric | Covered | Count |\n| --- | --- | --- |\n${rows}\n`)
}

console.log(`Coverage badge: ${value} (lines)`)
