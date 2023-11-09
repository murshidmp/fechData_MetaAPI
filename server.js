const fs = require("fs").promises;
const path = require("path");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const { GoogleAuth } = require("google-auth-library");

const SCOPES = ["https://www.googleapis.com/auth/drive"];
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credential.json");

async function loadSavedCredentialsIfExist(tokenPath) {
  try {
    const content = await fs.readFile(tokenPath);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
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
  console.log("after client");
  console.log(client);
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

async function getValues(spreadsheetId, range) {
  const auth = await authorize(TOKEN_PATH, CREDENTIALS_PATH);
  const service = google.sheets({ version: "v4", auth });
  try {
    const result = await service.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: range,
    });
    const numRows = result.data.values ? result.data.values.length : 0;
    console.log(result.data)
    console.log(`${numRows} rows retrieved.`);
    return result;
  } catch (err) {
    // Handle the exception here
    console.error(err);
  }
}

// Call the getValues function with the appropriate spreadsheetId and range
getValues("1z1eJYK70dvm4AcIce4OLDp78Yu5ICGdPLljXMYQnHhM", "A1");
