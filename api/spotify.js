module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!client_id || !client_secret) {
        return res.status(500).json({ error: 'Missing Spotify credentials' });
    }

    // 1. Get token
    fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}`
        },
        body: 'grant_type=client_credentials'
    })
    .then(res => {
        if (!res.ok) throw new Error(`Token error: ${res.status}`);
        return res.json();
    })
    .then(tokenData => {
        if (!tokenData.access_token) throw new Error('No access token');
        
        // 2. Get releases
        return fetch('https://api.spotify.com/v1/browse/new-releases?limit=20', {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
        });
    })
    .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
    })
    .then(data => {
        if (!data.albums?.items) throw new Error('Invalid response structure');
        
        const albums = data.albums.items.slice(0, 12).map(a => ({
            name: a.name || 'Unknown',
            artists: a.artists || [{name: 'Unknown Artist'}],
            images: a.images || [],
            external_urls: a.external_urls || { spotify: '#' }
        }));
        
        res.json({ albums });
    })
    .catch(err => {
        console.error('Spotify Error:', err.message);
        res.status(500).json({ error: err.message });
    });
};
