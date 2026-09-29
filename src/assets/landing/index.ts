/**
 * Landing page brand assets (full-resolution originals).
 */
import heroModel from '@/assets/landing/hero-model.jpg'
import heroBackground from '@/assets/landing/hero-background.jpg'
import heroBotanicalLeft from '@/assets/landing/hero-botanical-left.jpg'
import heroBotanicalRight from '@/assets/landing/hero-botanical-right.jpg'
import treatmentFacial from '@/assets/landing/treatment-facial.jpg'
import treatmentAcne from '@/assets/landing/treatment-acne.jpg'
import treatmentBody from '@/assets/landing/treatment-body-contouring.jpg'
import treatmentSkin from '@/assets/landing/treatment-skin-rejuvenation.jpg'
import treatmentIv from '@/assets/landing/treatment-iv-drip.jpg'
import treatmentLaser from '@/assets/landing/treatment-laser.jpg'
import promoBotanical from '@/assets/landing/promo-botanical.jpg'
import clinicInterior from '@/assets/landing/majica-clinic-interior.jpg'
import testimonialMaria from '@/assets/landing/testimonial-maria.jpg'
import testimonialAna from '@/assets/landing/testimonial-ana.jpg'

export const landingAssets = {
  heroModel,
  heroBackground,
  heroBotanicalLeft,
  heroBotanicalRight,
  promoBotanical,
  clinicInterior,
  treatments: {
    facial: treatmentFacial,
    acne: treatmentAcne,
    body: treatmentBody,
    skin: treatmentSkin,
    iv: treatmentIv,
    laser: treatmentLaser,
  },
  testimonials: {
    maria: testimonialMaria,
    ana: testimonialAna,
  },
} as const
