import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Flower2,
  Heart,
  Menu,
  Search,
  Shield,
  Sparkles,
  Star,
  UserRound,
  X,
} from 'lucide-react'
import logo from '@/assets/logo-imajica.jpg'
import { landingAssets } from '@/assets/landing'
import { BookAppointmentModal } from '@/components/booking/BookAppointmentModal'
import { SpecialPromoModal } from '@/components/marketing/SpecialPromoModal'
import { MobileDrawer } from '@/components/ui/MobileDrawer'
import { BRAND } from '@/constants/brand'
import {
  getActiveLandingPromos,
  getLandingPromo,
  subscribeLandingPromo,
} from '@/services/promoService'
import type { LandingPromo } from '@/types'
import { cn } from '@/utils/cn'

/**
 * APPROVED CLIENT REFERENCE: reference/ui/00-landing-page.png (1536×1024)
 * PHOTOGRAPHY: majica_landing_page_assets.zip → src/assets/landing/*
 *
 * Desktop:
 * - transparent header 58px overlaps hero
 * - hero taller content band so model/copy are fully visible
 * - grid 520 | 540 | 356 / content width 1416px
 */

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Services', href: '#services' },
  { label: 'Packages', href: '#packages' },
  { label: 'About', href: '#about' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Blog', href: '#blog' },
  { label: 'Contact', href: '#contact' },
]

const trustItems = [
  { icon: Shield, label: 'Safe & Proven Treatments' },
  { icon: UserRound, label: 'Licensed Professionals' },
  { icon: Heart, label: 'Personalized Care' },
  { icon: Flower2, label: 'Modern Facilities' },
]

const services = [
  { title: 'Facial Treatments', desc: 'Rejuvenate your skin', image: landingAssets.treatments.facial },
  { title: 'Acne Solutions', desc: 'Clearer, healthier skin', image: landingAssets.treatments.acne },
  { title: 'Body Contouring', desc: 'Achieve your goals', image: landingAssets.treatments.body },
  { title: 'Skin Rejuvenation', desc: 'Restore your youthful glow', image: landingAssets.treatments.skin },
  { title: 'IV Drip Therapy', desc: 'Boost your wellness', image: landingAssets.treatments.iv },
  { title: 'Laser Treatments', desc: 'Smooth and flawless skin', image: landingAssets.treatments.laser },
]

const aboutPoints = [
  'Advanced & FDA-approved treatments',
  'Personalized treatment plans',
  'Experienced and licensed professionals',
  'Modern and comfortable facilities',
]

const testimonials = [
  {
    name: 'Maria Santos',
    branch: 'Pasig Branch',
    quote: 'The staff is amazing and the results are beyond my expectations!',
    avatar: landingAssets.testimonials.maria,
  },
  {
    name: 'Ana Reyes',
    branch: 'Makati Branch',
    quote: 'Every visit feels luxurious and personalized. I finally found a clinic I trust.',
    avatar: landingAssets.testimonials.ana,
  },
  {
    name: 'Bea Cruz',
    branch: 'Alabang Branch',
    quote: 'Imajica transformed my skin and my confidence. Truly professional care.',
    avatar: landingAssets.testimonials.maria,
  },
  {
    name: 'Sofia Lim',
    branch: 'Santa Cruz Branch',
    quote: 'From consultation to aftercare, everything felt premium and thoughtfully done.',
    avatar: landingAssets.testimonials.ana,
  },
  {
    name: 'Carla Mendoza',
    branch: 'Pasig Branch',
    quote: 'My skin has never looked better. The specialists really listen to what you need.',
    avatar: landingAssets.testimonials.maria,
  },
  {
    name: 'Isabel Tan',
    branch: 'Makati Branch',
    quote: 'Booking was easy and the clinic atmosphere is so calming. Highly recommend!',
    avatar: landingAssets.testimonials.ana,
  },
  {
    name: 'Nina Garcia',
    branch: 'Alabang Branch',
    quote: 'Visible results after just a few sessions. I feel more confident every day.',
    avatar: landingAssets.testimonials.maria,
  },
  {
    name: 'Lara Villanueva',
    branch: 'Pasig Branch',
    quote: 'Warm staff, modern facilities, and treatments that actually deliver.',
    avatar: landingAssets.testimonials.ana,
  },
]

const TESTIMONIAL_PAGE_SIZE = 4

const shell = 'mx-auto w-full max-w-[1536px] px-5 xl:px-10 min-[1536px]:px-[60px]'
const content = 'mx-auto w-full max-w-[1416px]'

export function LandingPage() {
  const [testimonialPage, setTestimonialPage] = useState(0)
  const [bookOpen, setBookOpen] = useState(false)
  const [promoOpen, setPromoOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [promo, setPromo] = useState<LandingPromo>(() => getLandingPromo())
  const [activePromos, setActivePromos] = useState<LandingPromo[]>(() => getActiveLandingPromos())
  const testimonialPageCount = Math.ceil(testimonials.length / TESTIMONIAL_PAGE_SIZE)
  const visibleTestimonials = testimonials.slice(
    testimonialPage * TESTIMONIAL_PAGE_SIZE,
    testimonialPage * TESTIMONIAL_PAGE_SIZE + TESTIMONIAL_PAGE_SIZE,
  )

  useEffect(() => {
    const refresh = () => {
      setPromo(getLandingPromo())
      setActivePromos(getActiveLandingPromos())
    }
    refresh()
    return subscribeLandingPromo(refresh)
  }, [])

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#1a1a1a]">
      <BookAppointmentModal open={bookOpen} onClose={() => setBookOpen(false)} />
      <SpecialPromoModal
        open={promoOpen}
        onClose={() => setPromoOpen(false)}
        promos={activePromos}
        onBook={() => setBookOpen(true)}
      />

      {/* HEADER — transparent, overlaps hero */}
      <header className="absolute inset-x-0 top-0 z-50 bg-transparent">
        <div className={cn(shell, 'flex h-[58px] items-center')}>
          <div className={cn(content, 'flex items-center justify-between gap-2')}>
            <Link to="/" className="flex min-w-0 shrink items-center gap-2 sm:gap-2.5">
              <img src={logo} alt={BRAND.name} className="h-8 w-8 shrink-0 rounded-full object-cover sm:h-9 sm:w-9" />
              <div className="min-w-0 leading-none">
                <p className="font-brand text-[16px] font-semibold tracking-[0.04em] text-[#073D2C] sm:text-[18px]">
                  IMAJICA
                </p>
                <p className="mt-0.5 text-[7px] font-medium uppercase tracking-[0.18em] text-[#C5A059] sm:text-[7.5px] sm:tracking-[0.24em]">
                  Medical Aesthetics
                </p>
              </div>
            </Link>

            <nav className="hidden items-center gap-7 text-[13px] font-semibold text-[#073D2C]/80 xl:flex">
              {navLinks.map((item, idx) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={cn(
                    'relative py-1 transition duration-300 hover:text-[#073D2C]',
                    'after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[1.5px] after:origin-left after:scale-x-0 after:bg-[#C5A059] after:transition-transform after:duration-300 hover:after:scale-x-100',
                    idx === 0 &&
                      'font-semibold text-[#073D2C] after:scale-x-100',
                  )}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
              <button
                type="button"
                aria-label="Search"
                className="hidden h-9 w-9 items-center justify-center rounded-full text-[#073D2C] transition duration-300 hover:scale-105 hover:bg-black/5 sm:inline-flex"
              >
                <Search className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <Link
                to="/login"
                className="inline-flex h-9 items-center rounded-full border border-[#073D2C]/25 bg-white/80 px-2.5 text-[11px] font-semibold text-[#073D2C] backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-[#C5A059] hover:text-[#C5A059] hover:shadow-[0_8px_20px_rgba(197,160,89,0.2)] sm:h-[40px] sm:px-3.5 sm:text-[12px]"
              >
                <span className="sm:hidden">Login</span>
                <span className="hidden sm:inline">Login / Register</span>
              </Link>
              <button
                type="button"
                onClick={() => setBookOpen(true)}
                className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-[#073D2C] px-2.5 text-[11px] font-medium text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#063B2A] hover:shadow-[0_12px_28px_rgba(7,61,44,0.28)] sm:h-[44px] sm:gap-2 sm:px-4 sm:text-[13px]"
              >
                <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="sm:hidden">Book</span>
                <span className="hidden sm:inline">Book Appointment</span>
              </button>
              <button
                type="button"
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#073D2C]/20 bg-white/70 text-[#073D2C] backdrop-blur-sm transition duration-300 xl:hidden',
                  mobileNavOpen && 'bg-[#073D2C] text-white',
                )}
                aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileNavOpen}
                onClick={() => setMobileNavOpen((v) => !v)}
              >
                <span className="relative h-5 w-5">
                  <Menu
                    className={cn(
                      'absolute inset-0 h-5 w-5 transition duration-300',
                      mobileNavOpen ? 'scale-75 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100',
                    )}
                  />
                  <X
                    className={cn(
                      'absolute inset-0 h-5 w-5 transition duration-300',
                      mobileNavOpen ? 'scale-100 rotate-0 opacity-100' : 'scale-75 -rotate-90 opacity-0',
                    )}
                  />
                </span>
              </button>
            </div>
          </div>
        </div>

        <MobileDrawer
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          side="right"
          widthClassName="w-[min(100%,320px)]"
          panelClassName="bg-[#FAF8F2]"
          rootClassName="fixed inset-0 z-[60] xl:hidden"
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-[#E8E2D6] px-4 py-3">
              <p className="font-brand text-lg font-semibold text-[#073D2C]">Menu</p>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#073D2C] hover:bg-black/5"
                aria-label="Close menu"
                onClick={() => setMobileNavOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-3">
              {navLinks.map((item, idx) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="block rounded-[10px] px-3 py-3 text-sm font-semibold text-[#073D2C] opacity-0 animate-[drawerLinkIn_0.35s_ease_forwards] hover:bg-white"
                  style={{ animationDelay: `${80 + idx * 40}ms` }}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="space-y-2 border-t border-[#E8E2D6] p-4">
              <Link
                to="/login"
                className="flex h-11 w-full items-center justify-center rounded-full border border-[#073D2C]/25 bg-white text-sm font-semibold text-[#073D2C]"
                onClick={() => setMobileNavOpen(false)}
              >
                Login / Register
              </Link>
              <button
                type="button"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#073D2C] text-sm font-semibold text-white"
                onClick={() => {
                  setMobileNavOpen(false)
                  setBookOpen(true)
                }}
              >
                <CalendarDays className="h-4 w-4" />
                Book Appointment
              </button>
            </div>
          </div>
        </MobileDrawer>
      </header>

      {/* HERO — taller so portrait + copy are fully visible */}
      <section
        id="home"
        className="relative overflow-hidden bg-[#FAF8F2] pt-[58px] xl:h-[620px] xl:pt-0"
      >
        <img
          src={landingAssets.heroBackground}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        {/* Soft cream wash on the left so copy stays readable over botanicals */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-full bg-gradient-to-b from-[#FAF8F2]/95 via-[#FAF8F2]/55 to-transparent xl:w-[52%] xl:bg-gradient-to-r xl:from-[#FAF8F2] xl:via-[#FAF8F2]/92 xl:to-transparent" />
        <img
          src={landingAssets.heroBotanicalLeft}
          alt=""
          className="pointer-events-none absolute bottom-0 left-[2%] z-[1] hidden h-[88%] w-auto opacity-[0.28] mix-blend-multiply xl:block"
        />

        {/* Content band fills below the 58px nav overlay */}
        <div className={cn(shell, 'relative z-[2] xl:absolute xl:inset-x-0 xl:bottom-0 xl:top-[58px]')}>
          <div
            className={cn(
              content,
              'relative grid gap-6 py-8',
              'xl:h-full xl:grid-cols-[520px_540px_356px] xl:gap-0 xl:overflow-visible xl:py-0',
            )}
          >
            {/* LEFT COPY */}
            <div className="relative z-10 flex flex-col justify-center xl:pb-6">
              <p className="text-[13px] font-bold uppercase tracking-[0.28em] text-[#B8860B]">
                Beauty. Science. Confidence.
              </p>
              <h1 className="mt-4 max-w-[500px] font-brand text-[34px] font-semibold leading-[0.94] text-[#073D2C] sm:text-[42px] xl:text-[62px]">
                Enhance Your Natural Beauty
              </h1>
              <p className="mt-4 max-w-[500px] text-[15px] font-medium leading-[1.5] text-[#2F2F2F] sm:text-[17px]">
                At Imajica Medical Aesthetics, we provide advanced, safe, and personalized aesthetic
                treatments to help you look and feel your best.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => setBookOpen(true)}
                  className="group inline-flex h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[#073D2C] px-6 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(7,61,44,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#063B2A] hover:shadow-[0_14px_32px_rgba(7,61,44,0.28)] sm:w-auto"
                >
                  Book an Appointment
                  <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
                </button>
                <a
                  href="#services"
                  className="group inline-flex h-[44px] w-full items-center justify-center gap-2 rounded-full border-2 border-[#B8860B] bg-[#FAF8F2]/90 px-6 text-[15px] font-semibold text-[#073D2C] transition duration-300 hover:-translate-y-0.5 hover:border-[#C5A059] hover:bg-[#C5A059]/15 hover:shadow-[0_10px_24px_rgba(197,160,89,0.18)] sm:w-auto"
                >
                  Explore Services
                  <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
                </a>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
                {trustItems.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="group flex items-start gap-2.5 rounded-[12px] p-1.5 transition duration-300 hover:-translate-y-0.5"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#073D2C]/8 text-[#B8860B] transition duration-300 group-hover:scale-110 group-hover:bg-[#073D2C] group-hover:shadow-[0_6px_16px_rgba(7,61,44,0.25)]">
                      <Icon className="h-[15px] w-[15px]" strokeWidth={2.25} />
                    </span>
                    <p className="pt-1 text-[12.5px] font-semibold leading-snug text-[#073D2C]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* CENTER MODEL — taller so she is fully visible */}
            <div className="relative z-10 mx-auto h-[380px] w-full max-w-[420px] xl:mx-0 xl:h-full xl:max-w-none">
              <img
                src={landingAssets.heroModel}
                alt="Imajica client with radiant skin"
                className="absolute bottom-0 left-1/2 z-[1] h-[380px] w-auto max-w-[100%] -translate-x-1/2 object-contain object-bottom drop-shadow-[0_16px_32px_rgba(7,61,44,0.12)] [mask-image:linear-gradient(to_top,#000_88%,transparent_100%),radial-gradient(ellipse_100%_95%_at_50%_55%,#000_78%,transparent_100%)] [mask-composite:intersect] [-webkit-mask-image:linear-gradient(to_top,#000_88%,transparent_100%),radial-gradient(ellipse_100%_95%_at_50%_55%,#000_78%,transparent_100%)] [-webkit-mask-composite:source-in] xl:h-[560px]"
              />
              <p
                aria-hidden
                className="pointer-events-none absolute bottom-[22%] right-[4%] z-[3] hidden rotate-[-10deg] font-script text-[2.4rem] leading-[1.12] text-[#073D2C] [text-shadow:0_1px_0_#FAF8F2,0_0_12px_#FAF8F2,0_0_24px_rgba(250,248,242,0.95)] sm:block xl:bottom-[24%] xl:right-[2%] xl:text-[2.85rem]"
              >
                Look Good
                <br />
                Feel Good
                <br />
                Be Confident
              </p>
            </div>

            {/* RIGHT RESULT CARD */}
            <div className="relative z-10 flex items-center justify-center xl:items-center xl:justify-start xl:pb-8">
              <img
                src={landingAssets.heroBotanicalRight}
                alt=""
                className="pointer-events-none absolute -right-2 top-6 z-[2] hidden h-44 w-auto object-contain opacity-85 mix-blend-multiply [mask-image:radial-gradient(ellipse_60%_65%_at_50%_45%,#000_40%,transparent_78%)] xl:block"
              />
              <div className="relative z-[1] flex w-full max-w-[355px] flex-col justify-between rounded-[18px] border border-[#E8E2D6] bg-[#FFFCF7] p-6 shadow-[0_14px_40px_rgba(7,61,44,0.12)] transition duration-500 hover:-translate-y-1 hover:border-[#C5A059]/50 hover:shadow-[0_22px_50px_rgba(7,61,44,0.16)] xl:h-[340px] xl:w-[355px] xl:shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-[#B8860B] text-[#B8860B]" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B8860B]">
                      Transform Yourself
                    </p>
                  </div>
                  <h2 className="mt-3 font-brand text-[30px] font-semibold leading-tight text-[#073D2C]">
                    Expert Care.
                    <br />
                    Visible Results.
                  </h2>
                  <p className="mt-3 text-[14px] font-medium leading-relaxed text-[#3a3a3a]">
                    Experience personalized treatments designed to bring out your natural beauty with
                    the latest technology and professional expertise.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-[#E8E2D6] pt-4">
                  <div>
                    <p className="font-metric text-[24px] font-bold tracking-tight text-[#073D2C]">10K+</p>
                    <p className="mt-1 text-[11px] font-semibold leading-snug text-[#4a4a4a]">
                      Happy Clients
                    </p>
                  </div>
                  <div className="border-l border-[#E8E2D6] pl-2.5">
                    <p className="font-metric text-[24px] font-bold tracking-tight text-[#073D2C]">15+</p>
                    <p className="mt-1 text-[11px] font-semibold leading-snug text-[#4a4a4a]">
                      Aesthetic Treatments
                    </p>
                  </div>
                  <div className="border-l border-[#E8E2D6] pl-2.5">
                    <p className="font-metric text-[24px] font-bold tracking-tight text-[#073D2C]">98%</p>
                    <p className="mt-1 text-[11px] font-semibold leading-snug text-[#4a4a4a]">
                      Satisfaction Rate
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="relative overflow-hidden bg-[#FAF8F2] pb-14 pt-6 lg:pb-24 lg:pt-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/70 to-transparent"
        />
        <div className={shell}>
          <div className={content}>
            <div className="mb-6 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-5">
              <div className="max-w-xl">
                <div className="flex items-center gap-3">
                  <span className="h-px w-8 bg-[#C5A059]" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C5A059]">
                    Our Services
                  </p>
                </div>
                <h2 className="mt-2 font-brand text-[2.1rem] font-medium leading-tight text-[#073D2C] sm:mt-3 sm:text-[2.5rem] lg:text-[3rem]">
                  Popular Treatments
                </h2>
                <p className="mt-2 max-w-md text-[14px] leading-relaxed text-[#6b6b6b] sm:mt-3 sm:text-[15px]">
                  Discover our most in-demand aesthetic treatments designed for your unique needs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookOpen(true)}
                className="group inline-flex w-fit items-center gap-2 rounded-full border border-[#073D2C]/15 bg-white px-4 py-2 text-[13px] font-semibold text-[#073D2C] shadow-[0_4px_16px_rgba(7,61,44,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-[#C5A059]/60 hover:text-[#C5A059] sm:px-5 sm:py-2.5 sm:text-sm"
              >
                View All Services
                <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
              </button>
            </div>

            {/* Mobile: horizontal snap carousel · Desktop: premium grid */}
            <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 scrollbar-thin sm:gap-3.5 xl:mx-0 xl:grid xl:snap-none xl:grid-cols-[repeat(6,minmax(0,1fr))_minmax(280px,1.25fr)] xl:gap-3.5 xl:overflow-visible xl:px-0 xl:pb-0">
              {services.map((service) => (
                <article
                  key={service.title}
                  className="group relative flex w-[156px] shrink-0 snap-start flex-col overflow-hidden rounded-[16px] border border-[#E8E2D6]/90 bg-white shadow-[0_6px_20px_rgba(7,61,44,0.05)] transition duration-500 hover:-translate-y-1.5 hover:border-[#C5A059]/45 hover:shadow-[0_18px_40px_rgba(7,61,44,0.12)] sm:w-[170px] xl:w-auto"
                >
                  <div className="relative aspect-[5/4] overflow-hidden bg-[#EFEBE3] xl:aspect-[4/5]">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="h-full w-full object-cover object-center transition duration-700 ease-out group-hover:scale-[1.08]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#073D2C]/75 via-[#073D2C]/10 to-transparent xl:from-[#073D2C]/80" />
                    <div className="absolute inset-x-0 bottom-0 p-2.5 text-white sm:p-3 xl:p-3.5">
                      <h3 className="font-brand text-[1.05rem] font-semibold leading-tight drop-shadow-sm sm:text-[1.15rem] xl:text-[1.15rem]">
                        {service.title}
                      </h3>
                      <p className="mt-0.5 line-clamp-2 text-[10px] font-medium leading-snug text-white/85 sm:text-[11px]">
                        {service.desc}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-[#F0EBE3] bg-[#FFFCF8] px-2.5 py-2 sm:px-3 sm:py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#C5A059] sm:text-[11px]">
                      Book now
                    </p>
                    <button
                      type="button"
                      onClick={() => setBookOpen(true)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E8D9B8] text-[#073D2C] transition duration-300 group-hover:bg-[#073D2C] group-hover:text-white sm:h-8 sm:w-8"
                      aria-label={`Book ${service.title}`}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              ))}

              {promo.isActive ? (
                <aside
                  id="packages"
                  className="group relative flex min-h-[200px] w-[240px] shrink-0 snap-start flex-col overflow-hidden rounded-[18px] bg-[#073D2C] text-white shadow-[0_12px_32px_rgba(7,61,44,0.2)] transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_22px_48px_rgba(7,61,44,0.3)] sm:w-[260px] xl:min-h-full xl:w-auto"
                >
                  <img
                    src={landingAssets.promoBotanical}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-45 transition duration-700 group-hover:scale-110 group-hover:opacity-55"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#041c18] via-[#073D2C]/88 to-[#073D2C]/50" />
                  <div className="relative z-[1] flex h-full min-h-[200px] flex-col justify-between gap-4 p-4 sm:p-5 xl:min-h-0 xl:p-6">
                    <div>
                      <span className="inline-flex rounded-full border border-[#C5A059]/50 bg-[#C5A059]/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#E8D9B8] sm:text-[10px]">
                        {promo.badge}
                      </span>
                      <h3 className="mt-3 font-brand text-[1.55rem] font-semibold leading-[1.1] sm:text-[1.75rem] xl:mt-4 xl:text-[2rem]">
                        {promo.headline}
                      </h3>
                      <p className="mt-2 text-[12px] font-medium leading-relaxed text-white/88 sm:mt-3 sm:text-[13px]">
                        {promo.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPromoOpen(true)}
                      className="group/btn inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#E8D9B8] px-3 text-[12px] font-semibold leading-tight text-[#073D2C] transition duration-300 hover:bg-[#C5A059] hover:text-white sm:text-[13px] xl:h-11"
                    >
                      {promo.ctaLabel}
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 transition duration-300 group-hover/btn:translate-x-1" />
                    </button>
                  </div>
                </aside>
              ) : null}
            </div>
            <p className="mt-3 text-center text-[11px] text-[#9a9a9a] xl:hidden">
              Swipe to browse treatments →
            </p>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="border-t border-[#E8E2D6] bg-white py-16 lg:py-20">
        <div className={shell}>
          <div className={cn(content, 'grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14')}>
            <div>
              <div className="mb-4 h-px w-12 bg-[#C5A059]" />
              <h2 className="font-brand text-[2.25rem] font-medium leading-tight text-[#073D2C] lg:text-[2.55rem]">
                About Imajica Medical Aesthetics
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[#5a5a5a]">
                We are committed to providing safe, effective, and personalized aesthetic solutions
                using the latest technology and professional expertise. Our goal is to enhance your
                natural beauty and boost your confidence.
              </p>
              <ul className="mt-7 space-y-3.5">
                {aboutPoints.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[14px] text-[#3a3a3a]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#073D2C] text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="group mt-8 inline-flex h-[44px] items-center gap-2 rounded-full border border-[#C5A059] px-5 text-sm font-medium text-[#073D2C] transition duration-300 hover:-translate-y-0.5 hover:bg-[#C5A059]/10 hover:shadow-[0_10px_24px_rgba(197,160,89,0.18)]"
              >
                Learn More About Us
                <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="group relative overflow-hidden rounded-[18px]">
              <img
                src={landingAssets.clinicInterior}
                alt="Imajica clinic reception"
                className="h-[340px] w-full rounded-[18px] object-cover shadow-[0_16px_40px_rgba(7,61,44,0.1)] transition duration-700 group-hover:scale-[1.03] lg:h-[400px]"
              />
              <div className="absolute bottom-5 left-5 flex items-center gap-2.5 rounded-[12px] bg-[#FDFBF7] px-4 py-3 shadow-[0_8px_24px_rgba(7,61,44,0.12)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_14px_32px_rgba(7,61,44,0.16)]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8D9B8] transition duration-300 group-hover:bg-[#C5A059]">
                  <Sparkles className="h-3.5 w-3.5 text-[#073D2C]" />
                </span>
                <p className="font-brand text-[15px] font-medium text-[#073D2C]">
                  Your Trusted Aesthetic Partner
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="gallery" className="bg-[#FAF8F2] py-16 lg:py-20">
        <div className={shell}>
          <div className={content}>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-brand text-[2.4rem] font-medium text-[#073D2C] lg:text-[2.7rem]">
                Client Testimonials
              </h2>
              <a
                href="#gallery"
                className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[#073D2C] transition duration-300 hover:text-[#C5A059]"
              >
                View All Testimonials
                <ArrowRight className="h-4 w-4 transition duration-300 group-hover:translate-x-1" />
              </a>
            </div>

            <div className="relative">
              <button
                type="button"
                aria-label="Previous testimonials"
                onClick={() =>
                  setTestimonialPage((p) => (p === 0 ? testimonialPageCount - 1 : p - 1))
                }
                className="absolute -left-1 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#E8E2D6] bg-white text-[#073D2C] shadow-sm transition duration-300 hover:-translate-x-0.5 hover:border-[#C5A059] hover:shadow-[0_8px_20px_rgba(7,61,44,0.12)] md:flex lg:-left-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next testimonials"
                onClick={() => setTestimonialPage((p) => (p + 1) % testimonialPageCount)}
                className="absolute -right-1 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#E8E2D6] bg-white text-[#073D2C] shadow-sm transition duration-300 hover:translate-x-0.5 hover:border-[#C5A059] hover:shadow-[0_8px_20px_rgba(7,61,44,0.12)] md:flex lg:-right-2"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <div className="grid gap-4 sm:grid-cols-2 md:px-8 xl:grid-cols-4">
                {visibleTestimonials.map((t, idx) => (
                  <article
                    key={`${t.name}-${idx}-${testimonialPage}`}
                    className="group rounded-[16px] border border-[#E8E2D6] bg-white p-6 shadow-[0_2px_14px_rgba(7,61,44,0.04)] transition duration-300 hover:-translate-y-1.5 hover:border-[#C5A059]/50 hover:shadow-[0_18px_40px_rgba(7,61,44,0.12)]"
                  >
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className="h-14 w-14 rounded-full object-cover object-top transition duration-300 group-hover:scale-105 group-hover:ring-2 group-hover:ring-[#C5A059]/40"
                    />
                    <div className="mt-3 flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-[#C5A059] text-[#C5A059]" />
                      ))}
                    </div>
                    <p className="mt-4 text-[14px] italic leading-relaxed text-[#5a5a5a]">
                      “{t.quote}”
                    </p>
                    <p className="mt-4 text-[14px] font-semibold text-[#073D2C]">{t.name}</p>
                    <p className="text-[12px] text-[#6b6b6b]">{t.branch}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-7 flex justify-center gap-2">
              {Array.from({ length: testimonialPageCount }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to testimonials page ${i + 1}`}
                  onClick={() => setTestimonialPage(i)}
                  className={cn(
                    'h-2 rounded-full transition duration-300',
                    i === testimonialPage
                      ? 'w-6 bg-[#073D2C]'
                      : 'w-2 bg-[#D4CFC4] hover:bg-[#C5A059]',
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="bg-[#073D2C] text-white">
        <div className={cn(shell, 'py-8')}>
          <div className={content}>
            <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
              <Link to="/" className="flex items-center gap-3">
                <img src={logo} alt="" className="h-11 w-11 rounded-full object-cover" />
                <div>
                  <p className="font-brand text-[22px] font-semibold tracking-wide">IMAJICA</p>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[#C5A059]">
                    Medical Aesthetics
                  </p>
                </div>
              </Link>

              <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-white/85">
                {navLinks.map((item) => (
                  <a key={item.label} href={item.href} className="transition hover:text-[#C5A059]">
                    {item.label}
                  </a>
                ))}
                <Link to="/login" className="font-semibold text-[#C5A059] transition hover:text-white">
                  Login
                </Link>
              </nav>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1 border-l border-white/20 pl-4">
                  <a href="https://facebook.com" aria-label="Facebook" className="flex h-8 w-8 items-center justify-center rounded-full transition duration-300 hover:scale-110 hover:bg-white/10 hover:text-[#C5A059]">
                    <SocialFacebook />
                  </a>
                  <a href="https://instagram.com" aria-label="Instagram" className="flex h-8 w-8 items-center justify-center rounded-full transition duration-300 hover:scale-110 hover:bg-white/10 hover:text-[#C5A059]">
                    <SocialInstagram />
                  </a>
                  <a href="https://tiktok.com" aria-label="TikTok" className="flex h-8 w-8 items-center justify-center rounded-full transition duration-300 hover:scale-110 hover:bg-white/10 hover:text-[#C5A059]">
                    <SocialTikTok />
                  </a>
                  <a href="https://youtube.com" aria-label="YouTube" className="flex h-8 w-8 items-center justify-center rounded-full transition duration-300 hover:scale-110 hover:bg-white/10 hover:text-[#C5A059]">
                    <SocialYouTube />
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => setBookOpen(true)}
                  className="group inline-flex h-[44px] items-center gap-2 rounded-full bg-[#E8D9B8] px-5 text-sm font-semibold text-[#073D2C] transition duration-300 hover:-translate-y-0.5 hover:bg-[#C5A059] hover:text-white hover:shadow-[0_12px_28px_rgba(197,160,89,0.35)]"
                >
                  <CalendarDays className="h-4 w-4 transition duration-300 group-hover:scale-110" />
                  Book Appointment
                </button>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-2 border-t border-white/15 pt-5 text-[13px] text-white/55 sm:flex-row sm:items-center sm:justify-between">
              <p>{BRAND.copyright}</p>
              <p className="font-brand text-[15px] italic text-[#C5A059]">{BRAND.tagline}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function SocialFacebook() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
      <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H8v3h3v7h3v-7h3l1-3h-4V9c0-.6.4-1 1-1z" />
    </svg>
  )
}

function SocialInstagram() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zm5.25-3.75a1 1 0 1 1-1 1 1 1 0 0 1 1-1z" />
    </svg>
  )
}

function SocialTikTok() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
      <path d="M14.5 3c.4 2.2 1.8 3.8 4 4.2v2.3c-1.4 0-2.7-.4-3.9-1.2v5.8a5.5 5.5 0 1 1-5.5-5.5c.3 0 .6 0 .9.1v2.4a3.1 3.1 0 1 0 2.2 3V3h2.3z" />
    </svg>
  )
}

function SocialYouTube() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
      <path d="M23 12.2s0-3.4-.4-5a2.9 2.9 0 0 0-2.1-2.1C18.8 4.6 12 4.6 12 4.6s-6.8 0-8.5.5A2.9 2.9 0 0 0 1.4 7.2C1 8.8 1 12.2 1 12.2s0 3.4.4 5a2.9 2.9 0 0 0 2.1 2.1c1.7.5 8.5.5 8.5.5s6.8 0 8.5-.5a2.9 2.9 0 0 0 2.1-2.1c.4-1.6.4-5 .4-5zM9.8 15.5v-6.6l5.7 3.3-5.7 3.3z" />
    </svg>
  )
}
