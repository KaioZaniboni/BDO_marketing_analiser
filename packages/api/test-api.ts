import { prisma } from "@bdo/db";

async function run() {
    try {
        const recipe = await prisma.recipe.findUnique({
            where: { id: 242 }, // Cerveja
            include: {
                procItem: true,
                resultItem: true,
            }
        });
        console.log("Recipe:", recipe);
    } catch (err) {
        console.error("Prisma error:", err);
    }
}
run();
