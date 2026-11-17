/**
 * Facts about whoever runs this copy of SELAH. They are the owner's to fill in, and the pages never
 * guess at them. While operator or contact is empty the pages say plainly that they are a draft.
 * Listed in docs/needs-from-you.md.
 */
export const LEGAL = {
  /** The person or organisation that runs the service, as it should appear in the Terms. */
  operator: 'Zionnaire Concepts',
  /** An address people can write to about privacy, their data, or a problem. */
  contactEmail: 'zionnaire2018@gmail.com',
  /** For example "the laws of Nigeria". Left out of the Terms while empty. */
  governingLaw: 'the laws of Nigeria',
  /** Change when the text changes in a way people should know about. */
  updated: '17 November 2026',
} as const;

export const legalIsComplete = (): boolean => !!LEGAL.operator && !!LEGAL.contactEmail;
