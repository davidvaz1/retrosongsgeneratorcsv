module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!client_id || !client_secret) {
        return res.status(500).json({ error: 'Missing credentials' });
    }

    fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}`
        },
        body: 'grant_type=client_credentials'
    })
    .then(r => r.json())
    .then(tokenData => {
        // Use TODAY'S TOP HITS - GUARANTEED to have tracks
        fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M/tracks?limit=20', {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
        })
        .then(r => r.json())
        .then(data => {
            const albums = data.items.slice(0,12).map(item => ({
                name: item.track.name,
                artists: item.track.artists,
                images: item.track.album.images,
                external_urls: item.track.external_urls
            }));
            res.json({ albums });
        });
    })
    .catch(e => res.status(500).json({ error: e.message }));
};
