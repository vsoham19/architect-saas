const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fuqkpvvheommdwtveqct.supabase.co';
const supabaseKey = 'sb_publishable_k4Vjdh6nVX_Gwz9M_0lFCg_F-Ns8gmU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log("Testing Supabase connection...");
  console.log("URL:", supabaseUrl);
  console.log("Key prefix:", supabaseKey.substring(0, 15) + "...");
  
  try {
    const { data, error, status, statusText } = await supabase
      .from('users')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error("Error returned from Supabase:");
      console.error("Message:", error.message);
      console.error("Details:", error.details);
      console.error("Hint:", error.hint);
      console.error("Status Code:", status);
      console.error("Status Text:", statusText);
    } else {
      console.log("Success! Data retrieved successfully:");
      console.log(data);
    }
  } catch (err) {
    console.error("Thrown Exception:", err);
  }
}

runTest();
