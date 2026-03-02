module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    
    console.log('ENV:', !!client_id, !!client_secret);
    
    if (client_id && client_secret) {
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
            console.log('TOKEN STATUS:', r.status);
            if (!r.ok) throw new Error(`Token ${r.status}`);
            return r.json();
        })
        .then(token => {
            console.log('TOKEN OK, fetching playlist...');
            return fetch('https://api.spotify.com/v1/playlists/37i9dQZEVXbKDoHU1qeps8/tracks?limit=12', {
                headers: { 
                    'Authorization': `Bearer ${token.access_token}`,
                    'Accept': 'application/json'
                }
            });
        })
        .then(r => {
            console.log('PLAYLIST STATUS:', r.status);
            if (!r.ok) throw new Error(`Playlist ${r.status}`);
            return r.json();
        })
        .then(data => {
            console.log('RAW DATA:', JSON.stringify(data).substring(0, 500));
            console.log('ITEMS LENGTH:', data.items ? data.items.length : 'NO ITEMS');
            
            const albums = data.items ? data.items.map(item => ({
                name: item.track.name,
                artists: item.track.artists,
                images: item.track.album.images,
                external_urls: item.track.external_urls
            })) : [];
            
            console.log('FINAL ALBUMS:', albums.length);
            res.json({ albums, debug: { raw_items: data.items?.length || 0 } });
        })
        .catch(e => {
            console.error('ERROR:', e.message);
            res.json({ albums: [], error: e.message });
        });
    } else {
        res.json({ albums: [], debug: { no_env: true } });
    }
};
