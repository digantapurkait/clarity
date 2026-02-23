
import AttachmentFlow from '@/components/onboarding/AttachmentFlow';

export const metadata = {
    title: 'Start Your Reflection | MindMantra',
    description: 'Begin your journey into personal pattern intelligence.',
};

export default function OnboardingPage() {
    return (
        <main className="min-h-screen bg-[var(--bg-deep)]">
            <AttachmentFlow />
        </main>
    );
}
