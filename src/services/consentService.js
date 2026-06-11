import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabase';

const BUCKET = 'consentimientos';

export const consentService = {
  /**
   * Genera un PDF profesional con los datos, firma y foto.
   */
  /**
   * Genera un PDF profesional con los datos, firma y foto.
   */
  async generatePDF(data, signatureBase64, photoBase64, logoUrl) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // --- WATERMARK (Logo Vitacorp Centrado y Tenue) ---
    if (logoUrl) {
      try {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.1 }));
        const wmWidth = pageWidth / 2;
        const wmHeight = wmWidth * 0.8; // Reducción de altura del 20%
        doc.addImage(logoUrl, 'PNG', (pageWidth - wmWidth) / 2, pageHeight / 3, wmWidth, wmHeight);
        doc.restoreGraphicsState();
      } catch (e) {
        console.warn('Watermark failed, skipping...', e);
      }
    }

    // --- HEADER ---
    // Logo en la esquina superior derecha (Altura reducida 20% para armonía)
    if (logoUrl) {
      try {
        const logoWidth = 40;
        const logoHeight = logoWidth * 0.8; // Reducción de altura del 20%
        doc.addImage(logoUrl, 'PNG', pageWidth - margin - logoWidth, 12, logoWidth, logoHeight);
      } catch (e) {
        console.error('Error al añadir logo al header:', e);
      }
    }

    // Nota: Se eliminó el texto de Monitor Pro en la esquina superior izquierda a pedido del usuario.
    
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.5);
    doc.line(margin, 42, pageWidth - margin, 42);

    // --- TÍTULO DE DOCUMENTO ---
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSENTIMIENTO INFORMADO', pageWidth / 2, 58, { align: 'center' });

    // --- DATOS DEL COLABORADOR ---
    doc.setFillColor(248, 250, 252); 
    doc.rect(margin, 65, pageWidth - (margin * 2), 42, 'F');
    
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text('DATOS DEL COLABORADOR:', margin + 5, 72);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    const details = [
      `Nombre: ${(data.nombre || '').toUpperCase()} ${(data.apellidos || '').toUpperCase()}`,
      `DNI: ${data.dni}`,
      `Cargo: ${(data.cargo || 'NO ESPECIFICADO').toUpperCase()}`,
      `Empresa: ${(data.empresa || 'NO ESPECIFICADA').toUpperCase()}`,
      `Fecha de Registro: ${new Date().toLocaleDateString()}`
    ];
    
    let y = 79;
    details.forEach(line => {
      doc.text(line, margin + 5, y);
      y += 6.5;
    });

    // --- CUERPO DE CONSENTIMIENTO ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DECLARACIÓN Y AUTORIZACIÓN:', margin, y + 12);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(51, 65, 85);
    
    const legalText = [
      'Por la presente, AUTORIZO de manera voluntaria, previa e informada el tratamiento de mis datos personales y sensibles relacionados con mi salud ocupacional. Entiendo que esta información será recopilada, procesada y resguardada por el sistema MONITOR PRO®, bajo la responsabilidad de VITACORP 360.',
      '',
      'Esta autorización permite la gestión de la vigilancia médica, resultados de exámenes ocupacionales y descansos médicos, cumpliendo estrictamente con la Ley de Protección de Datos Personales y las normativas de Seguridad y Salud en el Trabajo vigentes.',
      '',
      'Declaro haber sido informado sobre mi derecho a revocar este consentimiento o ejercer mis derechos ARCO (Acceso, Rectificación, Cancelación y Oposición) en cualquier momento ante el área correspondiente.'
    ];

    const splitText = doc.splitTextToSize(legalText.join('\n'), pageWidth - (margin * 2));
    doc.text(splitText, margin, y + 20);
    
    // --- EVIDENCIAS DIGITALES (Firma y Foto) ---
    const evidenceY = y + 85;

    // Caja para firmas
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, evidenceY - 5, pageWidth - margin, evidenceY - 5);
    
    // Firma
    if (signatureBase64 && signatureBase64.startsWith('data:image')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('FIRMA BIOMÉTRICA:', margin, evidenceY + 5);
      try {
        doc.addImage(signatureBase64, 'PNG', margin, evidenceY + 10, 55, 25);
      } catch (e) {
        console.error('Error al añadir firma al PDF:', e);
      }
      doc.line(margin, evidenceY + 36, margin + 55, evidenceY + 36);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Firma Digital del Colaborador', margin, evidenceY + 41);
    }

    // Foto Selfie
    if (photoBase64 && photoBase64.startsWith('data:image')) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('VALIDACIÓN DE IDENTIDAD:', pageWidth - margin - 50, evidenceY + 5);
      
      try {
        // Marco para la foto
        doc.setDrawColor(203, 213, 225);
        doc.rect(pageWidth - margin - 50.5, evidenceY + 9.5, 51, 41);
        doc.addImage(photoBase64, 'JPEG', pageWidth - margin - 50, evidenceY + 10, 50, 40);
      } catch (e) {
        console.error('Error al añadir foto al PDF:', e);
      }
    }

    // --- PIE DE PÁGINA PROFESIONAL ---
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    const footerY = doc.internal.pageSize.getHeight() - 25;
    
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    const deviceInfo = (() => {
      const ua = navigator.userAgent;
      if (/android/i.test(ua)) return 'Dispositivo Android';
      if (/iPad|iPhone|iPod/.test(ua)) return 'Dispositivo iOS';
      if (/Windows/.test(ua)) return 'PC Windows';
      if (/Mac OS/.test(ua)) return 'Mac';
      return 'Dispositivo Web';
    })();
    const dateTime = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });

    doc.text(`Este consentimiento fue solicitado por:`, margin, footerY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(data.testigo_email, margin + 50, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Firmado electrónicamente por:`, margin, footerY + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`${(data.nombre || '').toUpperCase()} ${(data.apellidos || '').toUpperCase()}`, margin + 41, footerY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Desde: ${deviceInfo} - Fecha y hora: ${dateTime}`, margin, footerY + 9);
    
    doc.setFontSize(7);
    doc.text('MONITOR PRO® - Sistema de Vigilancia de Salud Ocupacional by VITACORP 360', margin, footerY + 15);

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
  },

  /**
   * Crea un enlace único para consentimiento remoto
   */
  async createConsentLink(dni, workerName, testigoEmail, phone) {
    const { data, error } = await supabase
      .from('consent_links')
      .insert({
        dni,
        worker_name: workerName,
        testigo_email: testigoEmail,
        phone
      })
      .select('id')
      .single();
      
    if (error) throw error;
    return data.id;
  },

  /**
   * Obtiene los datos de un enlace de consentimiento
   */
  async getConsentLink(id) {
    const { data, error } = await supabase
      .rpc('get_public_consent_link', { link_id: id });
      
    if (error) throw error;
    return data;
  },

  /**
   * Marca un enlace como firmado
   */
  async markLinkAsSigned(id, pdfUrl) {
    const { data, error } = await supabase
      .rpc('mark_public_consent_link_signed', { link_id: id, pdf_url_param: pdfUrl });
      
    if (error) throw error;
    return true;
  }
};
