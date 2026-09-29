/** Consent / clinic form templates served from `/imajica_forms/` */

export type FormFieldType =
  | 'text'
  | 'date'
  | 'textarea'
  | 'radio'
  | 'checkbox-group'
  | 'yes-no-family'

export type FormFieldDef = {
  key: string
  label: string
  type: FormFieldType
  placeholder?: string
  options?: string[]
  /** checkbox-group only */
  choices?: string[]
  section?: 'primary' | 'assessment'
  fullWidth?: boolean
}

export type FormTemplateDef = {
  id: string
  fileName: string
  label: string
  /** Short badge label in history */
  typeLabel: string
  /** Extra top-level fields (besides patient name) shown above accordions */
  metaFields?: FormFieldDef[]
  primaryFields?: FormFieldDef[]
  assessmentFields?: FormFieldDef[]
  /** Second signature pad (witness / other) */
  otherSignature?: boolean
}

const facialPrimary: FormFieldDef[] = [
  { key: 'first_facial', label: 'Is this your first facial?', type: 'text', section: 'primary' },
  { key: 'main_skin_issue', label: 'What are your main skin issue?', type: 'text', section: 'primary' },
  {
    key: 'medications',
    label: 'Are you currently taking any medications?',
    type: 'text',
    section: 'primary',
  },
  {
    key: 'medical_conditions',
    label: 'Do you have any medical conditions?',
    type: 'text',
    section: 'primary',
  },
  { key: 'pregnant', label: 'Are you currently pregnant?', type: 'text', section: 'primary' },
  {
    key: 'allergies',
    label: 'Do you have any allergies? If yes, please specify',
    type: 'text',
    section: 'primary',
  },
  {
    key: 'sensitive_skin',
    label: 'Would you consider your skin sensitive?',
    type: 'text',
    section: 'primary',
  },
  {
    key: 'dry_or_oily',
    label: 'Would you say you have dry or oily skin?',
    type: 'text',
    section: 'primary',
  },
  { key: 'often_sun', label: 'Are you often out in the sun?', type: 'text', section: 'primary' },
  { key: 'tanning_beds', label: 'Do you use tanning beds?', type: 'text', section: 'primary' },
]

const medicalHistoryConditions = [
  'Acne',
  'Blood disorder',
  'Dermatitis',
  'Easily Bruised/Sensitive',
  'Fatigue',
  'Headaches/Migraines',
  'Hepatitis',
  'Hyper pigmentation',
  'Immune disorders',
  'Loss of Sensation',
  'Organ Failure',
  'Pregnant/Breast Feeding',
  'Seborrhoea',
  'Varicose veins',
  'Arthritis',
  'Cancer/Chemotherapy',
  'Diabetes',
  'Eczema',
  'Fever blisters',
  'Heart condition',
  'High blood pressure',
  'Hypo pigmentation',
  'Insomnia',
  'Low blood pressure',
  'Metal bone pins/plates',
  'Seizure disorder',
  'Transplant',
  'Warts',
  'Asthma',
  'Cardio/Vascular issues',
  'Depression',
  'Epilepsy/Seizures',
  'Fungal Condition',
  'Herpes',
  'HIV/AIDS',
  'Hysterectomy',
  'Keloid scarring',
  'Lupus',
  'Phlebitis, blood clots',
  'Skin disease/lesions',
  'Thyroid condition',
]

