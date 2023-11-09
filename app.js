const axios = require("axios");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const apiKey =
  "EAAKOjYZBHVlwBO3mEZAkSoyDsacSn5pTNzKAb4DjSZAWOiEFigwkWPtCyqMw0VYxKLZBFig5L9ZBeLZCwTn7AmhHuJGjxyQAB1I38ZBGGuJtHT614QkA8TukoNZAZBeL0EFFJnuHuIizm7FWdENbi1Wep1IKhZAMFa75jVXnRZCgL08f0WbrS2nAGzvFmdMhP8ZD";
const fields = [
  "date_start",
  "impressions",
  "cpm",
  "ctr",
  "clicks",
  "spend",
  "cpp",
];

const csvWriter = createCsvWriter({
  path: "ad_metrics.csv",
  header: fields.map((field) => ({ id: field, title: field })),
});

async function fetchAdInsights(adId) {
  try {
    const endpoint = `https://graph.facebook.com/v18.0/${adId}/insights`;

    const params = {
      access_token: apiKey,
      fields: fields.join(","),
    };

    const response = await axios.get(endpoint, { params });

    await csvWriter.writeRecords(response.data.data);

    console.log(`Data saved for Ad ID ${adId}`);
  } catch (error) {
    console.error(
      `Error fetching data for Ad ID ${adId}:`,
      error.response ? error.response.data : error.message
    );
  }
}

async function fetchAdIds(adAccountId) {
  try {
    const endpoint = `https://graph.facebook.com/v18.0/${adAccountId}/ads`;

    const params = {
      access_token: apiKey,
      date_preset: "last_30d",
    };

    const response = await axios.get(endpoint, { params });
    if (response.data && response.data.data && response.data.data.length > 0) {
      for (const ad of response.data.data) {
        const adId = ad.id;
        await fetchAdInsights(adId);
      }
    } else {
      console.log(`No ads found for Ad Account ID ${adAccountId}`);
    }
  } catch (error) {
    console.error(
      `Error fetching ad IDs for Ad Account ID ${adAccountId}:`,
      error.response ? error.response.data : error.message
    );
  }
}

// Function to fetch all ad account IDs
async function fetchAdAccountIds() {
  try {
    const endpoint = `https://graph.facebook.com/v18.0/me/adaccounts`;

    const params = {
      access_token: apiKey,
    };

    const response = await axios.get(endpoint, { params });

    if (response.data && response.data.data && response.data.data.length > 0) {
      for (const adAccount of response.data.data) {
        const adAccountId = adAccount.id;
        await fetchAdIds(adAccountId);
      }
    } else {
      console.log("No ad accounts found for your user.");
    }
  } catch (error) {
    console.error(
      "Error fetching ad account IDs:",
      error.response ? error.response.data : error.message
    );
  }
}

fetchAdAccountIds();
