/**
 * Sends a Buffer to the client as a downloadable file.
 */
export const sendBufferAsFile = (res, buffer, filename, mimeType = 'application/octet-stream') => {
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.end(buffer);
};

export const MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  zip: 'application/zip',
  png: 'image/png',
  jpg: 'image/jpeg',
  txt: 'text/plain; charset=utf-8',
  json: 'application/json',
};

export default sendBufferAsFile;
