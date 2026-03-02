module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    
    const auth = Buffer.from(client_id + ':' + client_secret).toString('base64');
    
    // 1. Token (working)
    fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + auth
        },
        body: 'grant_type=client_credentials'
    })
    .then(r => r.text())
    .then(tokenText => {
        const tokenData = JSON.parse(tokenText);
        const token = tokenData.access_token;
        
        // 2. DEBUG FIRST PLAYLIST
        fetch('https://api.spotify.com/v1/playlists/37i9dQZEVXbKDoHU1qeps8/tracks?limit=12', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(r => {
            const debug = {
                status: r.status,
                statusText: r.statusText,
                ok: r.ok,
                headers: Object.fromEntries(r.headers.entries())
            };
            return r.text().then(body => ({ debug, body }));
        })
        .then(({ debug, body }) => {
            res.json({ 
                debug,
                body,
                token_preview: token.substring(0, 20) + '...',
                albums: []
            });
        })
        .catch(e => res.json({ error: e.message, albums: [] }));
    })
    .catch(e => res.json({ error: e.message, albums: [] }));
};
