'use client';

import { Input, Select } from '@/components/ui';
import { AddressForm } from './AddressForm';
import { IdentificationForm } from './IdentificationForm';
import { COUNTRIES } from '@/lib/utils/constants';
import type { UseFormRegister, FieldErrors, Control, UseFormSetValue, FieldError, FieldValues } from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';

interface AssociatedPersonFormProps {
  index: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  errors: FieldErrors<FieldValues>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  onRemove?: () => void;
}

type NestedFieldErrors = FieldErrors & {
  [key: string]: FieldError | NestedFieldErrors | undefined;
};

export function AssociatedPersonForm({
  index,
  register,
  control,
  errors,
  setValue,
  onRemove,
}: AssociatedPersonFormProps) {
  const prefix = `associated_persons.${index}`;

  const { fields: idFields, append: appendId, remove: removeId } = useFieldArray({
    control,
    name: `${prefix}.identifying_information`,
  });

  const getError = (field: string): string | undefined => {
    const personErrors = (errors as NestedFieldErrors)?.associated_persons;
    if (!personErrors || !Array.isArray(personErrors)) return undefined;
    const fieldError = (personErrors[index] as NestedFieldErrors)?.[field] as FieldError | undefined;
    return fieldError?.message;
  };

  return (
    <div className="border-2 border-gray-200 rounded-lg p-6 mb-6 bg-white">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">
          Associated Person #{index + 1}
        </h3>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 font-medium"
          >
            Remove Person
          </button>
        )}
      </div>

      {/* Personal Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Input
          label="First Name"
          required
          {...register(`${prefix}.first_name`)}
          error={getError('first_name')}
        />
        <Input
          label="Middle Name"
          {...register(`${prefix}.middle_name`)}
          error={getError('middle_name')}
        />
        <Input
          label="Last Name"
          required
          {...register(`${prefix}.last_name`)}
          error={getError('last_name')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Input
          label="Email"
          type="email"
          required
          {...register(`${prefix}.email`)}
          error={getError('email')}
        />
        <Input
          label="Phone"
          {...register(`${prefix}.phone`)}
          error={getError('phone')}
          placeholder="+12223334444"
        />
        <Input
          label="Date of Birth"
          type="date"
          required
          {...register(`${prefix}.birth_date`)}
          error={getError('birth_date')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Input
          label="Title/Position"
          {...register(`${prefix}.title`)}
          error={getError('title')}
          placeholder="e.g., CEO, CFO, Director"
        />
        <Select
          label="Nationality"
          options={COUNTRIES}
          {...register(`${prefix}.nationality`)}
        />
      </div>

      {/* Transliterated Names */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg mb-4">
        <h4 className="text-sm font-medium text-gray-600 mb-3">
          Transliterated Names (if applicable)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Transliterated First Name"
            {...register(`${prefix}.transliterated_first_name`)}
          />
          <Input
            label="Transliterated Middle Name"
            {...register(`${prefix}.transliterated_middle_name`)}
          />
          <Input
            label="Transliterated Last Name"
            {...register(`${prefix}.transliterated_last_name`)}
          />
        </div>
      </div>

      {/* Roles */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-md font-medium text-gray-700 mb-3">Roles & Ownership</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register(`${prefix}.has_ownership`)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Has Ownership (owns significant percentage)
              </span>
            </label>
            <Input
              label="Ownership Percentage"
              type="number"
              min={0}
              max={100}
              {...register(`${prefix}.ownership_percentage`, { valueAsNumber: true })}
              error={getError('ownership_percentage')}
              placeholder="0-100"
            />
          </div>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register(`${prefix}.has_control`)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Has Control (executive decision-making)
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register(`${prefix}.is_signer`)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Is Authorized Signer
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register(`${prefix}.is_director`)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Is Director
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="mb-4">
        <h4 className="text-md font-medium text-gray-700 mb-3">Residential Address</h4>
        <AddressForm
          prefix={`${prefix}.address`}
          register={register}
          errors={errors}
        />
      </div>

      {/* Identification */}
      <div className="mb-4">
        <h4 className="text-md font-medium text-gray-700 mb-3">Identification</h4>
        {idFields.map((field, idIndex) => (
          <IdentificationForm
            key={field.id}
            prefix={`${prefix}.identifying_information`}
            index={idIndex}
            register={register}
            errors={errors}
            setValue={setValue}
            onRemove={idFields.length > 1 ? () => removeId(idIndex) : undefined}
          />
        ))}
        <button
          type="button"
          onClick={() => appendId({ type: 'passport', issuing_country: 'USA' })}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          + Add Another ID
        </button>
      </div>
    </div>
  );
}
