import { db } from "./src/db/index.ts";
import { stages, projects } from "./src/db/schema.ts";
import { eq, and, sql } from "drizzle-orm";

async function fixStuckProjects() {
    console.log("Starting DB fix for stuck projects...");

    // Find all projects
    const allProjects = await db.query.projects.findMany({
        with: {
            stages: {
                orderBy: (stages, { asc }) => [asc(stages.order)],
            }
        }
    });

    let fixedCount = 0;

    for (const project of allProjects) {
        if (!project.stages || project.stages.length === 0) continue;

        // Check if project is broken: 
        // Either all stages are draft, OR stage 1 is active but has NO pjId and a later stage HAS pjId
        const allDraft = project.stages.every(s => s.status === 'draft');
        const brokenFirstStage = project.stages[0].status === 'active' &&
            !project.stages[0].pjId &&
            project.stages.some((s, idx) => idx > 0 && s.pjId);

        if (!allDraft && !brokenFirstStage) continue;

        // All stages are draft! This means it was affected by the Zod stripping bug.
        // We need to find the first stage that has a pjId -- that was likely the startFromStage!
        // Or if none have pjId (maybe they didn't assign one), then just the first stage.

        let targetIndex = 0;
        for (let i = 0; i < project.stages.length; i++) {
            if (project.stages[i].pjId) {
                targetIndex = i;
                break;
            }
        }

        console.log(`Fixing project ${project.id}: Target active stage is index ${targetIndex} (${project.stages[targetIndex].label})`);

        // Any stage before targetIndex should be 'done' and 100% progress
        for (let i = 0; i < targetIndex; i++) {
            await db.update(stages)
                .set({ status: 'done', progress: 100 })
                .where(eq(stages.id, project.stages[i].id));
        }

        // Target index stage should be 'active'
        await db.update(stages)
            .set({ status: 'active' })
            .where(eq(stages.id, project.stages[targetIndex].id));

        fixedCount++;
    }

    console.log(`Done! Fixed ${fixedCount} projects.`);
    process.exit(0);
}

fixStuckProjects().catch(console.error);
