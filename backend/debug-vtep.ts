import { getPool } from "./src/db";

async function debugVtepDocument() {
  try {
    const pool = await getPool();
    const documentId = "A397D61D-022A-4901-8237-161B476B5AB9";

    console.log("\n🔍 Debugging VTEP Document:", documentId);
    console.log("=".repeat(50));

    // Check if document exists
    const docResult = await pool.request().input("DocumentId", documentId)
      .query(`
        SELECT Id, Title, Description, FileName, TocJson, CreatedAt, CreatedByUserId
        FROM dbo.VtepDocuments 
        WHERE Id = @DocumentId
      `);

    if (docResult.recordset.length === 0) {
      console.log("❌ Document not found in database");
      return;
    }

    const doc = docResult.recordset[0];
    console.log("\n📄 Document found:");
    console.log("Title:", doc.Title);
    console.log("Description:", doc.Description);
    console.log("FileName:", doc.FileName);
    console.log("CreatedAt:", doc.CreatedAt);
    console.log("CreatedByUserId:", doc.CreatedByUserId);

    // Parse TocJson if available
    if (doc.TocJson) {
      try {
        const toc = JSON.parse(doc.TocJson);
        console.log("\n📋 Table of Contents:");
        console.log("Skills found:", Object.keys(toc));
        if (toc.Writing) {
          console.log(
            "Writing skill config:",
            JSON.stringify(toc.Writing, null, 2),
          );
        }
      } catch (e) {
        console.log("❌ Failed to parse TocJson:", e);
      }
    } else {
      console.log("\n📋 No TocJson found");
    }

    // Check all items for this document
    const itemsResult = await pool.request().input("DocumentId", documentId)
      .query(`
        SELECT Id, SectionKey, Skill, Part, Prompt, MediaUrl, CreatedAt, CreatedByUserId
        FROM dbo.VtepItems 
        WHERE DocumentId = @DocumentId
        ORDER BY CreatedAt ASC
      `);

    console.log(`\n📝 Items found: ${itemsResult.recordset.length}`);

    if (itemsResult.recordset.length > 0) {
      console.log("\n Items breakdown by skill:");
      const bySkill = itemsResult.recordset.reduce(
        (acc: Record<string, number>, item: any) => {
          acc[item.Skill] = (acc[item.Skill] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
      Object.entries(bySkill).forEach(([skill, count]) => {
        console.log(`  ${skill}: ${count} items`);
      });

      // Show first few items
      console.log("\n🔸 First 5 items:");
      itemsResult.recordset.slice(0, 5).forEach((item: any, idx: number) => {
        console.log(
          `  ${idx + 1}. Skill: ${item.Skill}, Part: ${item.Part}, SectionKey: ${item.SectionKey}`,
        );
        console.log(
          `     Prompt preview: ${(item.Prompt || "").substring(0, 100)}...`,
        );
      });
    }

    // Check if there are any Writing items specifically
    const writingItemsResult = await pool
      .request()
      .input("DocumentId", documentId).query(`
        SELECT COUNT(*) as Count
        FROM dbo.VtepItems 
        WHERE DocumentId = @DocumentId AND Skill = 'Writing'
      `);

    const writingCount = writingItemsResult.recordset[0].Count;
    console.log(`\n✍️  Writing items specifically: ${writingCount}`);

    // General database stats
    const statsResult = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM dbo.VtepDocuments) as TotalDocuments,
        (SELECT COUNT(*) FROM dbo.VtepItems) as TotalItems,
        (SELECT COUNT(DISTINCT DocumentId) FROM dbo.VtepItems) as DocumentsWithItems
    `);

    const stats = statsResult.recordset[0];
    console.log("\n📊 Database Overview:");
    console.log(`Total documents: ${stats.TotalDocuments}`);
    console.log(`Total items: ${stats.TotalItems}`);
    console.log(`Documents with items: ${stats.DocumentsWithItems}`);
  } catch (error) {
    console.error("❌ Debug error:", error);
  }

  process.exit(0);
}

debugVtepDocument();
