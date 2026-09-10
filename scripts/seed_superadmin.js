/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedSuperadmin() {
  const email = 'admin@serenitypos.com';
  const password = 'SuperSecretPassword123!';

  console.log('Seeding superadmin...');

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    console.error('Error creating user:', authError.message);
    if (!authError.message.includes('already exists')) {
      return;
    }
  }

  const userId = authData?.user?.id;
  if (!userId) {
     console.log("User might already exist. Exiting.");
     return;
  }

  // 2. Create a System Store (since profiles require a store_id)
  const { data: storeData, error: storeError } = await supabase
    .from('stores')
    .insert({ nama_toko: 'SYSTEM_GLOBAL' })
    .select()
    .single();

  if (storeError) {
    console.error('Error creating store:', storeError.message);
    return;
  }

  // 3. Create Superadmin profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      store_id: storeData.id,
      role: 'SUPERADMIN',
      full_name: 'System Administrator'
    });

  if (profileError) {
    console.error('Error creating profile:', profileError.message);
    return;
  }

  console.log('Successfully created Superadmin!');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

seedSuperadmin();
