import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { getServerAuthSession } from '@/server/auth';

type PageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParam(value: string | string[] | undefined, fallback: string) {
    return typeof value === 'string' && value.trim() ? value : fallback;
}

export default async function LoginPage({ searchParams }: PageProps) {
    const session = await getServerAuthSession();
    const params = searchParams ? await searchParams : {};
    const callbackUrl = getSearchParam(params.callbackUrl, '/');

    if (session) {
        redirect(callbackUrl);
    }

    return (
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
            <LoginForm callbackUrl={callbackUrl} />
        </div>
    );
}