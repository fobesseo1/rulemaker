'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function createCollection(formData: FormData) {
    const name = formData.get('name') as string;
    if (!name) return { error: '이름을 입력해주세요.' };

    const { data, error } = await supabaseAdmin
        .from('collections')
        .insert([{ name }])
        .select()
        .single();

    if (error) {
        console.error('Error creating collection:', error);
        return { error: error.message };
    }

    revalidatePath('/coinmaker');
    return { data };
}
