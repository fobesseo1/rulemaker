import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('collections')
            .select('id, name')
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
        }

        return NextResponse.json({ success: true, collections: data }, { headers: corsHeaders });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
    }
}
