import { getTraderProfile, upsertTraderProfile } from '../../../lib/db.js';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const profile = await getTraderProfile();
    return Response.json({ profile });
  } catch (err) {
    return Response.json({ error: true, message: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    let hourlyRate = null;
    if (body.hourly_rate !== undefined && body.hourly_rate !== null && body.hourly_rate !== '') {
      hourlyRate = Number(body.hourly_rate);
      if (!Number.isFinite(hourlyRate)) {
        return Response.json({ error: true, message: 'hourly_rate must be a number' }, { status: 400 });
      }
    }

    const profile = await upsertTraderProfile({
      business_name: body.business_name,
      contact_details: body.contact_details,
      hourly_rate: hourlyRate,
      standard_terms: body.standard_terms,
      voice_sample: body.voice_sample,
    });

    return Response.json({ profile });
  } catch (err) {
    return Response.json({ error: true, message: err.message }, { status: 500 });
  }
}
