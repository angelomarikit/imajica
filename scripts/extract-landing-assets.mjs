import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const sheet = path.join(root, 'src/assets/landing/_sheet.jpg')
const outDir = path.join(root, 'src/assets/landing')
const publicDir = path.join(root, 'public/landing')

fs.mkdirSync(outDir, { recursive: true })
fs.mkdirSync(publicDir, { recursive: true })

const meta = await sharp(sheet).metadata()
const W = meta.width ?? 1024
const H = meta.height ?? 682

/** Crops calibrated for the attached 1024×682 asset sheet */
const crops = [
  // Row 1 — hero
  { name: 'hero-model.png', left: 0.018, top: 0.045, width: 0.22, height: 0.28 },
  { name: 'hero-background.jpg', left: 0.255, top: 0.055, width: 0.28, height: 0.24 },
  { name: 'hero-botanical-left.png', left: 0.555, top: 0.045, width: 0.195, height: 0.28 },
  { name: 'hero-botanical-right.png', left: 0.77, top: 0.04, width: 0.205, height: 0.29 },

  // Row 2 — treatments
  { name: 'treatment-facial.jpg', left: 0.02, top: 0.39, width: 0.145, height: 0.175 },
  { name: 'treatment-acne.jpg', left: 0.18, top: 0.39, width: 0.145, height: 0.175 },
  { name: 'treatment-body-contouring.jpg', left: 0.34, top: 0.39, width: 0.145, height: 0.175 },
  { name: 'treatment-skin-rejuvenation.jpg', left: 0.50, top: 0.39, width: 0.145, height: 0.175 },
  { name: 'treatment-iv-drip.jpg', left: 0.66, top: 0.39, width: 0.145, height: 0.175 },
  { name: 'treatment-laser.jpg', left: 0.82, top: 0.39, width: 0.155, height: 0.175 },

  // Row 3 — promo / clinic / testimonials
  { name: 'promo-botanical.jpg', left: 0.02, top: 0.66, width: 0.175, height: 0.28 },
  { name: 'majica-clinic-interior.jpg', left: 0.22, top: 0.68, width: 0.42, height: 0.24 },
  { name: 'testimonial-maria.jpg', left: 0.68, top: 0.68, width: 0.13, height: 0.22 },
  { name: 'testimonial-ana.jpg', left: 0.84, top: 0.68, width: 0.13, height: 0.22 },
]

for (const crop of crops) {
  const left = Math.round(crop.left * W)
  const top = Math.round(crop.top * H)
  const width = Math.round(crop.width * W)
  const height = Math.round(crop.height * H)

  const buffer = await sharp(sheet)
    .extract({
      left: Math.max(0, left),
      top: Math.max(0, top),
      width: Math.min(width, W - left),
      height: Math.min(height, H - top),
    })
    .toBuffer()

  const dest = path.join(outDir, crop.name)
  await sharp(buffer).toFile(dest)
  await sharp(buffer).toFile(path.join(publicDir, crop.name))
  console.log('wrote', crop.name, `${width}x${height}`)
}

console.log('done')
