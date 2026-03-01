exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { client_id, client_secret } = JSON.parse(event.body);

    if (!client_id || !client_secret) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Client ID and Client Secret are required" }),
      };
    }

    // Step 1: Authenticate with Spotify
    const authRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(client_id + ":" + client_secret).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const authData = await authRes.json();
    if (!authRes.ok) {
      return {
        statusCode: authRes.status,
        headers,
        body: JSON.stringify({ error: authData.error_description || "Authentication failed" }),
      };
    }

    const token = authData.access_token;
    const authHeader = { Authorization: "Bearer " + token };

    // Step 2: Try multiple strategies to get new music
    // Note: /browse/new-releases was removed in Feb 2026, tag:new search filter
    // no longer works, and dev-mode apps can only access owned/collaborated playlists.
    // All strategies now use the Search API with pagination (limit max is 10).

    // Strategy 1: Search for albums from the current year
    let albums = await searchAlbums(authHeader, `year:${new Date().getFullYear()}`);

    // Strategy 2: Broaden to current + previous year
    if (!albums) {
      const year = new Date().getFullYear();
      albums = await searchAlbums(authHeader, `year:${year - 1}-${year}`);
    }

    // Strategy 3: Generic search for new music
    if (!albums) {
      albums = await searchAlbums(authHeader, "new music");
    }

    if (!albums || albums.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Could not fetch new releases from any source" }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ albums }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message }),
    };
  }
};

// Search for albums using the Spotify Search API with pagination.
// The API now limits results to 10 per request, so we paginate to collect more.
async function searchAlbums(authHeader, query) {
  try {
    const albums = [];
    const maxResults = 50;
    const pageSize = 10;

    for (let offset = 0; offset < maxResults; offset += pageSize) {
      const url =
        "https://api.spotify.com/v1/search?" +
        new URLSearchParams({
          q: query,
          type: "album",
          limit: String(pageSize),
          offset: String(offset),
          market: "US",
        }).toString();

      const res = await fetch(url, { headers: authHeader });
      if (!res.ok) break;

      const data = await res.json();
      const items = data.albums?.items;
      if (!items || items.length === 0) break;

      albums.push(...items);
    }

    return albums.length > 0 ? albums : null;
  } catch {
    return null;
  }
}
