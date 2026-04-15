import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SHEET_API_URL;
  if (!url) return NextResponse.json({ error: 'Missing Sheet API URL' }, { status: 500 });

  try {
    const res = await fetch(`${url}?action=getAIHistory`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`GAS error: ${res.status}`);
    const data = await res.json();
    
    // Sort descending by putting newest at top (if not already sorted)
    const sortedData = Array.isArray(data) ? data.reverse() : [];
    
    return NextResponse.json(sortedData);
  } catch (error) {
    console.error('ai-history API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch AI history' }, { status: 500 });
  }
}
