// api/spotify.js - Vercel API Route (Node.js 18+)
export default async function handler(req, res) {
    // CORS + Method check
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST allowed' });
    }

    let { client_id, client_secret };
    
    try {
        ({ client_id, client_secret } = req.body);
    } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    if (!client_id || !client_secret) {
        return res.status(400).json({ error: 'Missing client_id or client_secret' });
    }

    try {
        // Spotify token (Client Credentials Flow)
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${client_id}:${client_secret}`, 'utf8').toString('base64')}`
            },
            body: 'grant_type=client_credentials'
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            throw new Error(errorData.error_description || `Token error: ${tokenResponse.status}`);
        }

        const { access_token } = await tokenResponse.json();

        // New releases
        const releasesResponse = await fetch(
            'https://api.spotify.com/v1/browse/new-releases?limit=50&country=US',
            { headers: { 'Authorization': `Bearer ${access_token}` } }
        );

        if (!releasesResponse.ok) {
            const errorData = await releasesResponse.json();
            throw new Error(errorData.error?.message || `API error: ${releasesResponse.status}`);
        }

        const data = await releasesResponse.json();
        const albums = data.albums.items.map(item => ({
            name: item.name,
            artists: item.artists,
            images: item.images || [],
            external_urls: item.external_urls
