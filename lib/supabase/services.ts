import { createClient } from './client';
import type { Customer, Address, IdentifyingInformation, Document, AssociatedPerson } from '@/types/database';

const supabase = createClient();

// Customer operations
export async function createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomer(id: string, customer: Partial<Customer>) {
  const { data, error } = await supabase
    .from('customers')
    .update(customer)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCustomer(id: string) {
  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      addresses (*),
      identifying_information (*),
      documents (*),
      associated_persons (
        *,
        associated_person_addresses (*),
        identifying_information (*),
        documents (*)
      ),
      publicly_traded_listings (*),
      regulated_activities (*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getAllCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function deleteCustomer(id: string) {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Address operations
export async function upsertAddress(address: Address) {
  const { data, error } = await supabase
    .from('addresses')
    .upsert(address, { onConflict: 'customer_id,address_type,is_transliterated' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createAddress(address: Address) {
  const { data, error } = await supabase
    .from('addresses')
    .insert(address)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Identifying information operations
export async function createIdentifyingInfo(info: IdentifyingInformation) {
  const { data, error } = await supabase
    .from('identifying_information')
    .insert(info)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCustomerIdentifyingInfo(customerId: string) {
  const { error } = await supabase
    .from('identifying_information')
    .delete()
    .eq('customer_id', customerId);

  if (error) throw error;
}

// Document operations
export async function createDocument(doc: Omit<Document, 'id'>) {
  const { data, error } = await supabase
    .from('documents')
    .insert(doc)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getDocumentsForCustomer(customerId: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('customer_id', customerId);

  if (error) throw error;
  return data;
}

// Cleanup after successful Bridge submission
export async function markDocumentsAsSubmitted(customerId: string) {
  const { error } = await supabase
    .from('documents')
    .update({
      base64_data_encrypted: null,
      submitted_to_bridge: true,
      submitted_at: new Date().toISOString(),
    })
    .eq('customer_id', customerId)
    .eq('submitted_to_bridge', false);

  if (error) throw error;
}

// Cleanup identifying information images after Bridge submission
export async function cleanupIdentifyingInfoImages(customerId: string) {
  const { error } = await supabase
    .from('identifying_information')
    .update({
      image_front_encrypted: null,
      image_back_encrypted: null,
    })
    .eq('customer_id', customerId);

  if (error) throw error;
}

// Associated persons operations
export async function createAssociatedPerson(
  person: Omit<AssociatedPerson, 'id' | 'created_at' | 'updated_at'>
) {
  const { address, transliterated_address, identifying_information, documents, ...personData } = person;

  // Create associated person
  const { data: personRecord, error: personError } = await supabase
    .from('associated_persons')
    .insert(personData)
    .select()
    .single();

  if (personError) throw personError;

  // Create address
  if (address) {
    const { error: addressError } = await supabase
      .from('associated_person_addresses')
      .insert({
        associated_person_id: personRecord.id,
        is_transliterated: false,
        ...address,
      });

    if (addressError) throw addressError;
  }

  // Create transliterated address if provided
  if (transliterated_address) {
    const { error: transAddressError } = await supabase
      .from('associated_person_addresses')
      .insert({
        associated_person_id: personRecord.id,
        is_transliterated: true,
        ...transliterated_address,
      });

    if (transAddressError) throw transAddressError;
  }

  // Create identifying information
  if (identifying_information?.length) {
    const { error: idError } = await supabase
      .from('identifying_information')
      .insert(
        identifying_information.map(info => ({
          ...info,
          associated_person_id: personRecord.id,
        }))
      );

    if (idError) throw idError;
  }

  return personRecord;
}

export async function deleteAssociatedPersons(customerId: string) {
  const { error } = await supabase
    .from('associated_persons')
    .delete()
    .eq('customer_id', customerId);

  if (error) throw error;
}

// Full customer creation with all related data
export async function createFullCustomer(
  customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>,
  addresses: Address[],
  identifyingInfo: IdentifyingInformation[],
  associatedPersons?: Omit<AssociatedPerson, 'id' | 'created_at' | 'updated_at'>[]
) {
  // Create customer
  const customer = await createCustomer({
    ...customerData,
    status: 'draft',
  });

  // Create addresses
  for (const address of addresses) {
    await createAddress({
      ...address,
      customer_id: customer.id,
    });
  }

  // Create identifying information
  for (const info of identifyingInfo) {
    await createIdentifyingInfo({
      ...info,
      customer_id: customer.id,
    });
  }

  // Create associated persons (for business)
  if (associatedPersons?.length) {
    for (const person of associatedPersons) {
      await createAssociatedPerson({
        ...person,
        customer_id: customer.id,
      });
    }
  }

  // Return full customer data
  return getCustomer(customer.id);
}

// Update customer status
export async function updateCustomerStatus(id: string, status: Customer['status']) {
  return updateCustomer(id, { status });
}

// Mark customer as submitted
export async function markCustomerAsSubmitted(id: string) {
  return updateCustomer(id, {
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  });
}
