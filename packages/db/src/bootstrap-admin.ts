import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { Role, prisma } from './index';
import { hashPassword } from './auth';

function getArgValue(flag: string) {
    const index = process.argv.indexOf(flag);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

async function promptForValue(question: string, fallback?: string) {
    if (fallback) {
        return fallback.trim();
    }

    const rl = createInterface({ input, output });

    try {
        return (await rl.question(question)).trim();
    } finally {
        rl.close();
    }
}

function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function main() {
    const username = await promptForValue('Username do admin: ', getArgValue('--username'));
    const email = await promptForValue('E-mail do admin: ', getArgValue('--email'));
    const password = await promptForValue('Senha do admin: ', getArgValue('--password'));

    if (!username) {
        throw new Error('Informe um username válido.');
    }

    if (!validateEmail(email)) {
        throw new Error('Informe um e-mail válido.');
    }

    if (password.trim().length < 8) {
        throw new Error('A senha deve ter pelo menos 8 caracteres.');
    }

    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    const existingByUsername = await prisma.user.findUnique({ where: { username } });

    if (existingByEmail && existingByUsername && existingByEmail.id !== existingByUsername.id) {
        throw new Error('Já existe um usuário com este e-mail e outro com este username. Ajuste os dados informados.');
    }

    const targetUser = existingByEmail ?? existingByUsername;
    const passwordHash = hashPassword(password);

    const admin = targetUser
        ? await prisma.user.update({
            where: { id: targetUser.id },
            data: {
                username,
                email,
                passwordHash,
                role: Role.ADMIN,
            },
        })
        : await prisma.user.create({
            data: {
                username,
                email,
                passwordHash,
                role: Role.ADMIN,
            },
        });

    output.write(`\nAdmin local pronto: ${admin.username} <${admin.email}> (#${admin.id})\n`);
}

main()
    .catch(async (error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });