import { demoStaff } from '@/constants/demoData'
import type { Staff } from '@/types'

/** Shared staff directory rows (Staff page + booking checkout pickers). */
const DIRECTORY_EXTRA: Staff[] = [
  {
    id: 'st-franchise-ae-01',
    code: 'MJ-AE-FR01',
    fullName: 'Angela Reyes',
    email: 'angela.reyes@imajica.ph',
    phone: '09171234001',
    role: 'AESTHETICIAN',
    title: 'Aesthetician',
    department: 'Operation Departments',
    branchId: '22222222-2222-2222-2222-222222222205',
    branchName: 'Dasmariñas, Cavite',
    status: 'active',
    specializations: ['Facials'],
    hireDate: '2024-03-01',
    employmentType: 'Full-time',
    rating: 4.9,
    reviewCount: 22,
    baseSalary: 35000,
    birthDate: '1995-10-02',
  },
  {
    id: 'st-franchise-rec-01',
    code: 'MJ-RC-FR01',
    fullName: 'Carla Mendoza',
    email: 'carla.mendoza@imajica.ph',
    phone: '09181234002',
    role: 'RECEPTIONIST',
    title: 'Receptionist',
    department: 'Operation Departments',
    branchId: '22222222-2222-2222-2222-222222222205',
    branchName: 'Dasmariñas, Cavite',
    status: 'active',
    specializations: ['Front Desk'],
    hireDate: '2024-05-15',
    employmentType: 'Full-time',
    rating: 4.7,
    reviewCount: 12,
    baseSalary: 28000,
    birthDate: '1998-10-05',
  },
  {
    id: 'st-rosalie',
    code: 'MJ-AE-010',
    fullName: 'Rosalie Manalo',
    email: 'jangmi2575@gmail.com',
    phone: '09064770983',
    role: 'AESTHETICIAN',
    title: 'Aesthetician',
    department: 'Operation Departments',
    branchId: 'br-pasig',
    branchName: 'Pasig City',
    status: 'active',
    specializations: ['Facials'],
    hireDate: '2024-02-01',
    employmentType: 'Full-time',
    rating: 4.9,
    reviewCount: 50,
    baseSalary: 35000,
    birthDate: '1992-09-30',
  },
  {
    id: 'st-veronica',
    code: 'MJ-AE-011',
    fullName: 'Veronica Mayo',
    email: 'veronica.mayo@imajica.ph',
    phone: '09171234567',
    role: 'AESTHETICIAN',
    title: 'Aesthetician',
    department: 'Operation Departments',
    branchId: 'br-pasig',
    branchName: 'Cainta, Rizal',
    status: 'active',
    specializations: ['Facials'],
    hireDate: '2024-04-12',
    employmentType: 'Full-time',
    rating: 4.8,
    reviewCount: 40,
    baseSalary: 34000,
  },
  {
    id: 'st-sonayah',
    code: 'MJ-BM-012',
    fullName: 'Sonayah Arsila',
    email: 'sonayah.arsila@imajica.ph',
    phone: '09181234567',
    role: 'BRANCH_ADMIN',
    title: 'Branch Manager',
    department: 'Operation Departments',
    branchId: 'br-pasig',
    branchName: 'San Mateo, Rizal',
    status: 'active',
    specializations: ['Operations'],
    hireDate: '2023-08-01',
    employmentType: 'Full-time',
    rating: 5,
    reviewCount: 20,
    baseSalary: 55000,
  },
  {
    id: 'st-rasmiya',
    code: 'MJ-AE-013',
    fullName: 'Rasmiya Monteclaro',
    email: 'rasmiya.m@imajica.ph',
    phone: '09191234567',
    role: 'AESTHETICIAN',
    title: 'Aesthetician',
    department: 'Operation Departments',
    branchId: 'br-makati',
    branchName: 'Bacoor, Cavite',
    status: 'inactive',
    specializations: ['Facials'],
    hireDate: '2023-01-10',
    employmentType: 'Full-time',
    rating: 4.5,
    reviewCount: 18,
    baseSalary: 32000,
  },
  {
    id: 'st-dr-lim',
    code: 'MJ-DR-001',
    fullName: 'Dr. Patricia Lim',
    email: 'patricia.lim@imajica.ph',
    phone: '09171112233',
    role: 'DOCTOR',
    title: 'Aesthetic Physician',
    department: 'Medical Departments',
    branchId: 'br-pasig',
    branchName: 'Pasig City',
    status: 'active',
    specializations: ['Injectables', 'Dermatology'],
    hireDate: '2022-06-01',
    employmentType: 'Full-time',
    rating: 5,
    reviewCount: 80,
    baseSalary: 90000,
  },
  {
    id: 'st-dr-santos',
    code: 'MJ-DR-002',
    fullName: 'Dr. Miguel Santos',
    email: 'miguel.santos@imajica.ph',
    phone: '09182223344',
    role: 'DOCTOR',
    title: 'Aesthetic Physician',
    department: 'Medical Departments',
    branchId: 'br-makati',
    branchName: 'Makati City',
    status: 'active',
    specializations: ['Laser', 'Skin'],
    hireDate: '2023-02-15',
    employmentType: 'Full-time',
    rating: 4.9,
    reviewCount: 55,
    baseSalary: 88000,
  },
]

export function getDirectoryStaff(): Staff[] {
  const extras = DIRECTORY_EXTRA
  const demo = demoStaff.map((s) => ({
    ...s,
    department: s.department ?? 'Operation Departments',
    title: s.title || s.role,
    branchName: s.branchName.includes('City')
      ? s.branchName
      : `${s.branchName} City`.replace(' City City', ' City'),
  }))
  const ids = new Set(extras.map((e) => e.id))
  return [...extras, ...demo.filter((d) => !ids.has(d.id))]
}

export function getActiveStaffForBooking(branchId?: string): Staff[] {
  return getDirectoryStaff().filter((s) => {
    if (s.status !== 'active') return false
    if (s.role === 'DOCTOR') return false
    if (branchId && s.branchId !== branchId) return false
    return true
  })
}

export function getActiveDoctorsForBooking(branchId?: string): Staff[] {
  return getDirectoryStaff().filter((s) => {
    if (s.status !== 'active') return false
    if (s.role !== 'DOCTOR') return false
    if (branchId && s.branchId !== branchId) return false
    return true
  })
}
