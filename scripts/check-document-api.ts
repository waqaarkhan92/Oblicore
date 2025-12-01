/**
 * Check last document status via API
 * Run this from the browser console or use curl
 */

// This script can be run in browser console or adapted for curl

const API_BASE = '/api/v1';

async function checkLastDocument() {
  // First, get list of documents
  const docsResponse = await fetch(`${API_BASE}/documents?limit=1&sort=-created_at`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
    },
  });
  
  const docsData = await docsResponse.json();
  console.log('📄 Documents response:', docsData);
  
  if (!docsData.data || docsData.data.length === 0) {
    console.log('❌ No documents found');
    return;
  }
  
  const doc = docsData.data[0];
  console.log('\n📄 LAST DOCUMENT:');
  console.log(`   ID: ${doc.id}`);
  console.log(`   Title: ${doc.title}`);
  console.log(`   Status: ${doc.extraction_status}`);
  console.log(`   Created: ${doc.created_at}`);
  console.log(`   Updated: ${doc.updated_at}`);
  
  // Check extraction status
  const statusResponse = await fetch(`${API_BASE}/documents/${doc.id}/extraction-status`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
    },
  });
  
  const statusData = await statusResponse.json();
  console.log('\n📊 EXTRACTION STATUS:');
  console.log(`   Status: ${statusData.data?.status}`);
  console.log(`   Progress: ${statusData.data?.progress}%`);
  console.log(`   Obligation Count: ${statusData.data?.obligation_count}`);
  
  // Check obligations
  const oblResponse = await fetch(`${API_BASE}/documents/${doc.id}/obligations`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
    },
  });
  
  const oblData = await oblResponse.json();
  console.log('\n📋 OBLIGATIONS:');
  console.log(`   Count: ${oblData.data?.length || 0}`);
  if (oblData.data && oblData.data.length > 0) {
    console.log('   Sample:');
    oblData.data.slice(0, 3).forEach((obl: any, i: number) => {
      console.log(`     ${i + 1}. ${obl.obligation_title || obl.id}`);
    });
  } else {
    console.log('   ⚠️ NO OBLIGATIONS FOUND');
  }
  
  // Summary
  console.log('\n📊 SUMMARY:');
  const isCompleted = doc.extraction_status === 'COMPLETED';
  const hasObligations = (oblData.data?.length || 0) > 0;
  const isProcessing = doc.extraction_status === 'PROCESSING';
  
  console.log(`   Extraction Status: ${doc.extraction_status}`);
  console.log(`   Progress: ${statusData.data?.progress}%`);
  console.log(`   Has Obligations: ${hasObligations ? 'YES' : 'NO'} (${oblData.data?.length || 0})`);
  console.log(`   Is Completed: ${isCompleted ? 'YES' : 'NO'}`);
  console.log(`   Is Processing: ${isProcessing ? 'YES' : 'NO'}`);
  
  if (isCompleted && !hasObligations) {
    console.log('\n   ⚠️ WARNING: Extraction marked as COMPLETED but no obligations found!');
  }
  
  if (isProcessing && statusData.data?.progress && statusData.data.progress < 20) {
    const createdAt = new Date(doc.created_at);
    const minutesAgo = Math.floor((Date.now() - createdAt.getTime()) / 1000 / 60);
    if (minutesAgo > 5) {
      console.log(`\n   ⚠️ WARNING: Document has been PROCESSING for ${minutesAgo} minutes!`);
      console.log('   → Check if worker is running: npm run worker');
    }
  }
}

// For browser console
if (typeof window !== 'undefined') {
  (window as any).checkLastDocument = checkLastDocument;
  console.log('Run checkLastDocument() in console');
}

export { checkLastDocument };

