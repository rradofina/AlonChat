/**
 * Supabase Database Diagnostic Tool
 * Run this in browser console at http://localhost:3000
 */

async function debugSupabaseDatabase() {
  console.log('🔍 SUPABASE DATABASE DIAGNOSTIC');
  console.log('================================');
  
  try {
    // Import supabase client
    const { supabase } = await import('./lib/supabase/client.js');
    
    console.log('✅ Supabase client imported successfully');
    
    // 1. Check if app_settings table exists and what's in it
    console.log('\n📋 CHECKING APP_SETTINGS TABLE:');
    const { data: allSettings, error: selectError } = await supabase
      .from('app_settings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (selectError) {
      console.error('❌ Error reading app_settings:', selectError);
      console.error('❌ Error details:', JSON.stringify(selectError, null, 2));
    } else {
      console.log('📊 All app_settings records:', allSettings);
      console.log('📊 Total records found:', allSettings?.length || 0);
      
      // Filter for template_folder_id specifically
      const templateFolderRecords = allSettings?.filter(record => record.key === 'template_folder_id') || [];
      console.log('📁 template_folder_id records:', templateFolderRecords);
    }
    
    // 2. Test delete operation
    console.log('\n🗑️ TESTING DELETE OPERATION:');
    const { error: deleteError, count: deleteCount } = await supabase
      .from('app_settings')
      .delete()
      .eq('key', 'template_folder_id_test')
      .select();
    
    console.log('🗑️ Test delete result - error:', deleteError, 'count:', deleteCount);
    
    // 3. Test insert operation  
    console.log('\n💾 TESTING INSERT OPERATION:');
    const testValue = 'test_' + Date.now();
    const { data: insertData, error: insertError } = await supabase
      .from('app_settings')
      .insert({
        key: 'template_folder_id_test',
        value: testValue,
        description: 'Test record for debugging'
      })
      .select()
      .single();
    
    console.log('💾 Test insert result - data:', insertData, 'error:', insertError);
    
    // 4. Test immediate read after insert
    console.log('\n🔍 TESTING IMMEDIATE READ:');
    const { data: readData, error: readError } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'template_folder_id_test');
    
    console.log('🔍 Immediate read result - data:', readData, 'error:', readError);
    
    // 5. Clean up test record
    console.log('\n🧹 CLEANING UP TEST RECORD:');
    const { error: cleanupError } = await supabase
      .from('app_settings')
      .delete()
      .eq('key', 'template_folder_id_test');
    
    console.log('🧹 Cleanup result - error:', cleanupError);
    
    // 6. Check RLS policies
    console.log('\n🔐 CHECKING TABLE PERMISSIONS:');
    console.log('ℹ️ If operations fail, check Row Level Security (RLS) policies in Supabase dashboard');
    console.log('ℹ️ Go to: Authentication → Policies → app_settings table');
    
    console.log('\n✅ DIAGNOSTIC COMPLETE');
    console.log('================================');
    
  } catch (error) {
    console.error('❌ Fatal error in diagnostic:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
  }
}

// Run the diagnostic
debugSupabaseDatabase();