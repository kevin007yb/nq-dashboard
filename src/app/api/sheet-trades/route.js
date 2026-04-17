import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';


export async function GET() {
  const url = process.env.NEXT_PUBLIC_SHEET_API_URL;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}

export async function POST(request) {
  const url = process.env.NEXT_PUBLIC_SHEET_API_URL;
  try {
    const tradeData = await request.json();
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(tradeData),
      headers: {
        'Content-Type': 'text/plain', // GAS requires text/plain for POST payloads often, but our script parsed JSON.
      },
    });
    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to save trade' }, { status: 500 });
  }
}
