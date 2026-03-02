module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // TIER 1: Spotify Search (SAFE endpoint)
    const spotify_id = process.env.SPOTIFY_CLIENT_ID;
    const spotify_secret = process.env.SPOTIFY_CLIENT_SECRET;
    
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
        .then(({access_token: token}) => 
            fetch(`https://api.spotify.com/v1/search?q=pop&type=track&limit=12`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        )
        .then(r => r.json())
        .then(data => {
            const albums = data.tracks.items.map(track => ({
                name: track.name,
                artists: track.artists,
                images: track.album.images,
                external_urls: track.external_urls
            }));
            res.json({ albums });
        })
        .catch(() => tryYouTube());
    } else {
        tryYouTube();
    }
    
    function tryYouTube() {
        // YouTube Trending Music Videos
        fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=trending+music&type=video&videoCategoryId=10&order=viewCount')
        .then(r => r.json())
        .then(data => {
            const albums = data.items.map(item => ({
                name: item.snippet.title.split(' - ')[0] || item.snippet.title,
                artists: [{ name: item.snippet.channelTitle }],
                images: [{ url: item.snippet.thumbnails.medium.url }],
                external_urls: { youtube: `https://youtube.com/watch?v=${item.id.videoId}` }
            })).slice(0, 12);
            res.json({ albums });
        })
        .catch(() => res.json({ albums: [] }));
    }
};
