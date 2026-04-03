import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabase';

const BUCKET = 'consentimientos';

export const consentService = {
  /**
   * Genera un PDF profesional con los datos, firma y foto.
   */
  async generatePDF(data, signatureBase64, photoBase64) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    // 1. Header con Logo (si está disponible, sino texto premium)
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text('MONITOR PRO®', margin, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text('Vigilancia de Salud Ocupacional', margin, 32);
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.line(margin, 38, pageWidth - margin, 38);

    // 2. Título de Documento
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('CONSENTIMIENTO INFORMADO', pageWidth / 2, 55, { align: 'center' });

    // 3. Datos del Colaborador
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL COLABORADOR:', margin, 70);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const details = [
      `Nombre: ${data.nombre} ${data.apellidos}`,
      `DNI: ${data.dni}`,
      `Cargo: ${data.cargo || 'No especificado'}`,
      `Empresa: ${data.empresa || 'No especificada'}`,
      `Fecha: ${new Date().toLocaleDateString()}`
    ];
    
    let y = 78;
    details.forEach(line => {
      doc.text(line, margin, y);
      y += 7;
    });

    // 4. Cuerpo de Consentimiento
    doc.setFont('helvetica', 'bold');
    doc.text('DECLARACIÓN:', margin, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const legalText = [
      'Declaro haber sido informado de manera clara y suficiente que mis datos personales y datos sensibles relacionados con mi salud ocupacional serán recopilados y tratados por la empresa responsable del sistema MONITOR PRO®, con la finalidad de gestionar la vigilancia de salud ocupacional y cumplir obligaciones legales en materia de seguridad y salud en el trabajo.',
      '',
      'Autorizo expresamente el tratamiento de datos de identificación, datos laborales, resultados de exámenes médicos y descansos médicos.',
      '',
      'Declaro conocer que puedo ejercer mis derechos de acceso, rectificación, cancelación y oposición (ARCO).'
    ];

    const splitText = doc.splitTextToSize(legalText.join('\n'), pageWidth - (margin * 2));
    doc.text(splitText, margin, y + 18);
    
    // 5. Evidencias Digitales
    const evidenceY = y + 75;
    
    // Firma
    if (signatureBase64 && signatureBase64.startsWith('data:image')) {
      doc.setFont('helvetica', 'bold');
      doc.text('FIRMA BIOMÉTRICA:', margin, evidenceY);
      try {
        doc.addImage(signatureBase64, 'PNG', margin, evidenceY + 5, 60, 30);
      } catch (e) {
        console.error('Error al añadir firma al PDF:', e);
      }
      doc.line(margin, evidenceY + 35, margin + 60, evidenceY + 35);
      doc.setFontSize(8);
      doc.text('Firma Digital del Colaborador', margin, evidenceY + 40);
    }

    // Foto Selfie
    if (photoBase64 && photoBase64.startsWith('data:image')) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('VALIDACIÓN DE IDENTIDAD:', pageWidth - margin - 50, evidenceY);
      
      try {
        doc.addImage(photoBase64, 'JPEG', pageWidth - margin - 50, evidenceY + 5, 50, 40);
      } catch (e) {
        console.error('Error al añadir foto al PDF:', e);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('[Error en carga de imagen]', pageWidth - margin - 50, evidenceY + 10);
      }
    }

    // 6. Pie de página con Testigo
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // Slate 400
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.text(`Documento generado electrónicamente en presencia de: ${data.testigo_email}`, margin, footerY);
    doc.text(`IP de registro: ${data.ip_address || 'CAPTURA_DIGITAL'}`, margin, footerY + 5);

    return doc.output('blob');
  },

  /**
   * Sube las evidencias y crea el registro en Supabase.
   */
  async saveConsent(data, signatureFile, photoFile, pdfBlob) {
    const timestamp = Date.now();
    const dni = data.dni;
    
    // Subir Firma
    const sigPath = `firma_${dni}_${timestamp}.png`;
    const { data: sigData } = await supabase.storage.from(BUCKET).upload(sigPath, signatureFile);
    const { data: sigUrl } = supabase.storage.from(BUCKET).getPublicUrl(sigPath);

    // Subir Foto
    const photoPath = `foto_${dni}_${timestamp}.jpg`;
    const { data: photoData } = await supabase.storage.from(BUCKET).upload(photoPath, photoFile);
    const { data: photoUrl } = supabase.storage.from(BUCKET).getPublicUrl(photoPath);

    // Subir PDF
    const pdfPath = `consentimiento_${dni}_${timestamp}.pdf`;
    const { data: pdfStoreData } = await supabase.storage.from(BUCKET).upload(pdfPath, pdfBlob);
    const { data: pdfUrlData } = supabase.storage.from(BUCKET).getPublicUrl(pdfPath);

    // Guardar en Tabla
    const { error } = await supabase.from('consentimientos').insert({
      dni,
      nombre_completo: `${data.nombre} ${data.apellidos}`,
      cargo: data.cargo,
      empresa: data.empresa,
      firma_url: sigUrl.publicUrl,
      foto_url: photoUrl.publicUrl,
      pdf_url: pdfUrlData.publicUrl,
      testigo_email: data.testigo_email,
      ip_address: data.ip_address,
      metadata: { 
        timestamp,
        user_agent: navigator.userAgent
      }
    });

    if (error) throw error;
    return pdfUrlData.publicUrl;
  },

  /**
   * Convierte Base64 a File para subir a Storage.
   */
  base64ToFile(base64, filename, mimeType) {
    const arr = base64.split(',');
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mimeType });
  },

  /**
   * Busca consentimiento por DNI.
   */
  async getConsentByDni(dni) {
    const { data, error } = await supabase
      .from('consentimientos')
      .select('*')
      .eq('dni', dni)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) return null;
    return data;
  }
};
