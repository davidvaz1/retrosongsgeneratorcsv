module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // LOG EVERYTHING
    const debug = {
        timestamp: new Date().toISOString(),
        spotify_env: !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET),
        client_id_exists: !!process.env.SPOTIFY_CLIENT_ID,
        client_secret_exists: !!process.env.SPOTIFY_CLIENT_SECRET
    };
    
    if (debug.spotify_env) {
        debug.attempting = 'Spotify';
        trySpotify();
    } else {
        debug.attempting = 'YouTube';
        tryYouTube();
    }
    
    function trySpotify() {
        const auth = Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64');
        
        fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + auth 
            },
            body: 'grant_type=client_credentials'
        })
        .then(r => {
            debug.token_status = r.status;
            return r.text();
        })
        .then(text => {
            try {
                const tokenData = JSON.parse(text);
                debug.token_received = !!tokenData.access_token;
                if (tokenData.access_token) {
                    fetch('https://api.spotify.com/v1/browse/new-releases?limit=12', {
                        headers: { 'Authorization': 'Bearer ' + tokenData.access_token }
                    })
                    .then(r => {
                        debug.releases_status = r.status;
                        return r.text();
                    })
                    .then(text => {
                        debug.releases_body_preview = text.substring(0, 200);
                        res.json({ debug, albums: [] });
                    });
                } else {
                    res.json({ debug, albums: [] });
                }
            } catch(e) {
                debug.token_parse_error = e.message;
                res.json({ debug, albums: [] });
            }
        })
        .catch(e => {
            debug.spotify_error = e.message;
            res.json({ debug, albums: [] });
        });
    }
    
    function tryYouTube() {
        fetch('https://youtube.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=trending+music&type=video&videoCategoryId=10')
        .then(r => {
            debug.youtube_status = r.status;
            return r.text();
        })
        .then(text => {
            debug.youtube_body_preview = text.substring(0, 200);
            res.json({ debug, albums: [] });
        })
        .catch(e => {
            debug.youtube_error = e.message;
            res.json({ debug, albums: [] });
        });
    }
};
