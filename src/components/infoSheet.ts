// The Applicant's Information Sheet, following the paper form. Shared by the site (renders the form and the printable
// sheet) and the API server (checks every answer). Keep this file free of browser-only code.

export type SheetField = {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'number' | 'textarea' | 'select';
  options?: string[];
  required?: boolean;
  wide?: boolean; // full width in the form
};
// by: who fills the part in. The client fills the applicant's parts; their co-maker (spouse/surety) fills theirs.
export type SheetSection = { id: string; title: string; by: 'applicant' | 'comaker'; note?: string; fields?: SheetField[]; kind?: 'dependents' | 'purpose' | 'affirm' };

const person = (p: string, required: boolean): SheetField[] => [
  { key: `${p}.firstName`, label: 'First name', required },
  { key: `${p}.middleName`, label: 'Middle name' },
  { key: `${p}.lastName`, label: 'Family name', required },
  { key: `${p}.nickname`, label: 'Nickname' },
  { key: `${p}.birthDate`, label: 'Date of birth', type: 'date', required },
  { key: `${p}.age`, label: 'Age', type: 'number' },
  { key: `${p}.civilStatus`, label: 'Civil status', type: 'select', options: ['Single', 'Married'], required },
  { key: `${p}.religion`, label: 'Religion' },
  { key: `${p}.birthPlace`, label: 'Birth place' },
  { key: `${p}.presentAddress`, label: 'Present address', type: 'textarea', required, wide: true },
  { key: `${p}.previousAddress`, label: 'Previous address', type: 'textarea', wide: true },
];
const work = (p: string): SheetField[] => [
  { key: `${p}.firm`, label: 'Employed at (firm)' },
  { key: `${p}.firmAddress`, label: 'Firm address' },
  { key: `${p}.position`, label: 'Position' },
  { key: `${p}.salary`, label: 'Salary (net)' },
  { key: `${p}.serviceLength`, label: 'Length of service' },
  { key: `${p}.businessName`, label: 'Business name (if in business)' },
  { key: `${p}.businessAddress`, label: 'Business address' },
  { key: `${p}.businessLine`, label: 'Line of business' },
  { key: `${p}.businessSince`, label: 'Operating since' },
  { key: `${p}.capital`, label: 'Capital' },
  { key: `${p}.netIncome`, label: 'Net income' },
  { key: `${p}.otherIncome`, label: 'Other income', type: 'textarea', wide: true },
];
const parents = (p: string): SheetField[] => [
  { key: `${p}.fatherName`, label: "Father's name" },
  { key: `${p}.fatherAge`, label: "Father's age", type: 'number' },
  { key: `${p}.fatherAddress`, label: "Father's address" },
  { key: `${p}.fatherOccupation`, label: "Father's occupation" },
  { key: `${p}.motherName`, label: "Mother's name" },
  { key: `${p}.motherAge`, label: "Mother's age", type: 'number' },
  { key: `${p}.motherAddress`, label: "Mother's address" },
  { key: `${p}.motherOccupation`, label: "Mother's occupation" },
];
const ids = (p: string): SheetField[] => [
  { key: `${p}.ctcNo`, label: 'Community Tax Cert. No.' },
  { key: `${p}.ctcIssuedAt`, label: 'Issued at' },
  { key: `${p}.ctcIssuedOn`, label: 'Issued on', type: 'date' },
  { key: `${p}.tin`, label: 'TIN No.' },
  { key: `${p}.sss`, label: 'SSS No.' },
];

export const PURPOSES = ['Habal-habal', 'Tricycle', 'Masiao / bagdok', 'Rental', 'Election', 'Others'];

