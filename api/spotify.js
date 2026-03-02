module.exports = (req, res) => {
    // Bug #6 Fix: Handle CORS preflight (OPTIONS) properly
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    const spotify_id     = process.env.SPOTIFY_CLIENT_ID;
    const spotify_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const youtube_key    = process.env.YOUTUBE_API_KEY;

    if (spotify_id && spotify_secret) {
        const auth = Buffer.from(spotify_id + ':' + spotify_secret).toString('base64');

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
            // Bug #2 Fix: Guard against missing access_token before using it
            if (!tokenData.access_token) {
                console.error('Spotify token error:', tokenData);
                return tryYouTube();
            }

            const token = tokenData.access_token;

            // Bug #1 Fix: Use retro year range instead of 2025
            return fetch(`https://api.spotify.com/v1/search?q=year:1960-1999&type=track&limit=12`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(r => r.json())
            .then(data => {
                // Bug #3 Fix: Null-guard data.tracks and data.tracks.items
                if (!data.tracks || !data.tracks.items) {
                    console.error('Spotify search error:', data);
                    return tryYouTube();
                }

                const albums = data.tracks.items.map(track => ({
                    name:          track.name,
                    artists:       track.artists,
                    images:        track.album.images,
                    external_urls: track.external_urls,
                    album:         track.album.name
                }));

                res.json({ albums });
            });
        })
        // Bug #7 Fix: Log the error before falling back so it's debuggable
        .catch(err => {
            console.error('Spotify pipeline error:', err);
            tryYouTube();
        });

    } else {
        tryYouTube();
    }

    function tryYouTube() {
        if (!youtube_key) {
            return res.json({ albums: [] });
        }

        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=retro+classic+music&type=video&videoCategoryId=10&order=viewCount&key=${youtube_key}`)
        .then(r => r.json())
        .then(data => {
            // Bug #4 Fix: Null-guard data.items before mapping
            if (!data.items) {
                console.error('YouTube API error:', data);
                return res.json({ albums: [] });
            }

            const albums = data.items.map(item => ({
                name:    item.snippet.title.split(' - ')[0] || item.snippet.title,
                artists: [{ name: item.snippet.channelTitle }],
                // Bug #5 Fix: Optional chaining with fallback for thumbnails
                images:  [{
                    url: item.snippet.thumbnails?.medium?.url
                      || item.snippet.thumbnails?.default?.url
                      || ''
                }],
                external_urls: {
                    youtube: `https://youtube.com/watch?v=${item.id?.videoId || ''}`
                },
                album: 'Single'
            }));

            res.json({ albums });
        })
        // Bug #7 Fix: Log error here too
        .catch(err => {
            console.error('YouTube pipeline error:', err);
            res.json({ albums: [] });
        });
    }
};