export const IMAJICA_FORM_TEMPLATES: FormTemplateDef[] = [
  {
    id: 'bio-micro',
    fileName: 'BioMicroInfusion-Form-3.pdf',
    label: 'BioMicroInfusion-Form-3.pdf',
    typeLabel: 'BioMicroInfusion-Form',
  },
  {
    id: 'botox',
    fileName: 'Botox-Consent-Form.pdf',
    label: 'Botox-Consent-Form.pdf',
    typeLabel: 'Botox-Consent',
  },
  {
    id: 'client-info',
    fileName: 'Client-Info-Form.pdf',
    label: 'Client-Info-Form.pdf',
    typeLabel: 'Client-Info-Form',
    primaryFields: [
      { key: 'first_name', label: 'First Name', type: 'text', section: 'primary' },
      { key: 'last_name', label: 'Last Name', type: 'text', section: 'primary' },
      { key: 'middle_name', label: 'Middle Name', type: 'text', section: 'primary' },
      { key: 'date_of_birth', label: 'Date of Birth', type: 'date', section: 'primary' },
      { key: 'age', label: 'Age', type: 'text', section: 'primary' },
      { key: 'sex', label: 'Sex', type: 'text', section: 'primary' },
      { key: 'phone', label: 'Phone Number', type: 'text', section: 'primary' },
      { key: 'email', label: 'Email Address', type: 'text', section: 'primary' },
      { key: 'address', label: 'Address', type: 'text', section: 'primary', fullWidth: true },
      {
        key: 'emergency_contact',
        label: 'Emergency Contact Name',
        type: 'text',
        section: 'primary',
      },
      {
        key: 'emergency_phone',
        label: 'Emergency Contact Phone',
        type: 'text',
        section: 'primary',
      },
      {
        key: 'occupation',
        label: 'Occupation',
        type: 'text',
        section: 'primary',
      },
    ],
    assessmentFields: [
      {
        key: 'skin_concerns',
        label: 'Primary Skin Concerns',
        type: 'textarea',
        section: 'assessment',
        fullWidth: true,
      },
      {
        key: 'current_products',
        label: 'Current Skincare Products',
        type: 'textarea',
        section: 'assessment',
        fullWidth: true,
      },
      {
        key: 'previous_treatments',
        label: 'Previous Aesthetic Treatments',
        type: 'textarea',
        section: 'assessment',
        fullWidth: true,
      },
    ],
  },
  {
    id: 'co2-laser',
    fileName: 'CO2-Laser-Consent-Imajica.pdf',
    label: 'CO2-Laser-Consent-Imajica.pdf',
    typeLabel: 'CO2-Laser-Consent',
  },
  {
    id: 'dermal-filler',
    fileName: 'Dermal-Filler-Consent-Form-HIPLA.pdf',
    label: 'Dermal-Filler-Consent-Form-HIPLA.pdf',
    typeLabel: 'Dermal-Filler-Consent',
  },
  {
    id: 'facial',
    fileName: 'Facial-Form.pdf',
    label: 'Facial-Form.pdf',
    typeLabel: 'Facial-Form',
    primaryFields: facialPrimary,
    assessmentFields: [
      {
        key: 'additional_notes',
        label: 'Additional notes / assessment',
        type: 'textarea',
        section: 'assessment',
        fullWidth: true,
      },
    ],
  },
  {
    id: 'gluta',
    fileName: 'Gluta-Consent-Form.pdf',
    label: 'Gluta-Consent-Form.pdf',
    typeLabel: 'Gluta-Consent-Form',
    metaFields: [
      { key: 'client_full_name', label: 'Client Full Name', type: 'text' },
      { key: 'witness_full_name', label: 'Witness Full Name', type: 'text' },
    ],
  },
  {
    id: 'hair-loss',
    fileName: 'Hair-Loss-Treatment-Consent-Form.pdf',
    label: 'Hair-Loss-Treatment-Consent-Form.pdf',
    typeLabel: 'Hair-Loss-Consent',
  },
  {
    id: 'hair-removal',
    fileName: 'Hair-Removal-Consent-Form.pdf',
    label: 'Hair-Removal-Consent-Form.pdf',
    typeLabel: 'Hair-Removal-Consent',
    metaFields: [{ key: 'technician_full_name', label: 'Technicians Full Name', type: 'text' }],
    otherSignature: true,
  },
  {
    id: 'hifu',
    fileName: 'HIFU-Consent-Form.pdf',
    label: 'HIFU-Consent-Form.pdf',
    typeLabel: 'HIFU-Consent',
    metaFields: [
      {
        key: 'authorized_person',
        label: 'I now authorize (Authorized Person) to begin my HIFU treatment',
        type: 'text',
      },
      { key: 'technician_full_name', label: 'Technicians Full Name', type: 'text' },
    ],
    otherSignature: true,
  },
  {
    id: 'hiko',
    fileName: 'Hiko-Consent-Form.pdf',
    label: 'Hiko-Consent-Form.pdf',
    typeLabel: 'Hiko-Consent',
  },
  {
    id: 'slim-screening',
    fileName: 'IMAJICA SLIM (Tirzepatide) Screening Form.pdf',
    label: 'IMAJICA SLIM (Tirzepatide) Screening Form.pdf',
    typeLabel: 'Imajica-Slim-Screening',
    primaryFields: [
      { key: 'date_of_intake', label: 'Date of Intake', type: 'date', section: 'primary' },
      { key: 'last_name', label: 'Last Name', type: 'text', section: 'primary' },
      { key: 'first_name', label: 'First Name', type: 'text', section: 'primary' },
      { key: 'middle_name', label: 'Middle Name', type: 'text', section: 'primary' },
      { key: 'date_of_birth', label: 'Date of Birth', type: 'date', section: 'primary' },
      { key: 'age', label: 'Age', type: 'text', section: 'primary' },
      { key: 'phone', label: 'Phone Number', type: 'text', section: 'primary' },
      { key: 'address', label: 'Address', type: 'text', section: 'primary' },
      { key: 'weight', label: 'Weight', type: 'text', section: 'primary' },
      { key: 'height', label: 'Height', type: 'text', section: 'primary' },
      { key: 'bmi', label: 'BMI', type: 'text', section: 'primary' },
      { key: 'category', label: 'Category', type: 'text', section: 'primary' },
      {
        key: 'diabetes',
        label: 'Diabetes or any metabolic disease?',
        type: 'yes-no-family',
        section: 'primary',
        fullWidth: true,
      },
      {
        key: 'pancreatitis',
        label: 'History of pancreatitis?',
        type: 'yes-no-family',
        section: 'primary',
        fullWidth: true,
      },
      {
        key: 'thyroid',
        label: 'Thyroid problems or cancer?',
        type: 'yes-no-family',
        section: 'primary',
        fullWidth: true,
      },
      {
        key: 'gi',
        label: 'Gastrointestinal disorders?',
        type: 'yes-no-family',
        section: 'primary',
        fullWidth: true,
      },
    ],
    assessmentFields: [
      {
        key: 'assessment_notes',
        label: 'Assessment notes',
        type: 'textarea',
        section: 'assessment',
        fullWidth: true,
      },
    ],
  },
  {
    id: 'slim-waiver',
    fileName: 'IMAJICA SLIM WAIVER FORM.pdf',
    label: 'IMAJICA SLIM WAIVER FORM.pdf',
    typeLabel: 'Imajica-Slim-Waiver',
    primaryFields: [
      { key: 'printed_name', label: 'For Printed Name', type: 'text', section: 'primary' },
      { key: 'age', label: 'Age', type: 'text', section: 'primary' },
      { key: 'sex', label: 'Sex', type: 'text', section: 'primary' },
      { key: 'contact_number', label: 'Contact Number', type: 'text', section: 'primary' },
      { key: 'email', label: 'Email Address', type: 'text', section: 'primary' },
    ],
    assessmentFields: [
      {
        key: 'current_address',
        label: 'Current Address',
        type: 'text',
        section: 'assessment',
        fullWidth: true,
      },
      {
        key: 'acknowledgement_notes',
        label: 'Additional acknowledgement notes',
        type: 'textarea',
        section: 'assessment',
        fullWidth: true,
      },
    ],
  },
  {
    id: 'keloid',
    fileName: 'Keloid-Subcision-Consent-Form.pdf',
    label: 'Keloid-Subcision-Consent-Form.pdf',
    typeLabel: 'Keloid-Subcision-Consent',
  },
  {
    id: 'mesolipo',
    fileName: 'Mesolipo-Consent-Form.pdf',
    label: 'Mesolipo-Consent-Form.pdf',
    typeLabel: 'Mesolipo-Consent',
    metaFields: [
      { key: 'client_name', label: 'Client Name', type: 'text' },
      { key: 'witness_name', label: 'Witness Name', type: 'text' },
    ],
  },
  {
    id: 'mesotherapy',
    fileName: 'MESOtheraphy-Consent-Form.pdf',
    label: 'MESOtheraphy-Consent-Form.pdf',
    typeLabel: 'Mesotherapy-Consent',
    metaFields: [
      {
        key: 'treatment_reasons',
        label:
          'I understand that mesotherapy can be used for many reasons and I want to have treatment for the following:',
        type: 'text',
        fullWidth: true,
      },
      {
        key: 'skin_rejuvenation_of',
        label: 'Skin rejuvenation of............................',
        type: 'text',
      },
      {
        key: 'product_origin',
        label:
          'I understand that the origin of products used for mesotherapy treatment injections of ............................ is not necessarily from the Thailand.',
        type: 'text',
        fullWidth: true,
      },
    ],
  },
  {
    id: 'microneedling',
    fileName: 'Microneedling-Consent-Form.pdf',
    label: 'Microneedling-Consent-Form.pdf',
    typeLabel: 'Microneedling-Consent',
    metaFields: [{ key: 'staff_name', label: 'Staff Name', type: 'text' }],
  },
  {
    id: 'mpox',
    fileName: 'MPOX-ASSESSMENT-FORM.pdf',
    label: 'MPOX-ASSESSMENT-FORM.pdf',
    typeLabel: 'MPOX-Assessment',
    primaryFields: [
      { key: 'name', label: 'Name', type: 'text', section: 'primary' },
      { key: 'age', label: 'Age', type: 'text', section: 'primary' },
      { key: 'date', label: 'Date', type: 'date', section: 'primary' },
      { key: 'address', label: 'Address', type: 'text', section: 'primary' },
      { key: 'birthday', label: 'Birthday', type: 'date', section: 'primary' },
      {
        key: 'contact_mpox',
        label:
          'Have you had close contact with anyone diagnosed with MPOX in the last 30 days?',
        type: 'radio',
        options: ['yes', 'maybe', 'no'],
        section: 'primary',
        fullWidth: true,
      },
      {
        key: 'travel_contact',
        label:
          'Have you been in close contact with anyone who has traveled to a country with reported MPOX cases?',
        type: 'radio',
        options: ['yes', 'maybe', 'no'],
        section: 'primary',
        fullWidth: true,
      },
    ],
    assessmentFields: [
      {
        key: 'symptoms_notes',
        label: 'Symptoms / assessment notes',
        type: 'textarea',
        section: 'assessment',
        fullWidth: true,
      },
    ],
  },
  {
    id: 'photo-video',
    fileName: 'Photo-Video-Consent.pdf',
    label: 'Photo-Video-Consent.pdf',
    typeLabel: 'Photo-Video-Consent',
    metaFields: [
      { key: 'client_name', label: 'Client Name', type: 'text' },
      { key: 'guardian_name', label: 'Guardian Name', type: 'text' },
    ],
    otherSignature: true,
  },
  {
    id: 'picolaser',
    fileName: 'Picolaser-Consent-Form.pdf',
    label: 'Picolaser-Consent-Form.pdf',
    typeLabel: 'Picolaser-Consent',
    metaFields: [{ key: 'staff_name', label: 'Staff Name', type: 'text' }],
  },
  {
    id: 'rf-cavi',
    fileName: 'RF-Cavi-Consent-Form.pdf',
    label: 'RF-Cavi-Consent-Form.pdf',
    typeLabel: 'RF-Cavi-Consent',
    primaryFields: [
      { key: 'aesthetician_name', label: 'Aesthetician Name', type: 'text', section: 'primary' },
      {
        key: 'pregnant_breastfeeding',
        label: 'Pregnant or breastfeeding?',
        type: 'text',
        section: 'primary',
      },
      {
        key: 'heart_problems',
        label: 'Have heart problems or diseases?',
        type: 'text',
        section: 'primary',
      },
      {
        key: 'high_blood_pressure',
        label: 'Have high blood pressure?',
        type: 'text',
        section: 'primary',
      },
      { key: 'have_cancer', label: 'Have cancer?', type: 'text', section: 'primary' },
      {
        key: 'kidney',
        label: 'Have kidney damage, disease or problem?',
        type: 'text',
        section: 'primary',
      },
      {
        key: 'liver',
        label: 'Have liver damage, disease or problem?',
        type: 'text',
        section: 'primary',
      },
      {
        key: 'inflammation',
        label: 'Have acute inflammatory processes?',
        type: 'text',
        section: 'primary',
      },
      {
        key: 'bleeding',
        label: 'Have hemorrhagic disease, trauma or bleeding?',
        type: 'text',
        section: 'primary',
      },
    ],
    assessmentFields: [
      {
        key: 'other_notes',
        label: 'Other medical notes',
        type: 'textarea',
        section: 'assessment',
        fullWidth: true,
      },
    ],
    otherSignature: true,
  },
  {
    id: 'skin-lightening',
    fileName: 'Skin-Lightening-Consent-form.pdf',
    label: 'Skin-Lightening-Consent-form.pdf',
    typeLabel: 'Skin-Lightening-Consent',
    metaFields: [{ key: 'clinic_name', label: 'Clinic Name', type: 'text' }],
  },
  {
    id: 'skin-tag',
    fileName: 'Skin-Tag-Warts-Removal-Consent-Form.pdf',
    label: 'Skin-Tag-Warts-Removal-Consent-Form.pdf',
    typeLabel: 'Skin-Tag-Warts-Consent',
  },
  {
    id: 'tattoo-removal',
    fileName: 'Tattoo-Removal-Consent-Form.pdf',
    label: 'Tattoo-Removal-Consent-Form.pdf',
    typeLabel: 'Tattoo-Removal-Consent',
    metaFields: [
      { key: 'staff_name', label: 'Staff Name', type: 'text' },
      { key: 'technician_name', label: 'Technician Name', type: 'text' },
      { key: 'facility_name', label: 'Facility Name', type: 'text' },
      { key: 'company_name', label: 'Company Name', type: 'text' },
    ],
    otherSignature: true,
  },
  {
    id: 'terms',
    fileName: 'Terms-Conditions.pdf',
    label: 'Terms-Conditions.pdf',
    typeLabel: 'Terms-Condition',
  },
  // PDF not in folder yet — kept for when Medical History is added
  {
    id: 'medical-history',
    fileName: 'Medical-History-Client-Form.pdf',
    label: 'Medical History-Client Form.pdf (add PDF to imajica_forms)',
    typeLabel: 'Medical-History-Client',
    primaryFields: [
      {
        key: 'conditions',
        label:
          'Do you have or had any of these following conditions? If yes please check below.',
        type: 'checkbox-group',
        choices: medicalHistoryConditions,
        section: 'primary',
        fullWidth: true,
      },
      { key: 'others', label: 'Others', type: 'text', section: 'primary', fullWidth: true },
    ],
    assessmentFields: [
      {
        key: 'medications',
        label: 'Current medications',
        type: 'textarea',
        section: 'assessment',
        fullWidth: true,
      },
      {
        key: 'allergies',
        label: 'Allergies',
        type: 'textarea',
        section: 'assessment',
        fullWidth: true,
      },
    ],
  },
]

export function formPdfUrl(fileName: string) {
  return `/imajica_forms/${encodeURIComponent(fileName)}`
}

export function getFormTemplate(id: string) {
  return IMAJICA_FORM_TEMPLATES.find((t) => t.id === id)
}
