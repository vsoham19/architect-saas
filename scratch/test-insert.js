const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fuqkpvvheommdwtveqct.supabase.co';
const supabaseKey = 'sb_publishable_k4Vjdh6nVX_Gwz9M_0lFCg_F-Ns8gmU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log("Testing insert into Supabase...");
  
  const newUser = {
    id: '00000000-0000-0000-0000-000000000009',
    email: 'sarah.jenkins@spatialdesign.com',
    full_name: 'Sarah Jenkins',
    system_role: 'principal',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
  };

  try {
    const { data, error, status, statusText } = await supabase
      .from('users')
      .insert(newUser)
      .select();
      
    if (error) {
      console.error("Insert Error:");
      console.error("Message:", error.message);
      console.error("Details:", error.details);
      console.error("Hint:", error.hint);
      console.error("Status:", status);
    } else {
      console.log("Success! User inserted successfully:");
      console.log(data);
    }
  } catch (err) {
    console.error("Exception thrown:", err);
  }
}

runTest();
