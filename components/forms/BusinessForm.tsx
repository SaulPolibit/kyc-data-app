'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input, Select, Button, FileUpload } from '@/components/ui';
import { AddressForm } from './AddressForm';
import { IdentificationForm } from './IdentificationForm';
import { AssociatedPersonForm } from './AssociatedPersonForm';
import { businessSchema, type BusinessFormData } from '@/lib/validations/business';
import {
  BUSINESS_TYPES,
  BUSINESS_ACCOUNT_PURPOSE_OPTIONS,
  BUSINESS_SOURCE_OF_FUNDS_OPTIONS,
  ESTIMATED_ANNUAL_REVENUE_OPTIONS,
  HIGH_RISK_ACTIVITIES_OPTIONS,
} from '@/lib/utils/constants';

interface BusinessFormProps {
  onSubmit: (data: BusinessFormData) => Promise<void>;
  isLoading?: boolean;
}

export function BusinessForm({ onSubmit, isLoading }: BusinessFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      type: 'business',
      identifying_information: [{ type: 'ein', issuing_country: 'USA' }],
      registered_address: { country: 'USA' },
      physical_address: { country: 'USA' },
      associated_persons: [{
        first_name: '',
        last_name: '',
        email: '',
        birth_date: '',
        has_ownership: false,
        has_control: true,
        is_signer: true,
        address: { street_line_1: '', city: '', postal_code: '', country: 'USA' },
        identifying_information: [{ type: 'passport', issuing_country: 'USA' }],
      }],
    },
  });

  const { fields: idFields, append: appendId, remove: removeId } = useFieldArray({
    control,
    name: 'identifying_information',
  });

  const { fields: personFields, append: appendPerson, remove: removePerson } = useFieldArray({
    control,
    name: 'associated_persons',
  });

  const accountPurpose = watch('business_account_purpose');
  const conductMoneyServices = watch('conducts_money_services');

  const handleFormSubmit = async (data: BusinessFormData) => {
    await onSubmit(data);
  };

  const handleDocumentSelect = (_file: File, base64: string) => {
    console.log('Document selected:', base64.substring(0, 50) + '...');
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Business Information */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
          Business Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Legal Business Name"
            required
            {...register('business_legal_name')}
            error={errors.business_legal_name?.message}
          />
          <Input
            label="Trade Name / DBA"
            {...register('business_trade_name')}
            error={errors.business_trade_name?.message}
          />
          <Select
            label="Business Type"
            required
            options={BUSINESS_TYPES}
            {...register('business_type')}
            error={errors.business_type?.message}
          />
          <Input
            label="Primary Website"
            {...register('primary_website')}
            error={errors.primary_website?.message}
            placeholder="https://example.com"
          />
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
          <div className="md:col-span-2">
            <Input
              label="Business Description"
              {...register('business_description')}
              error={errors.business_description?.message}
              placeholder="Describe your business activities"
            />
          </div>
        </div>

        {/* Transliterated Names */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-600 mb-3">
            Transliterated Names (if applicable)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Transliterated Legal Name"
              {...register('transliterated_business_legal_name')}
            />
            <Input
              label="Transliterated Trade Name"
              {...register('transliterated_business_trade_name')}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('is_dao')}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              This is a DAO (Decentralized Autonomous Organization)
            </span>
          </label>
        </div>
      </section>

      {/* Addresses */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
          Business Addresses
        </h2>
        <AddressForm
          prefix="registered_address"
          register={register as Parameters<typeof AddressForm>[0]['register']}
          errors={errors}
          title="Registered Address"
        />
        <AddressForm
          prefix="physical_address"
          register={register as Parameters<typeof AddressForm>[0]['register']}
          errors={errors}
          title="Physical Address"
        />
      </section>

      {/* Financial Profile */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
          Financial Profile
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Estimated Annual Revenue"
            options={ESTIMATED_ANNUAL_REVENUE_OPTIONS}
            {...register('estimated_annual_revenue_usd')}
            error={errors.estimated_annual_revenue_usd?.message}
          />
          <Input
            label="Expected Monthly Payments (USD)"
            type="number"
            {...register('business_expected_monthly_payments_usd', { valueAsNumber: true })}
            error={errors.business_expected_monthly_payments_usd?.message}
          />
          <Select
            label="Source of Funds"
            options={BUSINESS_SOURCE_OF_FUNDS_OPTIONS}
            {...register('business_source_of_funds')}
            error={errors.business_source_of_funds?.message}
          />
          <Input
            label="Source of Funds Description"
            {...register('business_source_of_funds_description')}
          />
          <Select
            label="Account Purpose"
            options={BUSINESS_ACCOUNT_PURPOSE_OPTIONS}
            {...register('business_account_purpose')}
            error={errors.business_account_purpose?.message}
          />
          {accountPurpose === 'other' && (
            <Input
              label="Specify Account Purpose"
              required
              {...register('business_account_purpose_other')}
              error={errors.business_account_purpose_other?.message}
            />
          )}
        </div>
      </section>

      {/* Risk Profile */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
          Risk & Compliance
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            High Risk Activities
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {HIGH_RISK_ACTIVITIES_OPTIONS.map((activity) => (
              <label key={activity.value} className="flex items-center">
                <input
                  type="checkbox"
                  value={activity.value}
                  {...register('high_risk_activities')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{activity.label}</span>
              </label>
            ))}
          </div>
        </div>

        <Input
          label="High Risk Activities Explanation"
          {...register('high_risk_activities_explanation')}
          placeholder="Explain if any high-risk activities apply"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('conducts_money_services')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Conducts Money Services
              </span>
            </label>
            {conductMoneyServices && (
              <>
                <label className="flex items-center ml-6">
                  <input
                    type="checkbox"
                    {...register('conducts_money_services_using_bridge')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Using Bridge for money services
                  </span>
                </label>
                <Input
                  label="Money Services Description"
                  {...register('conducts_money_services_description')}
                />
              </>
            )}
          </div>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('business_acting_as_intermediary')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Acting as Intermediary
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('operates_in_prohibited_countries')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Operates in Prohibited Countries
              </span>
            </label>
          </div>
        </div>

        <Input
          label="Compliance Screening Explanation"
          {...register('compliance_screening_explanation')}
          placeholder="Describe your AML/compliance controls"
          className="mt-4"
        />
      </section>

      {/* Business Identification */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
          Business Identification
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
            showImages={false}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => appendId({ type: 'ein', issuing_country: 'USA' })}
        >
          + Add Another Business ID
        </Button>
      </section>

      {/* Associated Persons */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
          Associated Persons (Beneficial Owners, Control Persons, Signers)
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          At least one person with control and one authorized signer is required.
        </p>

        {errors.associated_persons?.message && (
          <p className="text-red-500 text-sm mb-4">{errors.associated_persons.message}</p>
        )}

        {personFields.map((field, index) => (
          <AssociatedPersonForm
            key={field.id}
            index={index}
            register={register as Parameters<typeof AssociatedPersonForm>[0]['register']}
            control={control as Parameters<typeof AssociatedPersonForm>[0]['control']}
            errors={errors}
            setValue={setValue as Parameters<typeof AssociatedPersonForm>[0]['setValue']}
            onRemove={personFields.length > 1 ? () => removePerson(index) : undefined}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => appendPerson({
            first_name: '',
            last_name: '',
            email: '',
            birth_date: '',
            has_ownership: false,
            has_control: false,
            is_signer: false,
            address: { street_line_1: '', city: '', postal_code: '', country: 'USA' },
            identifying_information: [{ type: 'passport', issuing_country: 'USA' }],
          })}
        >
          + Add Another Associated Person
        </Button>
      </section>

      {/* Business Documents */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
          Business Documents (Optional)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FileUpload
            label="Business Formation Documents"
            isDocument
            onFileSelect={handleDocumentSelect}
          />
          <FileUpload
            label="Ownership Chart"
            isDocument
            onFileSelect={handleDocumentSelect}
          />
          <FileUpload
            label="Evidence of Good Standing"
            isDocument
            onFileSelect={handleDocumentSelect}
          />
          <FileUpload
            label="Proof of Business Address"
            isDocument
            onFileSelect={handleDocumentSelect}
          />
        </div>
      </section>

      {/* Submit */}
      <div className="flex justify-end pt-6 border-t">
        <Button type="submit" size="lg" isLoading={isLoading}>
          Save Business KYB Data
        </Button>
      </div>
    </form>
  );
}