export const SHEET: SheetSection[] = [
  { id: 'applicant', by: 'applicant', title: 'Name of applicant', fields: person('applicant', true) },
  { id: 'spouse', by: 'comaker', title: 'Spouse / surety of applicant', note: 'Your co-maker (spouse or surety) fills this in.', fields: person('spouse', false) },
  { id: 'dependents', by: 'applicant', title: 'Dependents', note: 'Name, age, where studying (year and course), and others.', kind: 'dependents' },
  {
    id: 'residence',
    by: 'applicant',
    title: 'Residence',
    fields: [
      { key: 'residence.type', label: 'Residence', type: 'select', options: ['Own house & lot', 'Own house, renting the lot', 'Renting house & lot'], required: true },
      { key: 'residence.owner', label: "Owner's name (if renting)" },
      { key: 'residence.rental', label: 'Monthly rental (if renting)' },
      { key: 'residence.length', label: 'Length of residence' },
      { key: 'residence.telephone', label: 'Telephone no.' },
      { key: 'residence.cellphone', label: 'Cellphone no.', required: true },
    ],
  },
  { id: 'applicantWork', by: 'applicant', title: 'Applicant: employment and business', fields: work('applicantWork') },
  { id: 'spouseWork', by: 'comaker', title: 'Spouse / surety: employment and business', fields: work('spouseWork') },
  {
    id: 'assets',
    by: 'applicant',
    title: 'Bank references and property',
    fields: [
      { key: 'assets.bankReferences', label: 'Bank references (savings, current, time deposit)', type: 'textarea', wide: true },
      { key: 'assets.property', label: 'Personal / real property (land, vehicles, appliances, others)', type: 'textarea', wide: true },
    ],
  },
  { id: 'applicantParents', by: 'applicant', title: "Applicant's parents", fields: parents('applicantParents') },
  { id: 'spouseParents', by: 'comaker', title: "Spouse / surety's parents", fields: parents('spouseParents') },
  {
    id: 'references',
    by: 'applicant',
    title: 'References',
    fields: [
      { key: 'references.staff', label: 'Broom Broom staff who knows you or your hometown', wide: true },
      { key: 'references.nearby', label: 'Anyone in or near Butuan City', wide: true },
      { key: 'references.coWorkers', label: 'Co-workers', wide: true },
      { key: 'references.neighbors', label: 'Neighbors', wide: true },
      { key: 'references.relatives', label: 'Relatives', wide: true },
    ],
  },
  { id: 'purpose', by: 'applicant', title: 'Purpose of this unit', kind: 'purpose' },
  {
    id: 'credit',
    by: 'applicant',
    title: 'Credit history',
    fields: [
      { key: 'credit.creditors', label: 'Companies / persons who extended you credit', type: 'textarea', wide: true },
      { key: 'credit.merchandise', label: 'What merchandise?' },
      { key: 'credit.status', label: 'Status', type: 'select', options: ['Fully paid', 'Still unpaid'] },
      { key: 'credit.unpaidReason', label: 'If still unpaid, why?', type: 'textarea', wide: true },
      { key: 'credit.attracted', label: 'What attracted you to buy at Broom Broom?', type: 'textarea', wide: true },
    ],
  },
  { id: 'applicantIds', by: 'applicant', title: 'Applicant: IDs', fields: ids('applicantIds') },
  { id: 'spouseIds', by: 'comaker', title: 'Spouse / surety: IDs', fields: ids('spouseIds') },
  { id: 'directions', by: 'applicant', title: 'Sketch / directions to your home', fields: [{ key: 'directions.text', label: 'Landmarks and directions', type: 'textarea', wide: true }] },
  { id: 'affirm', by: 'applicant', title: 'Affirmation', kind: 'affirm' },
];

export const AFFIRMATION =
  'I hereby affirm that each of the answers to the foregoing questions are true and correct. I authorize Broom Broom to obtain such information as it may require concerning this application, and I agree that such information shall remain its property whether this application is approved or not.';

export type Dependent = { name: string; age: string; studying: string; others?: string };
export type InfoSheet = {
  answers: Record<string, string>; // field key -> answer
  dependents: Dependent[];
  purposes: string[];
  purposeOther?: string;
  affirmed: true;
  signature: string; // the applicant types their full name
  spouseSignature?: string;
  sketchUrl?: string; // optional photo of a hand-drawn sketch or map
};

const FIELDS = SHEET.flatMap((s) => s.fields ?? []);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Checks and tidies a submitted sheet. Returns the clean sheet, or the first problem as a message.
export const cleanInfoSheet = (input: any): InfoSheet | string => {
  const raw = input?.answers && typeof input.answers === 'object' ? input.answers : {};
  const answers: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = str(raw[f.key], f.type === 'textarea' ? 1000 : 200);
    if (f.required && !v) return `${SHEET.find((s) => s.fields?.includes(f))!.title}: ${f.label} is required.`;
    if (v && f.type === 'select' && !f.options!.includes(v)) return `${f.label}: choose one of the options.`;
    if (v && f.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${f.label}: enter a valid date.`;
    if (v && f.type === 'number' && !/^\d{1,3}$/.test(v)) return `${f.label}: enter a number.`;
    if (v) answers[f.key] = v;
  }
  const dependents = (Array.isArray(input?.dependents) ? input.dependents : [])
    .slice(0, 8)
    .map((d: any) => ({ name: str(d?.name, 120), age: str(d?.age, 3), studying: str(d?.studying, 200), others: str(d?.others, 120) || undefined }))
    .filter((d: Dependent) => d.name);
  const purposes = (Array.isArray(input?.purposes) ? input.purposes : []).filter((p: unknown) => PURPOSES.includes(p as string));
  if (!purposes.length) return 'Purpose of this unit: check at least one.';
  const purposeOther = str(input?.purposeOther, 200);
  if (purposes.includes('Others') && !purposeOther) return 'Purpose of this unit: say what "Others" is.';
  if (input?.affirmed !== true) return 'Affirmation: confirm that your answers are true and correct.';
  const signature = str(input?.signature, 120);
  if (!signature) return 'Affirmation: type your full name as your signature.';
  return { answers, dependents, purposes, purposeOther: purposeOther || undefined, affirmed: true, signature, spouseSignature: str(input?.spouseSignature, 120) || undefined };
};
