module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (client_id && client_secret) {
        trySpotify();
    } else {
        tryYouTube();
    }
    
    function trySpotify() {
        const auth = Buffer.from(client_id + ':' + client_secret).toString('base64');
        
        fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + auth 
            },
            body: 'grant_type=client_credentials'
        })
        .then(r => r.json())
        .then(data => {
            const token = data.access_token;
            fetch('https://api.spotify.com/v1/browse/new-releases?limit=12', {
                headers: { 'Authorization': 'Bearer ' + token }
            })
            .then(r => r.json())
            .then(data => {
                const albums = data.albums.items.slice(0,12).map(album => ({
                    name: album.name,
                    artists: album.artists,
                    images: album.images,
                    external_urls: album.external_urls
                }));
                sendCleanResponse(albums);
            })
            .catch(() => tryYouTube());
        })
        .catch(() => tryYouTube());
    }
    
    function tryYouTube() {
        fetch('https://youtube.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=trending+music&type=video&videoCategoryId=10')
        .then(r => r.json())
        .then(data => {
            const albums = data.items
                .map(item => ({
                    name: item.snippet.title.split(' - ')[0] || item.snippet.title,
                    artists: [{ name: item.snippet.channelTitle }],
                    images: [{ url: item.snippet.thumbnails.medium?.url || '' }],
                    external_urls: { youtube: `https://youtube.com/watch?v=${item.id.videoId}` }
                }))
                .filter(item => item.images[0] && item.images[0].url);
            sendCleanResponse(albums.slice(0,12));
        })
        .catch(() => sendCleanResponse([]));
    }
    
    function sendCleanResponse(albums) {
        res.json({ albums });
    }
};
