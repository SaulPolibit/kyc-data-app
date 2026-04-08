'use client';

import { Input, Select } from '@/components/ui';
import { COUNTRIES } from '@/lib/utils/constants';
import type { UseFormRegister, FieldErrors, FieldError, FieldValues } from 'react-hook-form';

interface AddressFormProps {
  prefix: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  errors: FieldErrors<FieldValues>;
  title?: string;
}

type NestedFieldErrors = FieldErrors & {
  [key: string]: FieldError | NestedFieldErrors | undefined;
};

export function AddressForm({ prefix, register, errors, title }: AddressFormProps) {
  const getError = (field: string): string | undefined => {
    const parts = prefix.split('.');
    let current: NestedFieldErrors = errors as NestedFieldErrors;
    for (const part of parts) {
      if (!current[part]) return undefined;
      current = current[part] as NestedFieldErrors;
    }
    const fieldError = current?.[field] as FieldError | undefined;
    return fieldError?.message;
  };

  return (
    <div className="border rounded-lg p-4 mb-4 bg-gray-50">
      {title && <h3 className="text-lg font-medium mb-4 text-gray-800">{title}</h3>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Input
            label="Street Address"
            required
            {...register(`${prefix}.street_line_1`)}
            error={getError('street_line_1')}
            placeholder="123 Main Street"
          />
        </div>
        <div className="md:col-span-2">
          <Input
            label="Street Address Line 2"
            {...register(`${prefix}.street_line_2`)}
            error={getError('street_line_2')}
            placeholder="Apt, Suite, Unit, etc. (optional)"
          />
        </div>
        <Input
          label="City"
          required
          {...register(`${prefix}.city`)}
          error={getError('city')}
        />
        <Input
          label="State/Province/Subdivision"
          {...register(`${prefix}.subdivision`)}
          error={getError('subdivision')}
          placeholder="e.g., CA, TX, ON"
        />
        <Input
          label="Postal Code"
          required
          {...register(`${prefix}.postal_code`)}
          error={getError('postal_code')}
        />
        <Select
          label="Country"
          required
          options={COUNTRIES}
          {...register(`${prefix}.country`)}
          error={getError('country')}
        />
      </div>
    </div>
  );
}
