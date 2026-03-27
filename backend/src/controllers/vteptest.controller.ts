import { Request, Response } from "express";
import { VtepTestRepository } from "../repositories/vteptest.repository";
import { VtepTestItemRepository } from "../repositories/vteptestItem.repository";
import { TestRepository } from "../repositories/test.repository";
import { TestItemRepository } from "../repositories/testItem.repository";
import { VtepSpeakingRepository } from "../repositories/vtepSpeaking.repository";
import { v4 as uuidv4 } from "uuid";

class VtepTestController {
  static async create(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { title, description, items, isActive, isPublic } = req.body;
      const createdByUserId = user?.id || null;
      const r = await VtepTestRepository.create({
        title,
        description,
        createdByUserId,
        isActive: !!isActive,
        isPublic: !!isPublic,
      });
      if (Array.isArray(items) && items.length) {
        // attach vtepTestId to each item
        const toCreate = items.map((it: any) => ({
          ...it,
          vtepTestId: r.id,
          createdByUserId,
        }));
        await VtepTestItemRepository.createItems(toCreate);
      }
      return res.json({ id: r.id });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "create failed" });
    }
  }

  static async listAll(req: Request, res: Response) {
    try {
      // Get both Listening/Reading tests and Speaking tests
      const listeningReadingTests = await VtepTestRepository.listAll();
      const speakingTests = await VtepSpeakingRepository.listTests();

      // Add skill field to distinguish test types
      const allTests = [
        ...listeningReadingTests.map((t) => ({
          ...t,
          skill: t.skill || "Listening/Reading",
        })),
        ...speakingTests.map((t) => ({ ...t, skill: "Speaking" })),
      ];

      // Sort by createdAt descending
      allTests.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      return res.json(allTests);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "list failed" });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const r = await VtepTestRepository.findById(id);
      if (!r) return res.status(404).json({ error: "not found" });
      return res.json(r);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "get failed" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const { title, description, isActive, isPublic } = req.body;
      await VtepTestRepository.update(id, {
        title: typeof title === "string" ? title : null,
        description: typeof description === "string" ? description : null,
        isActive: typeof isActive === "undefined" ? null : !!isActive,
        isPublic: typeof isPublic === "undefined" ? null : !!isPublic,
      });
      return res.json({ id });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "update failed" });
    }
  }

  static async listActive(req: Request, res: Response) {
    try {
      // Get both Listening/Reading tests and Speaking tests
      const listeningReadingTests = await VtepTestRepository.listActivePublic();
      const speakingTests = await VtepSpeakingRepository.listTests();

      // Filter speaking tests for active and public only
      const activeSpeakingTests = speakingTests.filter(
        (t) => t.isActive && t.isPublic
      );

      // Add skill field to distinguish test types
      const allTests = [
        ...listeningReadingTests.map((t) => ({
          ...t,
          skill: t.skill || "Listening/Reading",
        })),
        ...activeSpeakingTests.map((t) => ({ ...t, skill: "Speaking" })),
      ];

      // Sort by createdAt descending
      allTests.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      return res.json(allTests);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "list failed" });
    }
  }

  // Instantiate a VTEP test for the current user: create a Tests row and copy items into TestItems
  static async instantiate(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      // JWT may encode user id as `sub` (Auth) or `id` (other flows). Prefer `sub`.
      const userId = (req as any).user?.sub || (req as any).user?.id || null;
      const vtepTestId = req.params.id;
      const vtepTest = await VtepTestRepository.findById(vtepTestId);
      if (!vtepTest) return res.status(404).json({ error: "not found" });
      if (!vtepTest.isActive)
        return res.status(403).json({ error: "vteptest not active" });

      const items = await VtepTestItemRepository.listItemsForTest(vtepTestId);

      // create Test row for user
      const testId = uuidv4();
      const testData = { vtepTestId: vtepTestId, title: vtepTest.title };
      await TestRepository.create({
        id: testId,
        userId: userId,
        type: "vtep",
        skill: vtepTest.skill || null,
        data: JSON.stringify(testData),
      });

      // create TestItems for this test (student's attempt starts blank)
      for (const it of items) {
        await TestItemRepository.create({
          id: uuidv4(),
          testId,
          userId: userId,
          type: "vtep",
          kind: null,
          itemKey: it.id,
          isCorrect: null,
          score: null,
          data: JSON.stringify({
            prompt: it.prompt,
            options: it.optionsJson,
            answer: it.answerJson,
            sourceDocumentId: it.sourceDocumentId,
            part: it.part || null,
            skill: it.skill || null,
            mediaUrl: it.mediaUrl || null, // Include audio/media URL
          }),
        });
      }

      return res.json({ testId });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "instantiate failed" });
    }
  }

  static async listItems(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const items = await VtepTestItemRepository.listItemsForTest(id);
      return res.json({ items });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "list items failed" });
    }
  }

  static async addItems(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const { items } = req.body;
      if (!Array.isArray(items))
        return res.status(400).json({ error: "items required" });
      const toCreate = items.map((it: any) => ({
        ...it,
        vtepTestId: id,
        createdByUserId: (req as any).user?.id || null,
      }));
      await VtepTestItemRepository.createItems(toCreate);
      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "add items failed" });
    }
  }

  static async updateItem(req: Request, res: Response) {
    try {
      const itemId = req.params.itemId;
      const payload = req.body;

      console.debug("vteptest.updateItem called: itemId=", itemId);

      // Basic serialization checks to catch circular or invalid structures early
      try {
        if (typeof payload !== "undefined") JSON.stringify(payload);
        if (typeof payload?.optionsJson !== "undefined")
          JSON.stringify(payload.optionsJson);
        if (typeof payload?.answerJson !== "undefined")
          JSON.stringify(payload.answerJson);
      } catch (serErr) {
        console.error("vteptest.updateItem - payload not serializable", serErr);
        return res.status(400).json({
          error: "payload not serializable",
          message: (serErr as any)?.message,
        });
      }

      console.debug("vteptest.updateItem payload=", JSON.stringify(payload));

      await VtepTestItemRepository.updateItem(itemId, payload);
      return res.json({ id: itemId });
    } catch (err) {
      console.error(err);
      const msg = (err as any)?.message || "update item failed";
      return res
        .status(500)
        .json({ error: "update item failed", message: msg });
    }
  }

  static async deleteItem(req: Request, res: Response) {
    try {
      const itemId = req.params.itemId;
      await VtepTestItemRepository.deleteItem(itemId);
      return res.json({ id: itemId });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "delete item failed" });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const id = req.params.id;
      await VtepTestRepository.delete(id);
      return res.json({ id });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "delete failed" });
    }
  }
}

export default VtepTestController;
