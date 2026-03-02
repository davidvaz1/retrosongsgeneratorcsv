module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Spotify REQUIRES auth for playlist tracks - use Client Credentials Flow
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!client_id || !client_secret) {
        return res.status(500).json({ error: 'Configure Spotify credentials in Vercel' });
    }

    // Step 1: Get OAuth token (500ms)
    const auth = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
    
    fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${auth}`
        },
        body: 'grant_type=client_credentials'
    })
    .then(r => {
        if (!r.ok) throw new Error('Token auth failed');
        return r.json();
    })
    .then(tokenData => {
        // Step 2: Get GLOBAL TOP 50 (500ms) - MOST RELIABLE endpoint
        fetch('https://api.spotify.com/v1/playlists/37i9dQZEVXbMDoHDwVN2tF/tracks?limit=12', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Accept': 'application/json'
            }
        })
        .then(r => {
            if (!r.ok) throw new Error(`Playlist fetch failed: ${r.status}`);
            return r.json();
        })
        .then(data => {
            const albums = data.items.map(item => ({
                name: item.track.name,
                artists: item.track.artists,
                images: item.track.album.images,
                external_urls: item.track.external_urls
            })).slice(0, 12);
            
            res.json({ albums });
        });
    })
    .catch(e => {
        console.error('Spotify error:', e.message);
        res.status(500).json({ error: 'Spotify unavailable: ' + e.message });
    });
};
