const fetch = require('node-fetch');
console.log('SPOTIFY:', !!spotify_id, !!spotify_secret);
console.log('YOUTUBE:', !!youtube_key);
module.exports = (req, res) => {
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
            if (!tokenData.access_token) {
                console.error('Spotify token error:', tokenData);
                return tryYouTube();
            }

            const token = tokenData.access_token;

            // Spotify max is 50 per request — fire two parallel fetches to get 100
            const fetchPage = (offset) =>
                fetch(`https://api.spotify.com/v1/search?q=year:1960-1999&type=track&limit=50&offset=${offset}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(r => r.json());

            return Promise.all([fetchPage(0), fetchPage(50)])
                .then(([page1, page2]) => {
                    const items1 = page1.tracks?.items;
                    const items2 = page2.tracks?.items;

                    if (!items1) {
                        console.error('Spotify search error:', page1);
                        return tryYouTube();
                    }

                    // Merge both pages (page2 may be empty if fewer than 100 results)
                    const combined = [...items1, ...(items2 || [])];

                    const albums = combined.map(track => ({
                        name:          track.name,
                        artists:       track.artists,
                        images:        track.album.images,
                        external_urls: track.external_urls,
                        album:         track.album.name
                    }));

                    res.json({ albums, source: 'spotify' });
                });
        })
        .catch(err => {
            console.error('Spotify pipeline error:', err);
            tryYouTube();
        });

    } else {
        tryYouTube();
    }

    function tryYouTube() {
        if (!youtube_key) {
            return res.json({
                albums: [],
                source: 'none',
                message: '⚠️ No music source available. Please check your API keys.'
            });
        }

        // YouTube max is 50 per request — fetch page 1, use nextPageToken for page 2
        const ytBase = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=retro+classic+music&type=video&videoCategoryId=10&order=viewCount&key=${youtube_key}`;

        fetch(ytBase)
            .then(r => r.json())
            .then(page1 => {
                if (!page1.items) {
                    console.error('YouTube API error:', page1);
                    return res.json({
                        albums: [],
                        source: 'error',
                        message: '⚠️ Switching to YouTube failed. Please try again later.'
                    });
                }

                // If there's a second page, fetch it; otherwise just use page 1
                const page2Fetch = page1.nextPageToken
                    ? fetch(`${ytBase}&pageToken=${page1.nextPageToken}`).then(r => r.json())
                    : Promise.resolve({ items: [] });

                return page2Fetch.then(page2 => {
                    const combined = [...page1.items, ...(page2.items || [])];

                    const albums = combined.map(item => ({
                        name:    item.snippet.title.split(' - ')[0] || item.snippet.title,
                        artists: [{ name: item.snippet.channelTitle }],
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

                    // 'message' tells the frontend to display the fallback banner
                    res.json({
                        albums,
                        source: 'youtube',
                        message: '⚠️ Spotify unavailable — switching to YouTube results.'
                    });
                });
            })
            .catch(err => {
                console.error('YouTube pipeline error:', err);
                res.json({
                    albums: [],
                    source: 'error',
                    message: '⚠️ All music sources failed. Please try again later.'
                });
            });
    }
};
