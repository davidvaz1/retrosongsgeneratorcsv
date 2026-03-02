module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Spotify Global Top 50 - PUBLIC playlist (NO AUTH NEEDED)
    fetch('https://api.spotify.com/v1/playlists/37i9dQZEVXbMDoHDwVN2tF/tracks?limit=12', {
        headers: { 
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
    .then(r => {
        if (!r.ok) throw new Error(`Spotify failed: ${r.status}`);
        return r.json();
    })
    .then(data => {
        const albums = data.items.slice(0, 12).map(item => ({
            name: item.track.name,
            artists: item.track.artists,
            images: item.track.album.images,
            external_urls: item.track.external_urls
        }));
        res.json({ albums });
    })
    .catch(e => {
        // If Spotify down, return empty (no fake data)
        res.status(500).json({ error: 'Spotify temporarily unavailable' });
    });
};
