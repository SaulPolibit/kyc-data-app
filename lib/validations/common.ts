import { z } from 'zod';

export const addressSchema = z.object({
  street_line_1: z.string().min(4, 'Street address must be at least 4 characters').max(1024),
  street_line_2: z.string().max(1024).optional(),
  city: z.string().min(1, 'City is required').max(255),
  subdivision: z.string().max(3).optional(),
  postal_code: z.string().min(1, 'Postal code is required').max(50),
  country: z.string().length(3, 'Country must be 3-letter ISO code'),
});

export const identifyingInfoSchema = z.object({
  type: z.enum([
    'ssn', 'itin', 'ein', 'sin', 'bn', 'rfc', 'curp', 'cpf', 'cnpj',
    'cuit', 'rut', 'nif', 'nie', 'cif', 'codice_fiscale', 'partita_iva',
    'siret', 'siren', 'tin', 'ust_idnr', 'nino', 'utr', 'crn',
    'abn', 'acn', 'tfn', 'ird', 'nzbn', 'pan', 'gstin', 'cin',
    'uen', 'nric', 'fin', 'hkid', 'brn',
    'national_id', 'passport', 'drivers_license', 'vat', 'other'
  ]),
  issuing_country: z.string().length(3, 'Country must be 3-letter ISO code'),
  number: z.string().optional(),
  description: z.string().max(1024).optional(),
  expiration: z.string().optional(),
});

export type AddressFormData = z.infer<typeof addressSchema>;
export type IdentifyingInfoFormData = z.infer<typeof identifyingInfoSchema>;
