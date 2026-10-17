// Shared by the site and the API server (which enforces it): keep this file free of browser-only code.

// What each settlement method needs from the client, grouped as the form shows them.
export type Doc = { key: string; label: string; hint: string };
export const DOCS: Record<'cash' | 'financing', { title: string; items: Doc[] }[]> = {
  cash: [{ title: 'Valid ID', items: [{ key: 'id-signature', label: 'Valid ID with signature', hint: '' }] }],
  financing: [
    {
      title: 'Valid IDs',
      items: [
        { key: 'id-applicant', label: 'Valid ID: applicant', hint: '' },
        { key: 'id-comaker-1', label: 'Valid ID: co-maker 1', hint: '' },
        { key: 'id-comaker-2', label: 'Valid ID: co-maker 2', hint: '' },
      ],
    },
    { title: 'Proof of billing', items: [{ key: 'billing', label: 'Proof of billing', hint: 'Water, electric or internet bill' }] },
    {
      title: 'Proof of income',
      items: [
        { key: 'payslip', label: 'Payslip', hint: 'If employed' },
        { key: 'coe', label: 'Certificate of Employment (COE)', hint: 'If employed' },
        { key: 'dti', label: 'DTI registration', hint: 'If a business owner' },
        { key: 'permit', label: 'Business permit', hint: 'If a business owner' },
        { key: 'sales', label: 'Daily sales record', hint: 'If a business owner' },
        { key: 'business-photo', label: 'Photo of the business', hint: 'If a business owner' },
      ],
    },
  ],
};
// Clients may send the rest straight to the admin, who files it for them.
export const MIN_UPLOADS = 2;
