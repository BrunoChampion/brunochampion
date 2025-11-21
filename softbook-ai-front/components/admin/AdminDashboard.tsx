'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

interface Technology {
    id: string;
    name: string;
    documentationUrl: string;
    isIndexed: boolean;
    createdAt: string;
}

export default function AdminDashboard() {
    const [technologies, setTechnologies] = useState<Technology[]>([]);
    // Initialize with 5 empty rows
    const [newTechnologies, setNewTechnologies] = useState<{ name: string; url: string }[]>(
        Array(5).fill({ name: '', url: '' })
    );
    const [isLoading, setIsLoading] = useState(false);
    const { user, isLoading: authLoading, logout } = useAuth();
    const router = useRouter();

    const API_URL = process.env.NEXT_PUBLIC_SOFTBOOK_AI_API_URL || 'http://localhost:3000/api';

    useEffect(() => {
        if (!authLoading) {
            if (!user || user.role !== 'admin') {
                router.push('/login');
                return;
            }
            fetchTechnologies();
        }
    }, [user, authLoading, router]);

    const fetchTechnologies = async () => {
        try {
            const res = await fetch(`${API_URL}/technologies`);
            if (res.ok) {
                const data = await res.json();
                setTechnologies(data);
            }
        } catch (error) {
            console.error('Failed to fetch technologies', error);
        }
    };

    const handleInputChange = (index: number, field: 'name' | 'url', value: string) => {
        const updated = [...newTechnologies];
        updated[index] = { ...updated[index], [field]: value };
        setNewTechnologies(updated);
    };

    const handleAddRows = () => {
        setNewTechnologies(prev => [...prev, ...Array(5).fill({ name: '', url: '' })]);
    };

    const handleBulkScrape = async () => {
        // Filter out rows where either name or url is empty
        const validTechs = newTechnologies.filter(t => t.name.trim() !== '' && t.url.trim() !== '');

        if (validTechs.length === 0) {
            alert('Please fill in at least one technology (Name and URL).');
            return;
        }

        setIsLoading(true);
        try {
            // Process sequentially to avoid overwhelming backend if many
            for (const tech of validTechs) {
                // 1. Create Technology
                const createRes = await fetch(`${API_URL}/technologies`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: tech.name, documentationUrl: tech.url }),
                });

                if (createRes.ok) {
                    const createdTech = await createRes.json();
                    // 2. Trigger Scraping
                    await fetch(`${API_URL}/technologies/${createdTech.id}/scrape`, { method: 'POST' });
                } else {
                    console.error(`Failed to create ${tech.name}`);
                }
            }

            // Reset form and refresh list
            setNewTechnologies(Array(5).fill({ name: '', url: '' }));
            fetchTechnologies();
            alert('Technologies submitted and scraping initiated!');

        } catch (error) {
            console.error('Error during bulk processing', error);
            alert('An error occurred during processing.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteRow = (index: number) => {
        const updated = [...newTechnologies];
        updated.splice(index, 1);
        setNewTechnologies(updated);
    };

    const [techToDelete, setTechToDelete] = useState<string | null>(null);

    const confirmDelete = async () => {
        if (!techToDelete) return;
        try {
            await fetch(`${API_URL}/technologies/${techToDelete}`, { method: 'DELETE' });
            fetchTechnologies();
            setTechToDelete(null);
        } catch (error) {
            console.error('Failed to delete technology', error);
        }
    };

    const handleScrape = async (id: string) => {
        try {
            await fetch(`${API_URL}/technologies/${id}/scrape`, { method: 'POST' });
            alert('Scraping started (Check backend console)');
        } catch (error) {
            console.error('Failed to start scraping', error);
        }
    };

    const handleIndex = async (id: string) => {
        try {
            await fetch(`${API_URL}/technologies/${id}/index`, { method: 'POST' });
            alert('Indexing started (Check backend console)');
        } catch (error) {
            console.error('Failed to start indexing', error);
        }
    };

    if (authLoading || !user || user.role !== 'admin') {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    return (
        <div className="container mx-auto p-8 space-y-8 relative">
            {/* Delete Confirmation Modal */}
            {techToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                        <CardHeader>
                            <CardTitle className="text-red-500">Confirm Deletion</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p>Are you sure you want to delete this technology? This action cannot be undone and all associated data will be lost.</p>
                            <div className="flex justify-end gap-4">
                                <Button variant="ghost" onClick={() => setTechToDelete(null)}>Cancel</Button>
                                <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-950/30" onClick={confirmDelete}>Delete</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-primary drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">Admin Dashboard</h1>
                <Button variant="outline" onClick={logout} className="border-red-500/50 text-red-400 hover:bg-red-950/30">
                    Logout
                </Button>
            </header>

            {/* Bulk Add Section */}
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Add Technologies</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="rounded-md border border-border overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-secondary text-secondary-foreground uppercase">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="px-4 py-3 font-medium">Documentation URL</th>
                                        <th className="px-4 py-3 font-medium w-16">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {newTechnologies.map((tech, index) => (
                                        <tr key={index} className="bg-card hover:bg-secondary/50 transition-colors">
                                            <td className="p-2">
                                                <Input
                                                    placeholder="e.g. Next.js"
                                                    value={tech.name}
                                                    onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                                                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    placeholder="https://..."
                                                    value={tech.url}
                                                    onChange={(e) => handleInputChange(index, 'url', e.target.value)}
                                                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <button
                                                    onClick={() => handleDeleteRow(index)}
                                                    className="text-muted-foreground hover:text-red-400 transition-colors"
                                                    title="Remove row"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex gap-4">
                            <Button variant="secondary" onClick={handleAddRows} className="w-full sm:w-auto">
                                + Add 5 More Rows
                            </Button>
                            <Button onClick={handleBulkScrape} disabled={isLoading} className="w-full sm:w-auto flex-1 bg-cyan-600 hover:bg-cyan-700 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                                {isLoading ? 'Processing...' : 'Do Scraping'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Managed Technologies List */}
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Managed Technologies</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {technologies.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">No technologies added yet.</p>
                        ) : (
                            technologies.map((tech) => (
                                <div key={tech.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors">
                                    <div>
                                        <h4 className="font-semibold text-lg">{tech.name}</h4>
                                        <a href={tech.documentationUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                                            {tech.documentationUrl}
                                        </a>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            Status: {tech.isIndexed ? <span className="text-green-400">Indexed</span> : <span className="text-yellow-400">Pending</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleIndex(tech.id)}>
                                            Index
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => setTechToDelete(tech.id)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
