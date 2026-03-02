module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!client_id || !client_secret) {
        // NO AUTH → Charts backup
        return spotifyChartsFallback(res);
    }
    
    // 1. TRY AUTHENTICATED (Spotify Playlists)
    const auth = Buffer.from(client_id + ':' + client_secret).toString('base64');
    
    fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + auth
        },
        body: 'grant_type=client_credentials'
    })
    .then(r => r.json())
    .then(tokenData => {
        const token = tokenData.access_token;
        
        // Try Today's Top Hits
        fetch('https://api.spotify.com/v1/playlists/37i9dQZEVXbKDoHU1qeps8/tracks?limit=12', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => processSpotifyTracks(data))
        .then(albums => {
            if (albums.length > 0) return res.json({ albums });
            throw new Error('Empty playlist');
        })
        .catch(() => {
            // Playlist failed → Charts backup
            spotifyChartsFallback(res);
        });
    })
    .catch(() => spotifyChartsFallback(res));
};

// Process Spotify tracks → albums format
function processSpotifyTracks(data) {
    if (!data.items || data.items.length === 0) return [];
    return data.items.slice(0, 12).map(item => ({
        name: item.track.name,
        artists: item.track.artists,
        images: item.track.album.images,
        external_urls: item.track.external_urls
    }));
}

// Charts API Failsafe (NO AUTH needed)
function spotifyChartsFallback(res) {
    fetch('https://spotify-charts.com/api/tracks?country=global&limit=12')
    .then(r => r.json())
    .then(data => {
        const albums = data.data.slice(0, 12).map(item => ({
            name: item.title.split(' - ')[0],
            artists: [{ name: item.artist }],
            images: [{ url: item.image }],
            external_urls: { spotify: 'https://open.spotify.com/track/' + item.spotify_id }
        }));
        res.json({ albums });
    })
    .catch(() => res.json({ albums: [] }));
}
