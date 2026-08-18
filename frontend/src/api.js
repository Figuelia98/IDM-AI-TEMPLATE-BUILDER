async function parseError(response) {
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return data.detail || data.message || text;
  } catch {
    return text || response.statusText;
  }
}

async function request(path, options = {}) {
  const response = await fetch(path, options);
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response;
}

export function getHealth() {
  return request('/api/health');
}

export function getDocument() {
  return request('/api/document');
}

export function uploadFiles(structureFile, templateFile) {
  const form = new FormData();
  form.append('structure_xml', structureFile);
  form.append('template', templateFile);
  return request('/api/upload', { method: 'POST', body: form });
}

export function loadSamples() {
  return request('/api/load-samples', { method: 'POST' });
}

export function updateField(xpath, value) {
  return request('/api/fields', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xpath, value }),
  });
}

export function aiEdit(instruction) {
  return request('/api/ai-edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instruction }),
  });
}

export function undoEdit() {
  return request('/api/undo', { method: 'POST' });
}

export async function getPreviewPdf() {
  const response = await request('/api/preview/pdf');
  return response.blob();
}

export async function getTemplatePdf() {
  const response = await request('/api/template/pdf');
  return response.blob();
}

export async function downloadExport(kind) {
  const path = kind === 'docx' ? '/api/export/docx' : '/api/export/xml';
  const response = await request(path);
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || (kind === 'docx' ? 'document.docx' : 'document.xml');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
