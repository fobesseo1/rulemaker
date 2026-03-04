'use client';

import { useState } from 'react';
import { updateAllowedUrls } from './actions';
import { Plus, Trash2, Save } from 'lucide-react';

export default function GlobalSettingsForm({ initialUrls }: { initialUrls: string }) {
    // Parse the initial comma-separated string into an array of strings
    const [urls, setUrls] = useState<string[]>(
        initialUrls ? initialUrls.split(',').map((u) => u.trim()).filter(Boolean) : ['']
    );
    const [loading, setLoading] = useState(false);

    const handleAdd = () => {
        setUrls([...urls, '']);
    };

    const handleRemove = (index: number) => {
        const newUrls = [...urls];
        newUrls.splice(index, 1);
        if (newUrls.length === 0) newUrls.push(''); // Keep at least one input
        setUrls(newUrls);
    };

    const handleChange = (index: number, value: string) => {
        const newUrls = [...urls];
        newUrls[index] = value;
        setUrls(newUrls);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Join valid URLs back into a comma-separated string
            const validUrls = urls.map(u => u.trim()).filter(Boolean);
            const urlsString = validUrls.join(', ');

            const formData = new FormData();
            formData.append('allowed_urls', urlsString);

            const result = await updateAllowedUrls(formData);

            if (result.error) {
                alert(`저장 중 오류가 발생했습니다: ${result.error}`);
            } else {
                alert('허가된 URL 설정이 성공적으로 저장되었습니다.');
                // Update local state to reflect clean trimmed URLs
                if (validUrls.length === 0) {
                    setUrls(['']);
                } else {
                    setUrls([...validUrls]);
                }
            }
        } catch (error: any) {
            alert(`저장 실패: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
                {urls.map((url, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => handleChange(index, e.target.value)}
                            placeholder="예: http://localhost:3000"
                            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                        <button
                            type="button"
                            onClick={() => handleRemove(index)}
                            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 rounded-md transition-colors"
                            title="삭제"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center mt-2">
                <button
                    type="button"
                    onClick={handleAdd}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 h-9 px-4 gap-2"
                >
                    <Plus size={16} /> URL 추가
                </button>

                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-6 gap-2"
                >
                    <Save size={16} /> {loading ? '저장 중...' : '변경 저장'}
                </button>
            </div>
        </form>
    );
}
