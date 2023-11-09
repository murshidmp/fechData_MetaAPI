const fs = require('fs').promises;
const path = require('path');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive'];

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credential.json');

async function loadSavedCredentialsIfExist(tokenPath) {
  try {
    const content = await fs.readFile(tokenPath);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

async function authorize(tokenPath, credPath) {
  let client = await loadSavedCredentialsIfExist(tokenPath);
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: credPath,
  });
  console.log('after client');
  console.log(client);
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

async function findSheetIdByName(sheetName, spreadsheetId) {
  const auth = await authorize(TOKEN_PATH, CREDENTIALS_PATH);
  const sheets = google.sheets({ version: 'v4', auth });

  const { data } = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  const sheet = data.sheets.find(sheet => sheet.properties.title === sheetName);
  return sheet ? sheet.properties.sheetId : null;
}

async function pushCsvToGSheet(csvPath, sheetId, spreadsheetId) {
  const auth = await authorize(TOKEN_PATH, CREDENTIALS_PATH);
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const csvContents = await fs.readFile(csvPath, 'utf-8');

    const body = {
      requests: [
        {
          pasteData: {
            coordinate: {
              sheetId: sheetId,
              rowIndex: 0,
              columnIndex: 0,
            },
            data: csvContents,
            type: 'PASTE_NORMAL',
            delimiter: ',',
          },
        },
      ],
    };

    const request = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      resource: body,
    });

    const response = request.data;
    console.log('Sheet updated:', response);
    return response;
  } catch (err) {
    console.error('Error pushing CSV to Google Sheet:', err);
    throw err;
  }
}

const SPREADSHEET_ID = '1z1eJYK70dvm4AcIce4OLDp78Yu5ICGdPLljXMYQnHhM'; 
const WORKSHEET_NAME = 'ad_metrics'; 
const PATH_TO_CSV = 'ad_metrics.csv'; 

exports.start = async () => {
  const sheetId = await findSheetIdByName(WORKSHEET_NAME, SPREADSHEET_ID);
  await pushCsvToGSheet(PATH_TO_CSV, sheetId, SPREADSHEET_ID);
};
