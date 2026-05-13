import { NextResponse } from 'next/server';

// Whitelist: only allow proxying Google Drive download URLs
const ALLOWED_HOSTS = [
    'drive.google.com',
    'docs.google.com',
    'www.googleapis.com',
];

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Security: validate the URL is a Google Drive domain
    try {
        const parsed = new URL(url);
        if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
            return NextResponse.json(
                { error: 'Forbidden: only Google Drive URLs are allowed' },
                { status: 403 }
            );
        }
    } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    try {
        const response = await fetch(url, { cache: 'no-store' });
        
        if (!response.ok) {
            return NextResponse.json({ error: `Downstream fetch failed: ${response.statusText}` }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
