import 'dotenv/config';

const NOCODB_URL = "https://nocodb.jpcloudkit.fr";
const TABLE_MISSIONS = "m4ppq6sdvuq9vfi";
const NOCODB_TOKEN = process.env.VITE_NOCODB_TOKEN;

async function testLink() {
  const missionId = 1; // Assuming mission 1 exists
  const referentId = 1; // Assuming referent 1 exists

  const url = `${NOCODB_URL}/api/v2/tables/${TABLE_MISSIONS}/links/Referents_Assignes/records/${missionId}`;
  
  console.log("Testing POST to", url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        "xc-token": NOCODB_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([{ Id: referentId }])
    });
    console.log("Link response:", res.status, await res.text());
  } catch (e) {
    console.error(e);
  }
}

testLink();
