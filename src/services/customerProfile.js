import { supabase } from './supabaseClient.js';
import { normalizePhonePH } from './customerAuth.js';

// Returns the customer shape the UI already uses, or null if this login has no profile yet.
export async function loadMyCustomer() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name, email, phone, customer_addresses(street, barangay, city, landmark, is_default)')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const addresses = data.customer_addresses ?? [];
  const address = addresses.find((a) => a.is_default) ?? addresses[0] ?? {};
  return {
    id: data.id,
    email: data.email,
    phone: data.phone,
    fullName: data.full_name,
    address: {
      street: address.street ?? '',
      barangay: address.barangay ?? '',
      city: address.city ?? 'Quezon City',
      landmark: address.landmark ?? '',
    },
  };
}

// First login: create the customer row and a default address.
// The database overwrites "email" with the verified login email, so it cannot be faked.
// "phone" is a contact number typed by the customer; it is not verified.
export async function createMyCustomer({ fullName, phone, address }) {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error('You are not logged in.');
  const contactPhone = normalizePhonePH(phone);
  if (!contactPhone) throw new Error('Enter a valid mobile number starting with 09.');

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({ auth_user_id: user.id, full_name: fullName, email: user.email, phone: contactPhone })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  const { error: addressError } = await supabase.from('customer_addresses').insert({
    customer_id: customer.id,
    label: 'Home',
    street: address.street,
    barangay: address.barangay,
    city: address.city || 'Quezon City',
    landmark: address.landmark || null,
    is_default: true,
  });
  if (addressError) throw new Error(addressError.message);
  return loadMyCustomer();
}