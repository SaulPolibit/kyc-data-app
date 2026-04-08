'use client';

import { Input, Select, FileUpload } from '@/components/ui';
import { ID_TYPES, COUNTRIES } from '@/lib/utils/constants';
import type { UseFormRegister, FieldErrors, UseFormSetValue, FieldError, FieldValues } from 'react-hook-form';

interface IdentificationFormProps {
  prefix: string;
  index: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  errors: FieldErrors<FieldValues>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  onRemove?: () => void;
  showImages?: boolean;
}

type NestedFieldErrors = FieldErrors & {
  [key: string]: FieldError | NestedFieldErrors | undefined;
};

export function IdentificationForm({
  prefix,
  index,
  register,
  errors,
  setValue,
  onRemove,
  showImages = true
}: IdentificationFormProps) {
  const fieldPrefix = `${prefix}.${index}`;

  const getError = (field: string): string | undefined => {
    const parts = fieldPrefix.split('.');
    let current: NestedFieldErrors = errors as NestedFieldErrors;
    for (const part of parts) {
      if (!current[part]) return undefined;
      current = current[part] as NestedFieldErrors;
    }
    const fieldError = current?.[field] as FieldError | undefined;
    return fieldError?.message;
  };

  const handleFrontImageSelect = (_file: File, base64: string) => {
    setValue(`${fieldPrefix}.image_front`, base64);
  };

  const handleBackImageSelect = (_file: File, base64: string) => {
    setValue(`${fieldPrefix}.image_back`, base64);
  };

  return (
    <div className="border rounded-lg p-4 mb-4 bg-white">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-md font-medium text-gray-700">Identification #{index + 1}</h4>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="ID Type"
          required
          options={ID_TYPES}
          {...register(`${fieldPrefix}.type`)}
          error={getError('type')}
        />
        <Select
          label="Issuing Country"
          required
          options={COUNTRIES}
          {...register(`${fieldPrefix}.issuing_country`)}
          error={getError('issuing_country')}
        />
        <Input
          label="ID Number"
          {...register(`${fieldPrefix}.number`)}
          error={getError('number')}
          placeholder="Enter ID number"
        />
        <Input
          label="Expiration Date"
          type="date"
          {...register(`${fieldPrefix}.expiration`)}
          error={getError('expiration')}
        />
        <div className="md:col-span-2">
          <Input
            label="Description (required if 'Other' type)"
            {...register(`${fieldPrefix}.description`)}
            error={getError('description')}
            placeholder="Describe the ID type"
          />
        </div>
      </div>

      {showImages && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <FileUpload
            label="ID Front Image"
            accept="image/jpeg,image/png,application/pdf"
            onFileSelect={handleFrontImageSelect}
          />
          <FileUpload
            label="ID Back Image (if applicable)"
            accept="image/jpeg,image/png,application/pdf"
            onFileSelect={handleBackImageSelect}
          />
        </div>
      )}
    </div>
  );
}
