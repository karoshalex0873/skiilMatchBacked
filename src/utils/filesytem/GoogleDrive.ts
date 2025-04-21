import { google } from 'googleapis';
import path from 'path';
import { PassThrough } from 'stream';

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

export const auth = new google.auth.GoogleAuth({
  keyFile: CREDENTIALS_PATH,
  scopes: SCOPES,
});

export const drive = google.drive({ version: 'v3', auth });

export async function uploadToDrive(file: Express.Multer.File) {
  // Get the actual folder ID from Google Drive URL
  const FOLDER_ID = '1wNCnMIQ1NKivQpluz6RtW_DSGNbGcjfS';

  const bufferStream = new PassThrough();
  bufferStream.end(file.buffer);

  const response = await drive.files.create({
    requestBody: {
      name: file.originalname,
      mimeType: file.mimetype,
      parents: [FOLDER_ID] // Use folder ID only
    },
    media: {
      mimeType: file.mimetype,
      body: bufferStream
    },
    fields: 'id,webViewLink',
  });

  return {
    fileId: response.data.id,
    url: response.data.webViewLink,
  };
}

export async function deleteFromDrive(fileId: string) {
  await drive.files.delete({
    fileId: fileId,
  });
}