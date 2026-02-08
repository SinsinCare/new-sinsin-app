#!/usr/bin/env node

/**
 * Parses the CSV food nutrition data and generates a TypeScript data file.
 * Run: node scripts/generate-food-data.js
 */

const fs = require('fs')
const path = require('path')

const csvPath = path.join(__dirname, '..', 'assets', '식품성분표 - Sheet1.csv')
const outputPath = path.join(
  __dirname,
  '..',
  'src',
  'features',
  'recipe',
  'data',
  'generatedFoodData.ts',
)

const csvText = fs.readFileSync(csvPath, 'utf-8')

function parseCSV(text) {
  const rows = []
  let current = ''
  let inQuotes = false
  let row = []

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(current.trim())
        current = ''
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
          i++
        }
        row.push(current.trim())
        current = ''
        if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
          rows.push(row)
        }
        row = []
      } else {
        current += ch
      }
    }
  }

  if (current || row.length > 0) {
    row.push(current.trim())
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
      rows.push(row)
    }
  }

  return rows
}

function parseNumber(value) {
  if (!value || value === '-' || value === '') return null
  const cleaned = value.replace(/,/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

const rows = parseCSV(csvText)
console.log(`Parsed ${rows.length} rows (including header)`)
console.log(`Header fields: ${rows[0].length}`)
console.log(`Header: ${rows[0].join(' | ')}`)

const foods = []
for (let i = 1; i < rows.length; i++) {
  const f = rows[i]
  if (f.length < 18) {
    console.warn(`Row ${i} has only ${f.length} fields, skipping: ${f[0]}`)
    continue
  }

  const name = f[0]
  if (!name) continue

  foods.push({
    n: name,
    e: parseNumber(f[1]) ?? 0, // energy
    w: parseNumber(f[2]) ?? 0, // water
    pr: parseNumber(f[3]) ?? 0, // protein
    f: parseNumber(f[4]) ?? 0, // fat
    a: parseNumber(f[5]) ?? 0, // ash
    ch: parseNumber(f[6]) ?? 0, // carbohydrate
    su: parseNumber(f[7]), // sugar
    fi: parseNumber(f[8]), // fiber
    ca: parseNumber(f[9]), // calcium
    ir: parseNumber(f[10]), // iron
    mg: parseNumber(f[11]), // magnesium
    ph: parseNumber(f[12]), // phosphorus
    k: parseNumber(f[13]), // potassium
    na: parseNumber(f[14]), // sodium
    vd: parseNumber(f[15]), // vitaminD
    ta: parseNumber(f[16]), // totalAminoAcid
    ea: parseNumber(f[17]), // essentialAminoAcid
  })
}

console.log(`Generated ${foods.length} food items`)

const tsContent = `// Auto-generated from 식품성분표 - Sheet1.csv
// Run: node scripts/generate-food-data.js
// Fields: n=name, e=energy, w=water, pr=protein, f=fat, a=ash, ch=carbohydrate,
//         su=sugar, fi=fiber, ca=calcium, ir=iron, mg=magnesium, ph=phosphorus,
//         k=potassium, na=sodium, vd=vitaminD, ta=totalAminoAcid, ea=essentialAminoAcid

export interface RawFoodRow {
  n: string
  e: number
  w: number
  pr: number
  f: number
  a: number
  ch: number
  su: number | null
  fi: number | null
  ca: number | null
  ir: number | null
  mg: number | null
  ph: number | null
  k: number | null
  na: number | null
  vd: number | null
  ta: number | null
  ea: number | null
}

export const RAW_FOOD_DATA: RawFoodRow[] = ${JSON.stringify(foods)}
`

fs.writeFileSync(outputPath, tsContent, 'utf-8')
console.log(`Written to ${outputPath}`)
