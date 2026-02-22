import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/auth/signin');
    }
    return (
        <div className="min-h-screen bg-[var(--bg-deep)]">
            {children}
        </div>
    );
}
