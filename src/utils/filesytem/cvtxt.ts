import axios from 'axios';
import pdf from 'pdf-parse';

export async function fetchCVTextFromDrive(shareLink: string): Promise<string> {
  try {
    const fileId = shareLink.match(/[-\w]{25,}/)?.[0];
    if (!fileId) return '';

    // PDF export link
    const pdfUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
    const data = await pdf(response.data);
    return data.text;
  } catch (error) {
    console.error('Error fetching CV text:')
    return '';
  }
}
