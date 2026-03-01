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

    // Strategy 1: Try /browse/new-releases
    let albums = await tryNewReleases(authHeader);

    // Strategy 2: Fall back to Search API for new albums
    if (!albums) {
      albums = await trySearchNewAlbums(authHeader);
    }

    // Strategy 3: Fall back to Spotify's "New Music Friday" playlist
    if (!albums) {
      albums = await tryPlaylist(authHeader);
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

async function tryNewReleases(authHeader) {
  try {
    const res = await fetch("https://api.spotify.com/v1/browse/new-releases?limit=50&country=US", {
      headers: authHeader,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.albums?.items || null;
  } catch {
    return null;
  }
}

async function trySearchNewAlbums(authHeader) {
  try {
    const res = await fetch(
      "https://api.spotify.com/v1/search?q=tag%3Anew&type=album&limit=50&market=US",
      { headers: authHeader }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.albums?.items || null;
  } catch {
    return null;
  }
}

async function tryPlaylist(authHeader) {
  try {
    // "New Music Friday" playlist by Spotify
    const res = await fetch(
      "https://api.spotify.com/v1/playlists/37i9dQZF1DX4JAvHpjipBk?fields=tracks.items(track(album(name,images,external_urls,artists)))",
      { headers: authHeader }
    );
    if (!res.ok) return null;
    const data = await res.json();

    // Extract unique albums from playlist tracks
    const seen = new Set();
    const albums = [];
    for (const item of data.tracks?.items || []) {
      const album = item.track?.album;
      if (album && !seen.has(album.name)) {
        seen.add(album.name);
        albums.push({
          name: album.name,
          images: album.images,
          external_urls: album.external_urls,
          artists: album.artists,
        });
      }
    }
    return albums.length > 0 ? albums.slice(0, 50) : null;
  } catch {
    return null;
  }
}
