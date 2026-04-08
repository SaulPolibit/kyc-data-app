'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input, Select, Button, FileUpload } from '@/components/ui';
import { AddressForm } from './AddressForm';
import { IdentificationForm } from './IdentificationForm';
import { individualSchema, type IndividualFormData } from '@/lib/validations/individual';
import {
  COUNTRIES,
  EMPLOYMENT_STATUS_OPTIONS,
  INDIVIDUAL_ACCOUNT_PURPOSE_OPTIONS,
  INDIVIDUAL_SOURCE_OF_FUNDS_OPTIONS,
  EXPECTED_MONTHLY_PAYMENTS_OPTIONS,
} from '@/lib/utils/constants';

interface IndividualFormProps {
  onSubmit: (data: IndividualFormData) => Promise<void>;
  isLoading?: boolean;
}

export function IndividualForm({ onSubmit, isLoading }: IndividualFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<IndividualFormData>({
    resolver: zodResolver(individualSchema),
    defaultValues: {
      type: 'individual',
      identifying_information: [{ type: 'passport', issuing_country: 'USA' }],
      residential_address: { country: 'USA' },
    },
  });

  const { fields: idFields, append: appendId, remove: removeId } = useFieldArray({
    control,
    name: 'identifying_information',
  });

  const accountPurpose = watch('individual_account_purpose');

  const handleFormSubmit = async (data: IndividualFormData) => {
    await onSubmit(data);
  };

  const handleDocumentSelect = (_file: File, base64: string) => {
    console.log('Document selected:', base64.substring(0, 50) + '...');
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Personal Information */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
          Personal Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="First Name"
            required
            {...register('first_name')}
            error={errors.first_name?.message}
          />
          <Input
            label="Middle Name"
            {...register('middle_name')}
            error={errors.middle_name?.message}
          />
          <Input
            label="Last Name"
            required
            {...register('last_name')}
            error={errors.last_name?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Input
            label="Email"
            type="email"
            required
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="Phone"
            {...register('phone')}
            error={errors.phone?.message}
            placeholder="+12223334444"
          />
          <Input
            label="Date of Birth"
            type="date"
            required
            {...register('birth_date')}
            error={errors.birth_date?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Select
            label="Nationality"
            options={COUNTRIES}
            {...register('nationality')}
            error={errors.nationality?.message}
          />
        </div>

        {/* Transliterated Names (Optional) */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-600 mb-3">
            Transliterated Names (if applicable)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Transliterated First Name"
              {...register('transliterated_first_name')}
              error={errors.transliterated_first_name?.message}
            />
            <Input
              label="Transliterated Middle Name"
              {...register('transliterated_middle_name')}
              error={errors.transliterated_middle_name?.message}
            />
            <Input
              label="Transliterated Last Name"
              {...register('transliterated_last_name')}
              error={errors.transliterated_last_name?.message}
            />
          </div>
        </div>
      </section>

      {/* Residential Address */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
          Residential Address
        </h2>
        <AddressForm
          prefix="residential_address"
          register={register as Parameters<typeof AddressForm>[0]['register']}
          errors={errors}
        />
      </section>

      {/* Risk Profile */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
          Account Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Account Purpose"
            options={INDIVIDUAL_ACCOUNT_PURPOSE_OPTIONS}
            {...register('individual_account_purpose')}
            error={errors.individual_account_purpose?.message}
          />
          {accountPurpose === 'other' && (
            <Input
              label="Specify Account Purpose"
              required
              {...register('individual_account_purpose_other')}
              error={errors.individual_account_purpose_other?.message}
            />
          )}
          <Select
            label="Employment Status"
            options={EMPLOYMENT_STATUS_OPTIONS}
            {...register('employment_status')}
            error={errors.employment_status?.message}
          />
          <Input
            label="Most Recent Occupation"
            {...register('most_recent_occupation')}
            error={errors.most_recent_occupation?.message}
            placeholder="e.g., Software Engineer"
          />
          <Select
            label="Source of Funds"
            options={INDIVIDUAL_SOURCE_OF_FUNDS_OPTIONS}
            {...register('individual_source_of_funds')}
            error={errors.individual_source_of_funds?.message}
          />
          <Select
            label="Expected Monthly Payments"
            options={EXPECTED_MONTHLY_PAYMENTS_OPTIONS}
            {...register('individual_expected_monthly_payments')}
            error={errors.individual_expected_monthly_payments?.message}
          />
        </div>

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('individual_acting_as_intermediary')}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Acting as intermediary (handling funds on behalf of others)
            </span>
          </label>
        </div>
      </section>

      {/* Identification */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
          Identification Documents
        </h2>
        {errors.identifying_information?.message && (
          <p className="text-red-500 text-sm mb-4">{errors.identifying_information.message}</p>
        )}

        {idFields.map((field, index) => (
          <IdentificationForm
            key={field.id}
            prefix="identifying_information"
            index={index}
            register={register as Parameters<typeof IdentificationForm>[0]['register']}
            errors={errors}
            setValue={setValue as Parameters<typeof IdentificationForm>[0]['setValue']}
            onRemove={idFields.length > 1 ? () => removeId(index) : undefined}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => appendId({ type: 'passport', issuing_country: 'USA' })}
        >
          + Add Another ID
        </Button>
      </section>

      {/* Supporting Documents */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
          Supporting Documents (Optional)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FileUpload
            label="Proof of Address"
            isDocument
            onFileSelect={handleDocumentSelect}
          />
          <FileUpload
            label="Proof of Source of Funds"
            isDocument
            onFileSelect={handleDocumentSelect}
          />
        </div>
      </section>

      {/* Submit */}
      <div className="flex justify-end pt-6 border-t">
        <Button type="submit" size="lg" isLoading={isLoading}>
          Save Individual KYC Data
        </Button>
      </div>
    </form>
  );
}
