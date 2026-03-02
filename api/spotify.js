export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if(req.method !== 'POST') return res.status(405).json({error:'POST only'});
    
    const {client_id, client_secret} = req.body;
    if(!client_id || !client_secret) return res.status(400).json({error:'Missing credentials'});
    
    try {
        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}`
            },
            body: 'grant_type=client_credentials'
        });
        const tokenData = await tokenRes.json();
        
        const releasesRes = await fetch('https://api.spotify.com/v1/browse/new-releases?limit=20', {
            headers: {Authorization: `Bearer ${tokenData.access_token}`}
        });
        const data = await releasesRes.json();
        
        res.json({albums: data.albums.items.map(a => ({
            name: a.name,
            artists: a.artists,
            images: a.images,
            external_urls: a.external_urls
        }))});
    } catch(e) {
        res.status(500).json({error: e.message});
    }
}
