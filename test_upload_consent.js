import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://malvemepdonlvfjjbwdz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hbHZlbWVwZG9ubHZmampid2R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyODkzODYsImV4cCI6MjA4NDg2NTM4Nn0.L-5UfqVzpQw-4v99wxOT5aSSIvVftSjktR8TCiox79Q'
);

const BUCKET = 'consentimientos';

async function run() {
  try {
    console.log('1. Logging in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@admin.com',
      password: '123456'
    });

    if (authError) {
      console.error('Sign in failed:', authError.message);
      return;
    }
    console.log('Logged in successfully!');

    // Create a dummy buffer for files
    const dummyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const dummyJpg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
    const dummyPdf = Buffer.from('%PDF-1.4 ... dummy pdf ...');

    const timestamp = Date.now();
    const dni = '12345678';

    console.log('2. Uploading signature file to storage...');
    const sigPath = `firma_${dni}_${timestamp}.png`;
    const uploadSig = await supabase.storage.from(BUCKET).upload(sigPath, dummyPng, { contentType: 'image/png' });
    console.log('Signature upload result:', uploadSig);

    console.log('3. Uploading photo file to storage...');
    const photoPath = `foto_${dni}_${timestamp}.jpg`;
    const uploadPhoto = await supabase.storage.from(BUCKET).upload(photoPath, dummyJpg, { contentType: 'image/jpeg' });
    console.log('Photo upload result:', uploadPhoto);

    console.log('4. Uploading PDF file to storage...');
    const pdfPath = `consentimiento_${dni}_${timestamp}.pdf`;
    const uploadPdf = await supabase.storage.from(BUCKET).upload(pdfPath, dummyPdf, { contentType: 'application/pdf' });
    console.log('PDF upload result:', uploadPdf);

    const sigUrl = supabase.storage.from(BUCKET).getPublicUrl(sigPath).data.publicUrl;
    const photoUrl = supabase.storage.from(BUCKET).getPublicUrl(photoPath).data.publicUrl;
    const pdfUrlData = supabase.storage.from(BUCKET).getPublicUrl(pdfPath).data.publicUrl;

    console.log('5. Inserting record into consentimientos table...');
    const { data: insertData, error: insertError } = await supabase
      .from('consentimientos')
      .insert({
        dni,
        nombre_completo: 'Test User',
        cargo: 'Test Cargo',
        empresa: 'PESQUERA EXALMAR S.A.A.',
        firma_url: sigUrl,
        foto_url: photoUrl,
        pdf_url: pdfUrlData,
        testigo_email: 'admin@admin.com',
        ip_address: '127.0.0.1',
        metadata: { 
          timestamp,
          user_agent: 'Node.js Test'
        }
      })
      .select();

    if (insertError) {
      console.error('Insert error:', insertError.message);
    } else {
      console.log('Insert success:', insertData);
    }

    console.log('Flow complete!');
  } catch (err) {
    console.error('Uncaught error in test script:', err);
  }
}

run();
