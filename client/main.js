import './styles/main.css';
import { createClient } from '@supabase/supabase-js';

// Debug Supabase configuration
console.log('Checking Supabase configuration...');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Not set');
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set');

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  document.querySelector('#content').innerHTML = `
    <div class="error-card">
      <h2>Configuration Error</h2>
      <p>Supabase environment variables are not set properly.</p>
      <p>Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly.</p>
      <p>Then click the "Connect to Supabase" button in the top right corner.</p>
    </div>
  `;
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

// Initialize the app
async function init() {
  try {
    // Check API health
    const healthResponse = await fetch('/api/health');
    if (!healthResponse.ok) {
      throw new Error(`HTTP error! status: ${healthResponse.status}`);
    }
    
    const responseText = await healthResponse.text();
    let healthData;
    try {
      healthData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse health response:', responseText);
      throw new Error('Invalid JSON response from health endpoint');
    }
    
    // Check Supabase connection
    const { data: dbHealth, error: dbError } = await supabase
      .from('content')
      .select('count(*)', { count: 'exact' })
      .limit(1)
      .single();
    
    if (dbError) {
      console.error('Supabase connection error:', dbError);
      throw new Error('Failed to connect to Supabase: ' + dbError.message);
    }
    
    document.querySelector('#content').innerHTML = `
      <div class="status-card">
        <h2>System Status</h2>
        <p>API Status: ${healthData.status}</p>
        <p>API Version: ${healthData.version}</p>
        <p>API Uptime: ${Math.floor(healthData.uptime / 60)} minutes</p>
        <p>Database Connection: ${dbError ? 'Error' : 'Active'}</p>
        <p>Content Items: ${dbHealth.count || 0}</p>
        <p class="env-status">Environment: ${import.meta.env.MODE}</p>
        <p class="supabase-status">Supabase: Connected</p>
      </div>
    `;
  } catch (error) {
    console.error('Error:', error);
    document.querySelector('#content').innerHTML = `
      <div class="error-card">
        <h2>Connection Error</h2>
        <p>Failed to connect to the API or database</p>
        <p>Error: ${error.message}</p>
        <p>Please check your API and database configuration.</p>
      </div>
    `;
  }
}